// src/app/api/ranger/match-results/route.js

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Constants
const MODELS = {
  GPT4O: "gpt-4o"
};

const MAX_TOKENS = {
  RESULT_EXTRACTION: 4000
};

const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  MISSING_DATA: 'Slotlist JSON data and result screenshots are required',
  INVALID_JSON: 'Invalid slotlist JSON data format',
  NO_RESULTS_EXTRACTED: 'No match results could be extracted from the images',
  PROCESSING_FAILED: 'Failed to process match results'
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

    // 2. Parse request body as JSON
    const requestData = await request.json();
    const { slotlistJsonData, resultScreenshotUrls, matchesPlayed, groupName, useCloudinary } = requestData;
    
    // Validate required data
    if (!slotlistJsonData || !resultScreenshotUrls || resultScreenshotUrls.length === 0) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.MISSING_DATA },
        { status: 400 }
      );
    }

    // Parse and validate JSON data
    let parsedSlotlistData;
    try {
      parsedSlotlistData = typeof slotlistJsonData === 'string' 
        ? JSON.parse(slotlistJsonData) 
        : slotlistJsonData;
    } catch (error) {
      return NextResponse.json(
        { error: ERROR_MESSAGES.INVALID_JSON },
        { status: 400 }
      );
    }

    // Validate JSON data structure
    if (!parsedSlotlistData || !parsedSlotlistData.teams || !Array.isArray(parsedSlotlistData.teams)) {
      return NextResponse.json(
        { error: 'Invalid slotlist data structure. Expected teams array.' },
        { status: 400 }
      );
    }

    // Extract team information from JSON data with player details
    const teamList = parsedSlotlistData.teams.map(team => ({
      name: team.name,
      slot: team.slot,
      players: team.players || []
    })).filter(team => team.name);
    
    if (teamList.length === 0) {
      return NextResponse.json(
        { error: 'No team data found in the slotlist JSON.' },
        { status: 400 }
      );
    }

    console.log('Extracted teams from JSON:', teamList);

    // 3. Extract match results from screenshot URLs
    const matchResults = [];
    
    for (let i = 0; i < resultScreenshotUrls.length; i++) {
      const screenshotUrl = resultScreenshotUrls[i];
      
      try {
        const resultResponse = await openai.chat.completions.create({
          model: MODELS.GPT4O,
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: getMatchResultExtractionPrompt(teamList, i + 1)
                },
                {
                  type: "image_url",
                  image_url: {
                    url: screenshotUrl
                  }
                }
              ]
            }
          ],
          max_tokens: MAX_TOKENS.RESULT_EXTRACTION
        });

        const resultText = resultResponse.choices[0].message.content;
        console.log(`Screenshot ${i + 1} analysis result:`, resultText);
        
        const parsedResult = parseJSONResponse(resultText);
        
        if (parsedResult && parsedResult.teams) {
          parsedResult.matchNumber = i + 1;
          matchResults.push(parsedResult);
        } else {
          throw new Error('No valid match data found in response');
        }
        
      } catch (error) {
        console.error(`Error processing screenshot ${i + 1}:`, error);
        // Add fallback data if processing fails
        matchResults.push({
          matchNumber: i + 1,
          teams: teamList.slice(0, 2).map((team, idx) => ({
            name: team.name,
            placement: idx + 1,
            result: idx === 0 ? 'Winner' : 'Second Place',
            totalKills: 0,
            players: team.players.map(player => ({
              name: player.name,
              kills: 0,
              finishes: 0
            }))
          })),
          winningTeam: {
            name: teamList[0]?.name || 'Unknown',
            placement: 1,
            totalKills: 0
          },
          additionalInfo: 'Could not extract detailed information from screenshot',
          extractionError: true
        });
      }
    }

    // 4. Generate CSV data from results
    const csvResult = generateMatchResultsCSV(matchResults, groupName);

    // 5. Generate summary statistics
    const summary = {
      totalMatches: matchResults.length,
      teamsInvolved: teamList.map(t => t.name),
      matchesPlayed: parseInt(matchesPlayed) || matchResults.length,
      groupName: groupName,
      dataSource: 'json-data',
      extractionErrors: matchResults.filter(m => m.extractionError).length,
      teamsFromSlotlist: parsedSlotlistData.teams.length,
      winningTeams: csvResult.winningTeams,
      teamsAnalyzed: csvResult.totalTeams
    };

    // 6. Return successful response
    return NextResponse.json({
      success: true,
      csvData: csvResult.csvString,
      summary: summary,
      matchResults: matchResults,
      winningTeamsSummary: matchResults.map(match => ({
        matchNumber: match.matchNumber,
        winningTeam: match.winningTeam?.name || 'Unknown',
        totalKills: match.winningTeam?.totalKills || 0
      })),
      warnings: summary.extractionErrors > 0 ? 
        [`${summary.extractionErrors} match(es) had extraction errors and used fallback data`] : [],
      message: `Match results CSV generated successfully! Processed ${matchResults.length} match(es). Winning teams identified: ${csvResult.winningTeams.join(', ')}`
    });

  } catch (error) {
    console.error('Error in match results generation:', error);
    return NextResponse.json(
      { 
        error: ERROR_MESSAGES.PROCESSING_FAILED,
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Generate match result extraction prompt
function getMatchResultExtractionPrompt(teamList, matchNumber) {
  // Create a detailed list of all known players organized by team
  const teamPlayerList = teamList.map(team => {
    const playerNames = team.players.map(p => p.name).join(', ');
    return `Team: ${team.name} (Slot ${team.slot}) - Players: ${playerNames}`;
  }).join('\n');

  return `You are analyzing a gaming tournament result screenshot that shows individual player performance with their team placements/rankings.

ANALYZE THE IMAGE FOR:
1. **Player Names**: Look for individual player usernames/names from the known player list below
2. **Team Rankings/Numbers**: Look for numbers (like 1, 2, 3, 4, 5) that indicate team placement/ranking beside player groups
3. **Player Statistics**: Look for "finishes", "kills", "eliminations" or similar performance metrics
4. **Team Grouping**: Players are typically grouped by teams in the results

**KNOWN TEAMS AND PLAYERS FROM SLOTLIST:**
${teamPlayerList}

**CRITICAL EXTRACTION GUIDELINES:**
1. **Player Name Matching**: Match visible player names EXACTLY with the known players from the list above
2. **Team Identification**: Use the team ranking numbers (1, 2, 3, 4, 5) shown beside player groups to determine team placement
3. **Winning Team Logic**: 
   - Team with ranking "1" or "Winner" indication = 1st place
   - Team with ranking "2" = 2nd place, and so on
4. **Kill/Performance Extraction**: Extract individual player kills/eliminations and sum them for team totals
5. **Team Name Resolution**: Match players to their teams using the known team-player associations above

**PLAYER NAME VARIATIONS TO LOOK FOR:**
- Gaming usernames with special characters (DYnaMicNinjA, 2016xJOKAR, SGS×Ani2oP)
- Names with clan tags or prefixes (KINGxVIPERR, ONFxITACHI, TmREDxEAGLeYT)
- Unicode/special character names (乃爪rѻー乂乃, HAKAÍ)
- Mixed case usernames (NoobPLaYeR04, FakeErrorXD)

**ANALYSIS STEPS:**
1. Identify all visible player names in the screenshot
2. Match each player name with the known teams from the list above
3. Look for team ranking numbers (1, 2, 3, 4, 5) to determine placement
4. Extract individual kill counts and sum for team totals
5. Determine winning team based on placement ranking

**OUTPUT FORMAT:**
Return a JSON object with this structure:
\`\`\`json
{
  "matchNumber": ${matchNumber},
  "teams": [
    {
      "name": "TEAM TSM ENT",
      "placement": 1,
      "result": "Winner",
      "totalKills": 45,
      "players": [
        {
          "name": "DYnaMicNinjA",
          "kills": 12,
          "finishes": 4
        },
        {
          "name": "DYnaMicFizzY", 
          "kills": 8,
          "finishes": 3
        },
        {
          "name": "DYnaMicBeaST",
          "kills": 15,
          "finishes": 5
        },
        {
          "name": "DYnaMicDaNgeR",
          "kills": 10,
          "finishes": 0
        }
      ]
    },
    {
      "name": "Tapatap Army",
      "placement": 2,
      "result": "Second Place",
      "totalKills": 38,
      "players": [
        {
          "name": "SGS×Ani2oP",
          "kills": 8,
          "finishes": 2
        },
        {
          "name": "NoobPLaYeR04",
          "kills": 12,
          "finishes": 3
        },
        {
          "name": "2016xJOKAR",
          "kills": 10,
          "finishes": 2
        },
        {
          "name": "GDGoat",
          "kills": 8,
          "finishes": 6
        }
      ]
    }
  ],
  "matchType": "Tournament Match",
  "winningTeam": {
    "name": "TEAM TSM ENT",
    "placement": 1,
    "totalKills": 45
  },
  "additionalInfo": "Match completed with teams participating"
}
\`\`\`

**CRITICAL INSTRUCTIONS:**
- ONLY include players whose names you can clearly see and match with the known player list above
- Team placement numbers (1, 2, 3, 4, 5) are crucial for determining winners
- Sum individual player kills to get team total kills
- The team with placement "1" is the winning team
- If you cannot determine exact placement, analyze visual cues (colors, positions, "Winner" text)
- Include ALL teams visible in the results, not just top performers
- Ensure player names match EXACTLY with the known player names from the slotlist data`;
}

// Updated function to generate CSV from match results with enhanced team analysis
function generateMatchResultsCSV(matchResults, groupName) {
  const csvData = [];
  
  // Enhanced header with winning team info
  csvData.push(['Group', 'Match', 'Team', 'Placement', 'Result', 'Total Kills', 'Player Name', 'Player Kills', 'Player Finishes', 'Is Winning Team']);

  // Add data for each match
  matchResults.forEach((match) => {
    const winningTeamName = match.winningTeam?.name || '';
    
    match.teams.forEach((team) => {
      if (team.players && team.players.length > 0) {
        team.players.forEach((player) => {
          csvData.push([
            groupName,
            match.matchNumber.toString(),
            team.name || 'Unknown Team',
            team.placement ? team.placement.toString() : '',
            team.result || 'Unknown',
            team.totalKills ? team.totalKills.toString() : '0',
            player.name || 'Unknown Player',
            player.kills ? player.kills.toString() : '0',
            player.finishes ? player.finishes.toString() : '0',
            team.name === winningTeamName ? 'Yes' : 'No'
          ]);
        });
      } else {
        // If no players data, add team-level data
        csvData.push([
          groupName,
          match.matchNumber.toString(),
          team.name || 'Unknown Team',
          team.placement ? team.placement.toString() : '',
          team.result || 'Unknown',
          team.totalKills ? team.totalKills.toString() : '0',
          'No Player Data',
          '0',
          '0',
          team.name === winningTeamName ? 'Yes' : 'No'
        ]);
      }
    });
  });

  // Convert to CSV string with proper escaping
  const csvString = csvData.map(row => 
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n');

  return {
    csvString,
    totalMatches: matchResults.length,
    totalTeams: new Set(matchResults.flatMap(m => m.teams.map(t => t.name))).size,
    winningTeams: matchResults.map(m => m.winningTeam?.name).filter(Boolean)
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