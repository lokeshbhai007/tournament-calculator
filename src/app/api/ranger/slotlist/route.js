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
  SLOT_EXTRACTION: 2000,
  PLAYER_EXTRACTION: 3000
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

    // 3. Process slot list first to get team structure
    let slotlistData = { teams: [], slots: [] };
    if (slotlistPoster) {
      const posterBase64 = await fileToBase64(slotlistPoster);
      slotlistData = await extractSlotlistData(posterBase64);
    }

    // 4. Process player screenshots and match with teams
    let playersData = [];
    if (slotScreenshots.length > 0) {
      const screenshotsBase64 = await Promise.all(
        slotScreenshots.map(file => fileToBase64(file))
      );
      
      for (const screenshotBase64 of screenshotsBase64) {
        const playerData = await extractPlayerData(screenshotBase64, slotlistData.teams);
        playersData.push(...playerData);
      }
    }

    // 5. Merge and organize the data
    const finalData = mergeSlotlistAndPlayerData(slotlistData, playersData);
    
    if (finalData.teams.length === 0) {
      return NextResponse.json(
        { 
          error: ERROR_MESSAGES.NO_DATA_EXTRACTED,
          suggestion: 'Please ensure the slotlist image clearly shows team names and slot numbers'
        },
        { status: 400 }
      );
    }

    // 6. Generate CSV data
    const csvResult = generateCSVData(finalData);

    // 7. Return successful response
    return NextResponse.json({
      success: true,
      csvData: csvResult.csvString,
      teamNames: finalData.teams.map(t => t.name),
      slotsExtracted: finalData.teams.length,
      playerCount: csvResult.totalPlayers,
      extractedData: finalData,
      statistics: {
        teamsFound: finalData.teams.length,
        slotsProcessed: finalData.teams.length,
        playersExtracted: csvResult.totalPlayers,
        teamsWithoutPlayers: csvResult.teamsWithoutPlayers || 0,
        imagesProcessed: (slotlistPoster ? 1 : 0) + slotScreenshots.length
      },
      warnings: csvResult.teamsWithoutPlayers > 0 ? 
        [`${csvResult.teamsWithoutPlayers} team(s) found in slotlist but no players detected from screenshots`] : [],
      message: `Slotlist CSV generated successfully! Processed ${finalData.teams.length} teams with ${csvResult.totalPlayers} players.${csvResult.teamsWithoutPlayers > 0 ? ` Note: ${csvResult.teamsWithoutPlayers} teams have no detected players.` : ''}`
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

// Extract slot list data (team names and slot numbers)
async function extractSlotlistData(imageBase64) {
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getSlotlistExtractionPrompt()
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: MAX_TOKENS.SLOT_EXTRACTION
    });

    const extractionText = response.choices[0].message.content;
    console.log('Slotlist extraction response:', extractionText);
    
    const parsedData = parseJSONResponse(extractionText);
    
    if (parsedData && parsedData.teams) {
      return {
        teams: parsedData.teams || [],
        slots: parsedData.slots || []
      };
    }
    
    return { teams: [], slots: [] };
    
  } catch (error) {
    console.error('Error extracting slotlist data:', error);
    return { teams: [], slots: [] };
  }
}

// Extract player data from screenshots
async function extractPlayerData(imageBase64, knownTeams = []) {
  try {
    const response = await openai.chat.completions.create({
      model: MODELS.GPT4O,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: getPlayerExtractionPrompt(knownTeams)
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: MAX_TOKENS.PLAYER_EXTRACTION
    });

    const extractionText = response.choices[0].message.content;
    console.log('Player extraction response:', extractionText);
    
    const parsedData = parseJSONResponse(extractionText);
    
    if (parsedData && parsedData.players) {
      return parsedData.players || [];
    }
    
    return [];
    
  } catch (error) {
    console.error('Error extracting player data:', error);
    return [];
  }
}

// Merge slotlist data with player data
function mergeSlotlistAndPlayerData(slotlistData, playersData) {
  const teamsMap = new Map();
  
  // Initialize teams from slotlist
  slotlistData.teams.forEach(team => {
    teamsMap.set(team.slot, {
      slot: team.slot,
      name: team.name,
      players: [],
      hasPlayers: false
    });
  });
  
  // Add players to their respective teams
  playersData.forEach(player => {
    let targetTeam = null;
    
    // Try to match by slot number first
    if (player.slot && teamsMap.has(player.slot)) {
      targetTeam = teamsMap.get(player.slot);
    }
    // Try to match by team name (exact match)
    else if (player.team) {
      for (let [slot, team] of teamsMap) {
        if (team.name.toLowerCase().includes(player.team.toLowerCase()) || 
            player.team.toLowerCase().includes(team.name.toLowerCase())) {
          targetTeam = team;
          break;
        }
      }
    }
    
    // Enhanced fuzzy matching for team names
    if (!targetTeam && player.team) {
      for (let [slot, team] of teamsMap) {
        // Remove common prefixes and suffixes for better matching
        const cleanTeamName = team.name.toLowerCase()
          .replace(/^(team\s+|clan\s+)/i, '')
          .replace(/(\s+esports?|\s+gaming|\s+ent)$/i, '');
        const cleanPlayerTeam = player.team.toLowerCase()
          .replace(/^(team\s+|clan\s+)/i, '')
          .replace(/(\s+esports?|\s+gaming|\s+ent)$/i, '');
        
        // Check for partial matches
        if (cleanTeamName.includes(cleanPlayerTeam) || 
            cleanPlayerTeam.includes(cleanTeamName) ||
            calculateSimilarity(cleanTeamName, cleanPlayerTeam) > 0.6) {
          targetTeam = team;
          break;
        }
      }
    }
    
    // Fallback: try to match by any word similarity
    if (!targetTeam && player.team) {
      for (let [slot, team] of teamsMap) {
        const teamWords = team.name.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        const playerTeamWords = player.team.toLowerCase().split(/\s+/).filter(w => w.length > 2);
        
        const commonWords = teamWords.filter(word => 
          playerTeamWords.some(pWord => 
            pWord.includes(word) || word.includes(pWord) ||
            calculateSimilarity(word, pWord) > 0.7
          )
        );
        
        if (commonWords.length > 0) {
          targetTeam = team;
          break;
        }
      }
    }
    
    // Add player to team if found, ensure max 4 players per team
    if (targetTeam && targetTeam.players.length < 4) {
      targetTeam.players.push({
        name: player.name,
        role: player.role || 'Player'
      });
      targetTeam.hasPlayers = true;
    } else if (!targetTeam) {
      // If no team match found, log for debugging
      console.warn(`No team match found for player: ${player.name} (team: ${player.team}, slot: ${player.slot})`);
    }
  });
  
  // Ensure all teams from slotlist are included, even if no players found
  const finalTeams = Array.from(teamsMap.values());
  const actualPlayerCount = finalTeams.reduce((count, team) => count + team.players.length, 0);
  
  return {
    teams: finalTeams,
    totalPlayers: actualPlayerCount,
    teamsWithoutPlayers: finalTeams.filter(team => !team.hasPlayers).length
  };
}

// Helper function to calculate string similarity
function calculateSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const distance = levenshteinDistance(longer, shorter);
  return (longer.length - distance) / longer.length;
}

// Helper function to calculate Levenshtein distance
function levenshteinDistance(str1, str2) {
  const matrix = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  
  return matrix[str2.length][str1.length];
}

// Generate CSV data from merged team data
function generateCSVData(data) {
  const csvData = [];
  csvData.push(['Team', 'Slot', 'Player', 'Role']); // Header

  let totalPlayers = 0;
  
  data.teams.forEach(team => {
    if (team.players.length > 0) {
      // Team has players - add each player
      team.players.forEach(player => {
        csvData.push([
          team.name,
          team.slot.toString(),
          player.name,
          player.role
        ]);
        totalPlayers++;
      });
    } else {
      // Team has no players - add empty entry to maintain team in CSV
      csvData.push([
        team.name,
        team.slot.toString(),
        '',
        'Player'
      ]);
    }
  });

  // Convert to CSV string with proper escaping
  const csvString = csvData.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  return {
    csvString,
    totalPlayers,
    teamsWithoutPlayers: data.teamsWithoutPlayers || 0
  };
}

// Parse JSON response with multiple fallback methods
function parseJSONResponse(responseText) {
  // Method 1: Try to find JSON in code blocks
  const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1].trim());
    } catch (e) {
      console.log('Code block JSON parsing failed:', e.message);
    }
  }
  
  // Method 2: Try to find raw JSON object
  const jsonMatch = responseText.match(/(\{[\s\S]*\})/);
  if (jsonMatch) {
    try {
      let jsonStr = jsonMatch[1].trim();
      
      // Fix common issues
      jsonStr = jsonStr.replace(/,\s*}/g, '}'); // Remove trailing commas before }
      jsonStr = jsonStr.replace(/,\s*]/g, ']'); // Remove trailing commas before ]
      jsonStr = jsonStr.replace(/([{,]\s*)(\w+):/g, '$1"$2":'); // Add quotes to unquoted keys
      
      return JSON.parse(jsonStr);
    } catch (e) {
      console.log('Raw JSON parsing failed:', e.message);
    }
  }
  
  // Method 3: Try to clean and parse the entire response
  try {
    let cleaned = responseText.replace(/```json|```|`/g, '').trim();
    
    // Additional cleaning
    cleaned = cleaned.replace(/,\s*}/g, '}');
    cleaned = cleaned.replace(/,\s*]/g, ']');
    cleaned = cleaned.replace(/([{,]\s*)(\w+):/g, '$1"$2":');
    
    return JSON.parse(cleaned);
  } catch (e) {
    console.log('Cleaned JSON parsing failed:', e.message);
  }
  
  return null;
}

// Prompt for extracting slotlist data
function getSlotlistExtractionPrompt() {
  return `You are analyzing an esports tournament slot list image. This image shows team names with their corresponding slot numbers.

ANALYZE THE IMAGE FOR:
1. **Slot Numbers**: Look for numbered slots (like 03, 04, 05, etc.)
2. **Team Names**: Look for team names associated with each slot number
3. **Tournament Structure**: Understand the slot-to-team mapping

EXTRACTION RULES:
1. Extract ALL visible slot numbers and their corresponding team names
2. Preserve team names exactly as written (including prefixes like "TEAM", clan tags, etc.)
3. Maintain the slot number to team name relationship
4. If a slot appears empty or has no team name, include it with empty team name

OUTPUT FORMAT:
Return a JSON object with this structure:
\`\`\`json
{
  "teams": [
    {
      "slot": 3,
      "name": "TEAM TSM ENT"
    },
    {
      "slot": 4,
      "name": "TEAM TX4G"
    },
    {
      "slot": 15,
      "name": "Team LeZzer esports"
    }
  ],
  "slots": [
    {
      "number": 3,
      "team": "TEAM TSM ENT"
    }
  ]
}
\`\`\`

IMPORTANT:
- Return ONLY valid JSON wrapped in \`\`\`json code blocks
- Extract ALL slot numbers and team names visible in the image
- Preserve exact spelling and formatting of team names
- If you see slot numbers without team names, include them with empty name field`;
}

// Prompt for extracting player data
function getPlayerExtractionPrompt(knownTeams) {
  const teamList = knownTeams.length > 0 ? 
    `\n\nKNOWN TEAMS FROM SLOTLIST:\n${knownTeams.map(t => `Slot ${t.slot}: ${t.name}`).join('\n')}` : '';

  return `You are analyzing an esports tournament player screenshot. This image shows individual player names/usernames, possibly grouped by teams or with team indicators.

ANALYZE THE IMAGE FOR:
1. **Player Names/Usernames**: Look for individual player identities (can be in any format - gaming usernames, display names, etc.)
2. **Team Associations**: Look for team names, slot numbers, team logos, or team indicators
3. **Player Status**: Look for "Finished", "Alive", "Eliminated" or similar status indicators
4. **Team Numbers**: Look for slot numbers (like 03, 04, 05, etc.) or team numbers
5. **Team Context**: Look for any visual groupings or sections that indicate team membership

IMPORTANT EXTRACTION GUIDELINES:
- Extract ALL visible player names, even if they look like unusual usernames
- Look for team names in headers, sections, or near player groups
- Numbers like "03", "04", "05" often indicate slot numbers from the slotlist
- Players may be grouped visually under team banners or in sections
- Some images may show tournament results with player names and team associations
- Pay attention to visual layouts that group players together

PLAYER NAME VARIATIONS TO LOOK FOR:
- Gaming usernames (like "DYnaMicNinjA", "be4stKiNO", "TMSe- NAFEY")
- Display names with special characters
- Names with clan tags or prefixes
- Names in different fonts or colors${teamList}

OUTPUT FORMAT:
Return a JSON object with this structure:
\`\`\`json
{
  "players": [
    {
      "name": "DYnaMicNinjA",
      "team": "TEAM TSM ENT",
      "slot": 3,
      "role": "Player",
      "status": "Finished"
    },
    {
      "name": "DYnaMicFizzY",
      "team": "TEAM TSM ENT", 
      "slot": 3,
      "role": "Player",
      "status": "Finished"
    },
    {
      "name": "be4stKiNO",
      "team": "TEAM TX4G",
      "slot": 4,
      "role": "Player",
      "status": "Finished"
    }
  ]
}
\`\`\`

CRITICAL INSTRUCTIONS:
- Extract EVERY visible player name/username in the image
- Look carefully for team indicators or slot numbers near player names
- If you see numbers like 03, 04, 05 etc., these are likely slot numbers
- Try to match extracted players with the known teams from the slotlist
- Include partial information even if you can't determine all fields
- Don't skip player names because they look unusual - gaming usernames can be very diverse`;
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