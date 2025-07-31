// src/app/api/ranger/slotlist/route.js

import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Simplified constants
const MODEL = "gpt-4o";
const MAX_TOKENS = 3000;
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export async function POST(request) {
  try {
    // Parse request data
    const contentType = request.headers.get('content-type') || '';
    const isCloudinaryRequest = contentType.includes('application/json');
    
    let slotlistImageUrl = null;
    let screenshotUrls = [];
    
    if (isCloudinaryRequest) {
      // Handle pre-uploaded Cloudinary URLs
      const body = await request.json();
      slotlistImageUrl = body.slotlistPosterUrl;
      screenshotUrls = body.slotScreenshotUrls || [];
    } else {
      // Handle form data with file uploads
      const formData = await request.formData();
      const slotlistPoster = formData.get('slotlistPoster');
      const slotScreenshots = formData.getAll('slotScreenshots');
      
      // Validate file sizes
      if (slotlistPoster && slotlistPoster.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Slotlist poster too large: ${(slotlistPoster.size / 1024 / 1024).toFixed(2)}MB (max 20MB)` },
          { status: 400 }
        );
      }
      
      for (let i = 0; i < slotScreenshots.length; i++) {
        if (slotScreenshots[i].size > MAX_FILE_SIZE) {
          return NextResponse.json(
            { error: `Screenshot ${i + 1} too large: ${(slotScreenshots[i].size / 1024 / 1024).toFixed(2)}MB (max 20MB)` },
            { status: 400 }
          );
        }
      }
      
      // Convert files to base64 for processing
      if (slotlistPoster) {
        slotlistImageUrl = await fileToBase64(slotlistPoster);
      }
      
      screenshotUrls = await Promise.all(
        slotScreenshots.map(async (file) => await fileToBase64(file))
      );
    }
    
    if (!slotlistImageUrl && screenshotUrls.length === 0) {
      return NextResponse.json(
        { error: 'At least one image is required' },
        { status: 400 }
      );
    }

    // Process slotlist and screenshots concurrently for faster processing
    const [slotlistData, playersData] = await Promise.all([
      slotlistImageUrl ? extractSlotlistData(slotlistImageUrl, isCloudinaryRequest) : Promise.resolve({ teams: [] }),
      screenshotUrls.length > 0 ? processScreenshots(screenshotUrls, isCloudinaryRequest) : Promise.resolve([])
    ]);

    // Merge data
    const finalData = mergeData(slotlistData, playersData);
    
    if (finalData.teams.length === 0) {
      return NextResponse.json(
        { error: 'No team data found in images' },
        { status: 400 }
      );
    }

    const playerCount = finalData.teams.reduce((count, team) => count + team.players.length, 0);

    return NextResponse.json({
      success: true,
      extractedData: finalData,
      teamNames: finalData.teams.map(t => t.name),
      playerCount: playerCount,
      statistics: {
        teamsFound: finalData.teams.length,
        playersExtracted: playerCount,
      },
      message: `Found ${finalData.teams.length} teams with ${playerCount} players.`
    });

  } catch (error) {
    console.error('Processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed', details: error.message },
      { status: 500 }
    );
  }
}

// Process multiple screenshots concurrently
async function processScreenshots(screenshotUrls, isCloudinaryRequest) {
  const playerPromises = screenshotUrls.map(async (url) => {
    try {
      return await extractPlayerData(url, isCloudinaryRequest);
    } catch (error) {
      console.error('Screenshot processing error:', error);
      return [];
    }
  });
  
  const results = await Promise.all(playerPromises);
  return results.flat();
}

// Extract slotlist data
async function extractSlotlistData(imageData, isUrl = false) {
  try {
    const imageUrl = isUrl ? imageData : `data:image/jpeg;base64,${imageData}`;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: `Extract team names and slot numbers from this slotlist image. 
Return ONLY valid JSON in this exact format:
{
  "teams": [
    {"slot": 3, "name": "TEAM TSM ENT"},
    {"slot": 4, "name": "TEAM TX4G"}
  ]
}

IMPORTANT: 
- slot must be a number
- name must be a string
- Return only the JSON, no other text`
        }, {
          type: "image_url",
          image_url: { url: imageUrl }
        }]
      }],
      max_tokens: MAX_TOKENS
    });

    const result = parseJSON(response.choices[0].message.content);
    
    // Validate and clean the result
    if (result && result.teams && Array.isArray(result.teams)) {
      const cleanedTeams = result.teams
        .filter(team => team && team.slot && team.name)
        .map(team => ({
          slot: Number(team.slot),
          name: String(team.name).trim()
        }))
        .filter(team => !isNaN(team.slot) && team.name.length > 0);
      
      return { teams: cleanedTeams };
    }
    
    return { teams: [] };
    
  } catch (error) {
    console.error('Slotlist extraction error:', error);
    return { teams: [] };
  }
}

// Extract player data
async function extractPlayerData(imageData, isUrl = false) {
  try {
    const imageUrl = isUrl ? imageData : `data:image/jpeg;base64,${imageData}`;
    
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{
        role: "user",
        content: [{
          type: "text",
          text: `Extract player names and team associations from this screenshot.
Return ONLY valid JSON in this exact format:
{
  "players": [
    {"name": "PlayerName", "team": "TeamName", "slot": 3},
    {"name": "PlayerName2", "team": "TeamName2", "slot": 4}
  ]
}

IMPORTANT:
- name must be a string
- team can be string or null
- slot can be number or null
- Return only the JSON, no other text`
        }, {
          type: "image_url",
          image_url: { url: imageUrl }
        }]
      }],
      max_tokens: MAX_TOKENS
    });

    const result = parseJSON(response.choices[0].message.content);
    
    // Validate and clean the result
    if (result && result.players && Array.isArray(result.players)) {
      const cleanedPlayers = result.players
        .filter(player => player && player.name)
        .map(player => ({
          name: String(player.name).trim(),
          team: player.team ? String(player.team).trim() : null,
          slot: player.slot ? Number(player.slot) : null,
          role: player.role || 'Player'
        }))
        .filter(player => player.name.length > 0);
      
      return cleanedPlayers;
    }
    
    return [];
    
  } catch (error) {
    console.error('Player extraction error:', error);
    return [];
  }
}

// Merge slotlist and player data
function mergeData(slotlistData, playersData) {
  const teamsMap = new Map();
  
  // Initialize teams from slotlist
  slotlistData.teams?.forEach(team => {
    if (team && team.slot && team.name) {
      teamsMap.set(team.slot, {
        slot: team.slot,
        name: String(team.name),
        players: []
      });
    }
  });
  
  // Add players to teams
  playersData.forEach(player => {
    // Validate player data
    if (!player || !player.name) return;
    
    let targetTeam = null;
    
    // Match by slot number
    if (player.slot && teamsMap.has(player.slot)) {
      targetTeam = teamsMap.get(player.slot);
    }
    // Match by team name (with proper string validation)
    else if (player.team && typeof player.team === 'string' && player.team.trim()) {
      const playerTeamLower = player.team.toLowerCase();
      
      for (let [slot, team] of teamsMap) {
        const teamNameLower = team.name.toLowerCase();
        
        if (teamNameLower.includes(playerTeamLower) || 
            playerTeamLower.includes(teamNameLower)) {
          targetTeam = team;
          break;
        }
      }
    }
    
    // Add player to team (max 4 players)
    if (targetTeam && targetTeam.players.length < 4) {
      targetTeam.players.push({
        name: String(player.name),
        role: player.role || 'Player'
      });
    } else if (!targetTeam && player.name) {
      // Log unmatched players for debugging
      console.log(`Unmatched player: ${player.name}, team: ${player.team}, slot: ${player.slot}`);
    }
  });
  
  const finalTeams = Array.from(teamsMap.values());
  
  return {
    teams: finalTeams,
    totalPlayers: finalTeams.reduce((count, team) => count + team.players.length, 0)
  };
}

// Parse JSON from OpenAI response
function parseJSON(text) {
  try {
    // Try code block first
    const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlock) {
      return JSON.parse(codeBlock[1].trim());
    }
    
    // Try raw JSON
    const jsonMatch = text.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      let jsonStr = jsonMatch[1].trim()
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']');
      return JSON.parse(jsonStr);
    }
    
    return null;
  } catch (error) {
    console.error('JSON parsing error:', error);
    return null;
  }
}

// Convert file to base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString('base64');
}