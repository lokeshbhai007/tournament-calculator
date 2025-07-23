// src/app/api/ranger/slotlist/route.js

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants for better maintainability
const MODELS = {
  GPT4O: "gpt-4o"
};

const MAX_TOKENS = {
  TEAM_EXTRACTION: 1500,
  SLOT_EXTRACTION: 3000
};

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  MISSING_FILES: 'At least one image is required (slotlist or screenshots)',
  NO_DATA_EXTRACTED: 'No team or player data found in the images',
  GENERATION_FAILED: 'Failed to generate slotlist CSV'
};

export async function POST(request) {
  try {
    // 1. Authentication check
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED }, 
        { status: 401 }
      );
    }

    // 2. Parse and validate form data
    const { slotlistPoster, slotScreenshots } = await parseFormData(request);
    
    // At least one image is required
    if (!slotlistPoster && slotScreenshots.length === 0) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.MISSING_FILES },
        { status: 400 }
      );
    }

    // 3. Convert files to base64
    const allImages = [];
    
    if (slotlistPoster) {
      const posterBase64 = await fileToBase64(slotlistPoster);
      allImages.push({ type: 'poster', data: posterBase64 });
    }
    
    if (slotScreenshots.length > 0) {
      const screenshotsBase64 = await Promise.all(
        slotScreenshots.map(file => fileToBase64(file))
      );
      screenshotsBase64.forEach((data, index) => {
        allImages.push({ type: 'screenshot', data, index });
      });
    }

    // 4. Extract data from all images
    const extractedData = await extractDataFromImages(allImages);
    
    if (!extractedData.teams.length && !extractedData.players.length) {
      return NextResponse.json(
        { 
          error: ERROR_MESSAGES.NO_DATA_EXTRACTED,
          suggestion: 'Please ensure the images clearly show team names and player information'
        },
        { status: 400 }
      );
    }

    // 5. Generate CSV data
    const csvResult = generateCSVData(extractedData);

    // 6. Return successful response
    return NextResponse.json({
      success: true,
      csvData: csvResult.csvString,
      teamNames: extractedData.teams,
      slotsExtracted: extractedData.slots.length,
      playerCount: csvResult.totalPlayers,
      extractedData: extractedData,
      statistics: {
        teamsFound: extractedData.teams.length,
        slotsProcessed: extractedData.slots.length,
        playersExtracted: csvResult.totalPlayers,
        imagesProcessed: allImages.length
      },
      message: `Slotlist CSV generated successfully! Processed ${extractedData.teams.length} teams with ${csvResult.totalPlayers} players.`
    });

  } catch (error) {
    console.error('Error in slotlist generation:', error);
    return NextResponse.json(
      { 
        error: ERROR_MESSAGES.GENERATION_FAILED,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Helper function to parse form data
async function parseFormData(request) {
  const formData = await request.formData();
  return {
    slotlistPoster: formData.get('slotlistPoster'),
    slotScreenshots: formData.getAll('slotScreenshots')
  };
}

// Helper function to extract data from all images
async function extractDataFromImages(images) {
  const extractedData = {
    teams: [],
    players: [],
    slots: []
  };

  for (const image of images) {
    try {
      const response = await openai.chat.completions.create({
        model: MODELS.GPT4O,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: getUnifiedExtractionPrompt()
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${image.data}`
                }
              }
            ]
          }
        ],
        max_tokens: MAX_TOKENS.SLOT_EXTRACTION
      });

      const extractionText = response.choices[0].message.content;
      console.log(`Extraction response for ${image.type}:`, extractionText);
      
      // Parse the JSON response
      // Multiple approaches to extract and validate JSON from response
      let parsedData = null;
      
      // Method 1: Try to find JSON in code blocks
      const codeBlockMatch = extractionText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (codeBlockMatch) {
        try {
          parsedData = JSON.parse(codeBlockMatch[1].trim());
        } catch (e) {
          console.log('Code block JSON parsing failed:', e.message);
        }
      }
      
      // Method 2: Try to find raw JSON object
      if (!parsedData) {
        const jsonMatch = extractionText.match(/(\{[\s\S]*\})/);
        if (jsonMatch) {
          try {
            // Clean up common JSON issues
            let jsonStr = jsonMatch[1].trim();
            
            // Fix common issues
            jsonStr = jsonStr.replace(/,\s*}/g, '}'); // Remove trailing commas before }
            jsonStr = jsonStr.replace(/,\s*]/g, ']'); // Remove trailing commas before ]
            jsonStr = jsonStr.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Add quotes to unquoted keys
            
            parsedData = JSON.parse(jsonStr);
          } catch (e) {
            console.log('Raw JSON parsing failed:', e.message);
          }
        }
      }
      
      // Method 3: Try to clean and parse the entire response
      if (!parsedData) {
        try {
          let cleaned = extractionText.replace(/```json|```|`/g, '').trim();
          
          // Additional cleaning
          cleaned = cleaned.replace(/,\s*}/g, '}');
          cleaned = cleaned.replace(/,\s*]/g, ']');
          cleaned = cleaned.replace(/([{,]\s*)(\w+):/g, '$1"$2":');
          
          parsedData = JSON.parse(cleaned);
        } catch (e) {
          console.log('Cleaned JSON parsing failed:', e.message);
        }
      }
      
      // Method 4: Try to extract just the structure we need
      if (!parsedData) {
        try {
          parsedData = {
            teams: [],
            slots: [],
            players: []
          };
          
          // Extract teams array
          const teamsMatch = extractionText.match(/"teams"\s*:\s*\[(.*?)\]/s);
          if (teamsMatch) {
            const teamsStr = '[' + teamsMatch[1] + ']';
            parsedData.teams = JSON.parse(teamsStr);
          }
          
          console.log('Fallback extraction attempted');
        } catch (e) {
          console.log('Fallback extraction failed:', e.message);
        }
      }
      
      // Validate the parsed data structure
      if (parsedData && typeof parsedData === 'object') {
        // Ensure required arrays exist
        if (!Array.isArray(parsedData.teams)) parsedData.teams = [];
        if (!Array.isArray(parsedData.slots)) parsedData.slots = [];
        if (!Array.isArray(parsedData.players)) parsedData.players = [];
        
        try {
          
          // Merge teams (avoid duplicates)
          if (parsedData.teams && Array.isArray(parsedData.teams)) {
            parsedData.teams.forEach(team => {
              if (team && !extractedData.teams.includes(team)) {
                extractedData.teams.push(team);
              }
            });
          }
          
          // Merge slots/players
          if (parsedData.slots && Array.isArray(parsedData.slots)) {
            extractedData.slots.push(...parsedData.slots);
          }
          
          // Merge individual players if present
          if (parsedData.players && Array.isArray(parsedData.players)) {
            extractedData.players.push(...parsedData.players);
          }
        } catch (processingError) {
          console.error('Error processing parsed data:', processingError);
        }
      } else {
        console.warn('No valid JSON found in extraction response');
      }
      
    } catch (error) {
      console.error(`Error processing ${image.type}:`, error);
      // Continue with other images
    }
  }

  // Post-process and clean data
  extractedData.teams = [...new Set(extractedData.teams.filter(t => t && t.trim()))];
  extractedData.slots = removeDuplicateSlots(extractedData.slots || []);
  extractedData.players = extractedData.players || [];
  
  return extractedData;
}

// Helper function to generate CSV data
function generateCSVData(extractedData) {
  const csvData = [];
  csvData.push(['Team', 'Slot', 'Player', 'Role']); // Header

  const { teams, slots, players } = extractedData;
  
  if (slots.length > 0) {
    // Process slot-based data
    slots.forEach(slotData => {
      const teamIndex = Math.floor((slotData.slot - 1) / Math.ceil(slots.length / Math.max(teams.length, 1)));
      const teamName = teams[teamIndex] || slotData.team || `Team ${teamIndex + 1}`;
      
      if (slotData.players && slotData.players.length > 0) {
        slotData.players.forEach(playerName => {
          if (playerName && playerName.trim()) {
            csvData.push([
              teamName,
              slotData.slot ? slotData.slot.toString() : '',
              playerName.trim(),
              slotData.role || 'Player'
            ]);
          }
        });
      } else {
        // Empty slot
        csvData.push([
          teamName,
          slotData.slot ? slotData.slot.toString() : '',
          '',
          'Player'
        ]);
      }
    });
  } else if (players.length > 0) {
    // Process individual player data
    players.forEach((player, index) => {
      const teamIndex = Math.floor(index / Math.ceil(players.length / Math.max(teams.length, 1)));
      const teamName = teams[teamIndex] || player.team || `Team ${teamIndex + 1}`;
      
      csvData.push([
        teamName,
        player.slot ? player.slot.toString() : (index + 1).toString(),
        player.name || player,
        player.role || 'Player'
      ]);
    });
  } else if (teams.length > 0) {
    // Only teams found, create placeholder entries
    teams.forEach((team, index) => {
      csvData.push([
        team,
        (index + 1).toString(),
        '',
        'Player'
      ]);
    });
  }

  // Convert to CSV string with proper escaping
  const csvString = csvData.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  return {
    csvString,
    totalPlayers: csvData.length - 1 // Subtract header row
  };
}

// Helper function to remove duplicate slots
function removeDuplicateSlots(slots) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return [];
  }
  
  const slotMap = new Map();
  
  slots.forEach(slot => {
    if (!slot || typeof slot !== 'object') return;
    
    const key = slot.slot || `${slot.team || 'unknown'}-${(slot.players && slot.players[0]) || 'empty'}`;
    
    if (!slotMap.has(key)) {
      slotMap.set(key, {
        ...slot,
        players: slot.players || []
      });
    } else {
      // Merge duplicate slots
      const existing = slotMap.get(key);
      const allPlayers = [...(existing.players || []), ...(slot.players || [])];
      const uniquePlayers = [...new Set(allPlayers.filter(p => p && typeof p === 'string' && p.trim()))];
      
      slotMap.set(key, { 
        ...existing, 
        players: uniquePlayers,
        team: existing.team || slot.team
      });
    }
  });
  
  return Array.from(slotMap.values());
}

// Unified extraction prompt that handles multiple image types
function getUnifiedExtractionPrompt() {
  return `You are analyzing esports tournament images that may contain team lists, player rosters, or tournament brackets.

ANALYZE THE IMAGE FOR:
1. **Team Names**: Look for any team/organization names (may include prefixes like "TEAM", clan tags, etc.)
2. **Slot Numbers**: Look for numbered slots, positions, or rankings
3. **Player Names**: Look for individual player/username entries
4. **Tournament Structure**: Understand how teams and players are organized

POSSIBLE IMAGE TYPES:
- **Slot Lists**: Organized grid showing team names with slot numbers (like "03 TEAM TSM ENT")
- **Player Rosters**: Lists of individual players, possibly grouped by teams
- **Tournament Brackets**: Match results or tournament progression
- **Mixed Formats**: Combination of the above

EXTRACTION RULES:
1. Extract ALL visible team names exactly as written
2. Extract ALL player names/usernames exactly as written
3. Preserve numbers, special characters, and capitalization
4. If slots are numbered, maintain the slot-to-team/player relationship
5. Group players under their respective teams when possible

OUTPUT FORMAT:
Return a JSON object with this structure:
\`\`\`json
{
  "teams": ["Team Name 1", "TEAM TSM ENT", "Team LeZzer esports"],
  "slots": [
    {
      "slot": 3,
      "team": "TEAM TSM ENT",
      "players": ["PlayerName1", "PlayerName2"]
    },
    {
      "slot": 4,
      "team": "TEAM TX4G",
      "players": ["PlayerA", "PlayerB", "PlayerC", PlayerC]
    }
  ],
  "players": [
    {
      "name": "PlayerName1",
      "team": "TEAM TSM ENT",
      "slot": 3
    }
  ]
}
\`\`\`

IMPORTANT:
- Return ONLY valid JSON wrapped in \`\`\`json code blocks
- Include all data you can extract, even if some fields are missing
- If you can't determine team associations, include players in the "players" array
- Preserve exact spelling and formatting
- If slot numbers aren't visible, you can omit the "slot" field`;
}

// Helper function to convert file to base64
async function fileToBase64(file) {
  try {
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Error converting file to base64:', error);
    throw new Error('Failed to process uploaded file');
  }
}