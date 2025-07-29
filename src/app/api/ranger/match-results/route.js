// pages/api/ranger/match-results.js or app/api/ranger/match-results/route.js

import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // Adjust path as needed

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { 
      slotlistJsonData, 
      matchesPlayed, 
      groupName, 
      resultScreenshotUrls, 
      useCloudinary = false 
    } = req.body;

    // Validate required fields
    if (!slotlistJsonData || !resultScreenshotUrls || resultScreenshotUrls.length === 0) {
      return res.status(400).json({ 
        error: 'Missing required fields: slotlistJsonData and resultScreenshotUrls' 
      });
    }

    // Create player to team/slot mapping from slotlist data
    const playerToTeam = {};
    const playerToSlot = {};
    
    // Handle the nested structure from the slotlist API response
    const teamsData = slotlistJsonData.teams || slotlistJsonData;
    
    // Check if teamsData is an array, if not log the structure for debugging
    if (!Array.isArray(teamsData)) {
      console.error('Expected teams array but got:', typeof teamsData, teamsData);
      return res.status(400).json({ 
        error: 'Invalid slotlist data structure. Expected teams array.' 
      });
    }
    
    teamsData.forEach(team => {
      const teamName = (team.name?.trim() || team.teamName?.trim() || '').toLowerCase();
      const slot = team.slot || team.slotNumber;
      const players = team.players || [];
      
      players.forEach(player => {
        const playerName = typeof player === 'string' ? player.trim() : player.name?.trim();
        if (playerName) {
          // Store both original and lowercase versions for better matching
          const playerKey = playerName.toLowerCase();
          playerToTeam[playerKey] = team.name?.trim() || team.teamName?.trim();
          playerToSlot[playerKey] = slot;
          // Also store original case for direct matching
          playerToTeam[playerName] = team.name?.trim() || team.teamName?.trim();
          playerToSlot[playerName] = slot;
        }
      });
    });

    // Enhanced AI prompt for better accuracy
    const prompt = `
You're an esports result parser. Analyze the match result screenshot carefully.
Each result box contains:
1. Placement/Rank number (1-25)
2. Exactly 4 player names
3. Kill count or elimination count

CRITICAL REQUIREMENTS:
- Extract player names EXACTLY as shown (preserve spelling, spacing, special characters)
- Double-check placement numbers
- Ensure kill counts are accurate numbers
- If unclear, use your best judgment but be conservative

Return ONLY valid JSON in this exact format:
[
  {
    "placement": 1,
    "players": ["ExactPlayerName1", "ExactPlayerName2", "ExactPlayerName3", "ExactPlayerName4"],
    "kills": 12
  }
]

NO additional text, NO markdown formatting, ONLY the JSON array.
`;

    const allResults = [];
    const imageProcessingErrors = [];

    // Process each result screenshot with retry logic
    for (let i = 0; i < resultScreenshotUrls.length; i++) {
      const imageUrl = resultScreenshotUrls[i];
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        try {
          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: imageUrl,
                      detail: 'high'
                    }
                  }
                ]
              }],
              max_tokens: 4000,
              temperature: 0.05, // Lower temperature for better consistency
              top_p: 0.1
            })
          });

          if (!openAIResponse.ok) {
            const errorText = await openAIResponse.text();
            console.error(`OpenAI API error for image ${i + 1}:`, errorText);
            throw new Error(`OpenAI API error: ${openAIResponse.status}`);
          }

          const result = await openAIResponse.json();
          
          if (!result.choices || !result.choices[0]?.message?.content) {
            throw new Error('Invalid OpenAI response structure');
          }

          let raw = result.choices[0].message.content.trim();
          
          // More aggressive cleanup
          raw = raw.replace(/```json\s*|```\s*|```/g, '').trim();
          raw = raw.replace(/^[^[\{]*/, '').replace(/[^}\]]*$/, '');
          
          // Try to parse the JSON
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              // Validate each result
              const validResults = parsed.filter(item => 
                item.placement && 
                Array.isArray(item.players) && 
                item.players.length === 4 &&
                item.players.every(p => p && typeof p === 'string' && p.trim()) &&
                typeof item.kills === 'number' && 
                item.kills >= 0
              );
              
              if (validResults.length > 0) {
                allResults.push(...validResults);
                console.log(`Successfully processed image ${i + 1}: ${validResults.length} teams found`);
                break; // Success, exit retry loop
              } else {
                throw new Error('No valid results in parsed data');
              }
            } else if (parsed.placement && parsed.players) {
              // Handle single object response
              if (Array.isArray(parsed.players) && parsed.players.length === 4) {
                allResults.push(parsed);
                console.log(`Successfully processed image ${i + 1}: 1 team found`);
                break;
              } else {
                throw new Error('Invalid single result structure');
              }
            } else {
              throw new Error('Unexpected JSON structure');
            }
          } catch (parseError) {
            console.warn(`Failed to parse AI response for image ${i + 1} (attempt ${attempts + 1}):`, raw);
            throw parseError;
          }

        } catch (error) {
          attempts++;
          console.error(`Error processing image ${i + 1} (attempt ${attempts}):`, error.message);
          
          if (attempts >= maxAttempts) {
            imageProcessingErrors.push({
              imageIndex: i + 1,
              error: error.message
            });
          }
        }
      }
    }

    if (allResults.length === 0) {
      return res.status(400).json({ 
        error: 'No valid match results could be extracted from the images',
        processingErrors: imageProcessingErrors
      });
    }

    // Enhanced placement points mapping (ensure this matches your tournament rules)
    const placementPoints = {
      1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 
      6: 2, 7: 1, 8: 1, 9: 0, 10: 0,
      11: 0, 12: 0, 13: 0, 14: 0, 15: 0,
      16: 0, 17: 0, 18: 0, 19: 0, 20: 0,
      21: 0, 22: 0, 23: 0, 24: 0, 25: 0
    };

    const seenTeams = new Set();
    const processedResults = [];
    const unidentifiedTeams = [];

    // Process results and match with teams using fuzzy matching
    allResults.forEach((team, index) => {
      const players = team.players || [];
      let teamName = "Unknown";
      let slotNumber = "";
      let matchFound = false;

      // Try exact matching first
      for (let player of players) {
        const cleanPlayer = player?.trim();
        if (cleanPlayer && playerToTeam[cleanPlayer]) {
          teamName = playerToTeam[cleanPlayer];
          slotNumber = playerToSlot[cleanPlayer];
          matchFound = true;
          break;
        }
      }

      // If no exact match, try case-insensitive matching
      if (!matchFound) {
        for (let player of players) {
          const cleanPlayer = player?.trim().toLowerCase();
          if (cleanPlayer && playerToTeam[cleanPlayer]) {
            teamName = playerToTeam[cleanPlayer];
            slotNumber = playerToSlot[cleanPlayer];
            matchFound = true;
            break;
          }
        }
      }

      // If still no match, try partial matching (for typos)
      if (!matchFound) {
        for (let player of players) {
          const cleanPlayer = player?.trim().toLowerCase();
          if (cleanPlayer) {
            for (let [knownPlayer, knownTeam] of Object.entries(playerToTeam)) {
              if (knownPlayer.toLowerCase().includes(cleanPlayer) || 
                  cleanPlayer.includes(knownPlayer.toLowerCase())) {
                teamName = knownTeam;
                slotNumber = playerToSlot[knownPlayer];
                matchFound = true;
                console.log(`Fuzzy match found: "${player}" matched with "${knownPlayer}"`);
                break;
              }
            }
            if (matchFound) break;
          }
        }
      }

      if (!matchFound) {
        unidentifiedTeams.push({
          placement: team.placement,
          players: players,
          kills: team.kills
        });
      }

      // Create a unique team identifier including placement to handle duplicates better
      const teamKey = `${teamName}_${team.placement}`;
      if (seenTeams.has(teamKey)) {
        console.warn(`Duplicate team found: ${teamName} at placement ${team.placement}`);
        return;
      }
      seenTeams.add(teamKey);

      const placement = Math.max(1, Math.min(25, parseInt(team.placement) || 25));
      const finishPoint = Math.max(0, parseInt(team.kills) || 0);
      const placementPoint = placementPoints[placement] || 0;
      const totalPoint = placementPoint + finishPoint;
      const win = placement === 1 ? 1 : 0;

      processedResults.push({
        teamName,
        win,
        matchesPlayed: parseInt(matchesPlayed) || 1,
        placementPoint,
        finishPoint,
        totalPoint,
        groupName: groupName || "G1",
        slotNumber: slotNumber || ""
      });
    });

    // ENHANCED SORTING - Multiple criteria for high accuracy
    processedResults.sort((a, b) => {
      // Primary: Total points (descending)
      if (a.totalPoint !== b.totalPoint) {
        return b.totalPoint - a.totalPoint;
      }
      
      // Secondary: Placement points (descending)
      if (a.placementPoint !== b.placementPoint) {
        return b.placementPoint - a.placementPoint;
      }
      
      // Tertiary: Finish/Kill points (descending)
      if (a.finishPoint !== b.finishPoint) {
        return b.finishPoint - a.finishPoint;
      }
      
      // Quaternary: Better placement (ascending - lower is better)
      if (a.placement !== b.placement) {
        return a.placement - b.placement;
      }
      
      // Final: Alphabetical by team name
      return a.teamName.localeCompare(b.teamName);
    });

    // Create team result map for quick lookup
    const teamResultMap = {};
    processedResults.forEach(entry => {
      teamResultMap[entry.teamName] = entry;
    });

    // Prepare CSV data with all teams from slotlist
    const csvData = [
      ["TEAM NAME", "WIN", "MATCHES PLAYED", "PLACEMENT POINT", "KILL POINT", "TOTAL POINT", "GROUP NAME", "SLOT NUMBER"]
    ];

    const teamsInSlotlist = new Set();

    // Add all teams from slotlist (even those not in results)
    teamsData.forEach(team => {
      const teamName = team.name?.trim() || team.teamName?.trim() || "Unknown";
      const slotNumber = team.slot || team.slotNumber || "";
      
      if (teamsInSlotlist.has(teamName)) return;
      teamsInSlotlist.add(teamName);

      const result = teamResultMap[teamName] || {
        win: 0,
        matchesPlayed: parseInt(matchesPlayed) || 1,
        placementPoint: 0,
        finishPoint: 0,
        totalPoint: 0,
        groupName: groupName || "G1"
      };

      csvData.push([
        teamName,
        result.win,
        result.matchesPlayed,
        result.placementPoint,
        result.finishPoint,
        result.totalPoint,
        result.groupName,
        slotNumber
      ]);
    });

    // Add any teams found in results but not in slotlist
    processedResults.forEach(entry => {
      if (!teamsInSlotlist.has(entry.teamName)) {
        csvData.push([
          entry.teamName,
          entry.win,
          entry.matchesPlayed,
          entry.placementPoint,
          entry.finishPoint,
          entry.totalPoint,
          entry.groupName,
          entry.slotNumber
        ]);
      }
    });

    // Sort CSV data (excluding header) by total points
    const header = csvData[0];
    const dataRows = csvData.slice(1);
    
    dataRows.sort((a, b) => {
      const totalA = parseInt(a[5]) || 0; // TOTAL POINT column
      const totalB = parseInt(b[5]) || 0;
      
      if (totalA !== totalB) return totalB - totalA;
      
      const placementA = parseInt(a[4]) || 0; // PLACEMENT POINT column
      const placementB = parseInt(b[4]) || 0;
      
      if (placementA !== placementB) return placementB - placementA;
      
      const finishA = parseInt(a[3]) || 0; // FINISH POINT column
      const finishB = parseInt(b[3]) || 0;
      
      return finishB - finishA;
    });

    // Add rank numbers
    dataRows.forEach((row, index) => {
      row[9] = index + 1; // Set rank
    });

    // Reconstruct CSV with header
    const sortedCsvData = [header, ...dataRows];

    // Convert to CSV string
    const csvString = sortedCsvData.map(row => 
      row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');

    // Enhanced summary with accuracy metrics
    const summary = {
      totalMatches: parseInt(matchesPlayed) || 1,
      groupName: groupName || "G1",
      teamsProcessed: processedResults.length,
      totalTeams: sortedCsvData.length - 1, // Subtract header row
      winner: processedResults.length > 0 ? processedResults[0].teamName : "None",
      winnerPoints: processedResults.length > 0 ? processedResults[0].totalPoint : 0,
      unidentifiedTeams: unidentifiedTeams.length,
      imageProcessingErrors: imageProcessingErrors.length,
      accuracyMetrics: {
        imagesProcessed: resultScreenshotUrls.length - imageProcessingErrors.length,
        totalImages: resultScreenshotUrls.length,
        teamMatchRate: processedResults.length > 0 ? 
          ((processedResults.length - unidentifiedTeams.length) / processedResults.length * 100).toFixed(1) + '%' : 'N/A'
      }
    };

    res.status(200).json({
      success: true,
      csvData: csvString,
      processedResults,
      summary,
      unidentifiedTeams,
      imageProcessingErrors,
      message: `Successfully processed ${processedResults.length} teams from match results. Sorted by Total Points (descending).`
    });

  } catch (error) {
    console.error('Match results processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process match results', 
      details: error.message 
    });
  }
}

// App Router version (app/api/ranger/match-results/route.js)
export async function POST(request) {
  try {
    // Get session (adjust based on your auth setup)
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      slotlistJsonData, 
      matchesPlayed, 
      groupName, 
      resultScreenshotUrls, 
      useCloudinary = false 
    } = body;

    // Validate required fields
    if (!slotlistJsonData || !resultScreenshotUrls || resultScreenshotUrls.length === 0) {
      return Response.json({ 
        error: 'Missing required fields: slotlistJsonData and resultScreenshotUrls' 
      }, { status: 400 });
    }

    // Create player to team/slot mapping from slotlist data
    const playerToTeam = {};
    const playerToSlot = {};
    
    // Handle the nested structure from the slotlist API response
    const teamsData = slotlistJsonData.teams || slotlistJsonData;
    
    // Check if teamsData is an array, if not log the structure for debugging
    if (!Array.isArray(teamsData)) {
      console.error('Expected teams array but got:', typeof teamsData, teamsData);
      return Response.json({ 
        error: 'Invalid slotlist data structure. Expected teams array.' 
      }, { status: 400 });
    }
    
    teamsData.forEach(team => {
      const teamName = (team.name?.trim() || team.teamName?.trim() || '').toLowerCase();
      const slot = team.slot || team.slotNumber;
      const players = team.players || [];
      
      players.forEach(player => {
        const playerName = typeof player === 'string' ? player.trim() : player.name?.trim();
        if (playerName) {
          // Store both original and lowercase versions for better matching
          const playerKey = playerName.toLowerCase();
          playerToTeam[playerKey] = team.name?.trim() || team.teamName?.trim();
          playerToSlot[playerKey] = slot;
          // Also store original case for direct matching
          playerToTeam[playerName] = team.name?.trim() || team.teamName?.trim();
          playerToSlot[playerName] = slot;
        }
      });
    });

    // Enhanced AI prompt for better accuracy
    const prompt = `
You're an esports result parser. Analyze the match result screenshot carefully.
Each result box contains:
1. Placement/Rank number (1-25)
2. Exactly 4 player names
3. Kill count or elimination count

CRITICAL REQUIREMENTS:
- Extract player names EXACTLY as shown (preserve spelling, spacing, special characters)
- Double-check placement numbers
- Ensure kill counts are accurate numbers
- If unclear, use your best judgment but be conservative

Return ONLY valid JSON in this exact format:
[
  {
    "placement": 1,
    "players": ["ExactPlayerName1", "ExactPlayerName2", "ExactPlayerName3", "ExactPlayerName4"],
    "kills": 12
  }
]

NO additional text, NO markdown formatting, ONLY the JSON array.
`;

    const allResults = [];
    const imageProcessingErrors = [];

    // Process each result screenshot with retry logic
    for (let i = 0; i < resultScreenshotUrls.length; i++) {
      const imageUrl = resultScreenshotUrls[i];
      let attempts = 0;
      const maxAttempts = 2;

      while (attempts < maxAttempts) {
        try {
          const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [{
                role: 'user',
                content: [
                  { type: 'text', text: prompt },
                  { 
                    type: 'image_url', 
                    image_url: { 
                      url: imageUrl,
                      detail: 'high'
                    }
                  }
                ]
              }],
              max_tokens: 4000,
              temperature: 0.05, // Lower temperature for better consistency
              top_p: 0.1
            })
          });

          if (!openAIResponse.ok) {
            const errorText = await openAIResponse.text();
            console.error(`OpenAI API error for image ${i + 1}:`, errorText);
            throw new Error(`OpenAI API error: ${openAIResponse.status}`);
          }

          const result = await openAIResponse.json();
          
          if (!result.choices || !result.choices[0]?.message?.content) {
            throw new Error('Invalid OpenAI response structure');
          }

          let raw = result.choices[0].message.content.trim();
          
          // More aggressive cleanup
          raw = raw.replace(/```json\s*|```\s*|```/g, '').trim();
          raw = raw.replace(/^[^[\{]*/, '').replace(/[^}\]]*$/, '');
          
          // Try to parse the JSON
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              // Validate each result
              const validResults = parsed.filter(item => 
                item.placement && 
                Array.isArray(item.players) && 
                item.players.length === 4 &&
                item.players.every(p => p && typeof p === 'string' && p.trim()) &&
                typeof item.kills === 'number' && 
                item.kills >= 0
              );
              
              if (validResults.length > 0) {
                allResults.push(...validResults);
                console.log(`Successfully processed image ${i + 1}: ${validResults.length} teams found`);
                break; // Success, exit retry loop
              } else {
                throw new Error('No valid results in parsed data');
              }
            } else if (parsed.placement && parsed.players) {
              // Handle single object response
              if (Array.isArray(parsed.players) && parsed.players.length === 4) {
                allResults.push(parsed);
                console.log(`Successfully processed image ${i + 1}: 1 team found`);
                break;
              } else {
                throw new Error('Invalid single result structure');
              }
            } else {
              throw new Error('Unexpected JSON structure');
            }
          } catch (parseError) {
            console.warn(`Failed to parse AI response for image ${i + 1} (attempt ${attempts + 1}):`, raw);
            throw parseError;
          }

        } catch (error) {
          attempts++;
          console.error(`Error processing image ${i + 1} (attempt ${attempts}):`, error.message);
          
          if (attempts >= maxAttempts) {
            imageProcessingErrors.push({
              imageIndex: i + 1,
              error: error.message
            });
          }
        }
      }
    }

    if (allResults.length === 0) {
      return Response.json({ 
        error: 'No valid match results could be extracted from the images',
        processingErrors: imageProcessingErrors
      }, { status: 400 });
    }

    // Enhanced placement points mapping (ensure this matches your tournament rules)
    const placementPoints = {
      1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 
      6: 2, 7: 1, 8: 1, 9: 0, 10: 0,
      11: 0, 12: 0, 13: 0, 14: 0, 15: 0,
      16: 0, 17: 0, 18: 0, 19: 0, 20: 0,
      21: 0, 22: 0, 23: 0, 24: 0, 25: 0
    };

    const seenTeams = new Set();
    const processedResults = [];
    const unidentifiedTeams = [];

    // Process results and match with teams using fuzzy matching
    allResults.forEach((team, index) => {
      const players = team.players || [];
      let teamName = "Unknown";
      let slotNumber = "";
      let matchFound = false;

      // Try exact matching first
      for (let player of players) {
        const cleanPlayer = player?.trim();
        if (cleanPlayer && playerToTeam[cleanPlayer]) {
          teamName = playerToTeam[cleanPlayer];
          slotNumber = playerToSlot[cleanPlayer];
          matchFound = true;
          break;
        }
      }

      // If no exact match, try case-insensitive matching
      if (!matchFound) {
        for (let player of players) {
          const cleanPlayer = player?.trim().toLowerCase();
          if (cleanPlayer && playerToTeam[cleanPlayer]) {
            teamName = playerToTeam[cleanPlayer];
            slotNumber = playerToSlot[cleanPlayer];
            matchFound = true;
            break;
          }
        }
      }

      // If still no match, try partial matching (for typos)
      if (!matchFound) {
        for (let player of players) {
          const cleanPlayer = player?.trim().toLowerCase();
          if (cleanPlayer) {
            for (let [knownPlayer, knownTeam] of Object.entries(playerToTeam)) {
              if (knownPlayer.toLowerCase().includes(cleanPlayer) || 
                  cleanPlayer.includes(knownPlayer.toLowerCase())) {
                teamName = knownTeam;
                slotNumber = playerToSlot[knownPlayer];
                matchFound = true;
                console.log(`Fuzzy match found: "${player}" matched with "${knownPlayer}"`);
                break;
              }
            }
            if (matchFound) break;
          }
        }
      }

      if (!matchFound) {
        unidentifiedTeams.push({
          placement: team.placement,
          players: players,
          kills: team.kills
        });
      }

      // Create a unique team identifier including placement to handle duplicates better
      const teamKey = `${teamName}_${team.placement}`;
      if (seenTeams.has(teamKey)) {
        console.warn(`Duplicate team found: ${teamName} at placement ${team.placement}`);
        return;
      }
      seenTeams.add(teamKey);

      const placement = Math.max(1, Math.min(25, parseInt(team.placement) || 25));
      const finishPoint = Math.max(0, parseInt(team.kills) || 0);
      const placementPoint = placementPoints[placement] || 0;
      const totalPoint = placementPoint + finishPoint;
      const win = placement === 1 ? 1 : 0;

      processedResults.push({
        teamName,
        win,
        matchesPlayed: parseInt(matchesPlayed) || 1,
        placementPoint,
        finishPoint,
        totalPoint,
        groupName: groupName || "G1",
        slotNumber: slotNumber || "",
        placement, // Add placement for verification
        players: players // Add players for verification
      });
    });

    // ENHANCED SORTING - Multiple criteria for high accuracy
    processedResults.sort((a, b) => {
      // Primary: Total points (descending)
      if (a.totalPoint !== b.totalPoint) {
        return b.totalPoint - a.totalPoint;
      }
      
      // Secondary: Placement points (descending)
      if (a.placementPoint !== b.placementPoint) {
        return b.placementPoint - a.placementPoint;
      }
      
      // Tertiary: Finish/Kill points (descending)
      if (a.finishPoint !== b.finishPoint) {
        return b.finishPoint - a.finishPoint;
      }
      
      // Quaternary: Better placement (ascending - lower is better)
      if (a.placement !== b.placement) {
        return a.placement - b.placement;
      }
      
      // Final: Alphabetical by team name
      return a.teamName.localeCompare(b.teamName);
    });

    // Create team result map for quick lookup
    const teamResultMap = {};
    processedResults.forEach(entry => {
      teamResultMap[entry.teamName] = entry;
    });

    // Prepare CSV data with all teams from slotlist
    const csvData = [
      ["TEAM NAME", "WIN", "MATCHES PLAYED", "PLACEMENT POINT", "KILL POINT", "TOTAL POINT", "GROUP NAME", "SLOT NUMBER"]
    ];

    const teamsInSlotlist = new Set();

    // Add all teams from slotlist (even those not in results)
    teamsData.forEach(team => {
      const teamName = team.name?.trim() || team.teamName?.trim() || "Unknown";
      const slotNumber = team.slot || team.slotNumber || "";
      
      if (teamsInSlotlist.has(teamName)) return;
      teamsInSlotlist.add(teamName);

      const result = teamResultMap[teamName] || {
        win: 0,
        matchesPlayed: parseInt(matchesPlayed) || 1,
        placementPoint: 0,
        finishPoint: 0,
        totalPoint: 0,
        groupName: groupName || "G1",
        placement: 25
      };

      csvData.push([
        teamName,
        result.win,
        result.matchesPlayed,
        result.placementPoint,
        result.finishPoint,
        result.totalPoint,
        result.groupName,
        slotNumber,
        "" // Rank will be filled after sorting
      ]);
    });

    // Add any teams found in results but not in slotlist
    processedResults.forEach(entry => {
      if (!teamsInSlotlist.has(entry.teamName)) {
        csvData.push([
          entry.teamName,
          entry.win,
          entry.matchesPlayed,
          entry.placementPoint,
          entry.finishPoint,
          entry.totalPoint,
          entry.groupName,
          entry.slotNumber,
          entry.placement,
          ""
        ]);
      }
    });

    // Sort CSV data (excluding header) by total points
    const header = csvData[0];
    const dataRows = csvData.slice(1);
    
    dataRows.sort((a, b) => {
      const totalA = parseInt(a[5]) || 0; // TOTAL POINT column
      const totalB = parseInt(b[5]) || 0;
      
      if (totalA !== totalB) return totalB - totalA;
      
      const placementA = parseInt(a[3]) || 0; // PLACEMENT POINT column
      const placementB = parseInt(b[3]) || 0;
      
      if (placementA !== placementB) return placementB - placementA;
      
      const finishA = parseInt(a[4]) || 0; // FINISH POINT column
      const finishB = parseInt(a[4]) || 0;
      
      return finishB - finishA;
    });

    // Reconstruct CSV with header
    const sortedCsvData = [header, ...dataRows];

    // Convert to CSV string
    const csvString = sortedCsvData.map(row => 
      row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');

    // Enhanced summary with accuracy metrics
    const summary = {
      totalMatches: parseInt(matchesPlayed) || 1,
      groupName: groupName || "G1",
      teamsProcessed: processedResults.length,
      totalTeams: sortedCsvData.length - 1, // Subtract header row
      winner: processedResults.length > 0 ? processedResults[0].teamName : "None",
      winnerPoints: processedResults.length > 0 ? processedResults[0].totalPoint : 0,
      unidentifiedTeams: unidentifiedTeams.length,
      imageProcessingErrors: imageProcessingErrors.length,
      accuracyMetrics: {
        imagesProcessed: resultScreenshotUrls.length - imageProcessingErrors.length,
        totalImages: resultScreenshotUrls.length,
        teamMatchRate: processedResults.length > 0 ? 
          ((processedResults.length - unidentifiedTeams.length) / processedResults.length * 100).toFixed(1) + '%' : 'N/A'
      }
    };

    return Response.json({
      success: true,
      csvData: csvString,
      processedResults,
      summary,
      unidentifiedTeams,
      imageProcessingErrors,
      message: `Successfully processed ${processedResults.length} teams from match results. Sorted by Total Points (descending).`
    });

  } catch (error) {
    console.error('Match results processing error:', error);
    return Response.json({ 
      error: 'Failed to process match results', 
      details: error.message 
    }, { status: 500 });
  }
}