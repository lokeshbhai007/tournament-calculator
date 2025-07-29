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
      const teamName = team.name?.trim() || team.teamName?.trim();
      const slot = team.slot || team.slotNumber;
      const players = team.players || [];
      
      players.forEach(player => {
        const playerName = typeof player === 'string' ? player.trim() : player.name?.trim();
        if (playerName) {
          playerToTeam[playerName] = teamName;
          playerToSlot[playerName] = slot;
        }
      });
    });

    // AI prompt for processing result screenshots
    const prompt = `
You're an esports result parser. Each image shows match result boxes.
Each box contains:
1. Placement number (1 to 25)
2. 4 player names
3. Kill counts or finish counts

Return valid JSON only:
[
  {
    "placement": 1,
    "players": ["PlayerA", "PlayerB", "PlayerC", "PlayerD"],
    "kills": 12
  }
]

IMPORTANT: Return only the JSON array, no additional text or formatting.
`;

    const allResults = [];

    // Process each result screenshot
    for (const imageUrl of resultScreenshotUrls) {
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
            temperature: 0.1
          })
        });

        if (!openAIResponse.ok) {
          console.error('OpenAI API error:', await openAIResponse.text());
          continue;
        }

        const result = await openAIResponse.json();
        
        if (!result.choices || !result.choices[0]?.message?.content) {
          console.error('Invalid OpenAI response:', result);
          continue;
        }

        let raw = result.choices[0].message.content.trim();
        
        // Clean up the response - remove markdown formatting
        raw = raw.replace(/```json|```/g, '').trim();
        
        // Try to parse the JSON
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            allResults.push(...parsed);
          } else if (parsed.placement && parsed.players) {
            // Handle single object response
            allResults.push(parsed);
          }
        } catch (parseError) {
          console.warn('Failed to parse AI response as JSON:', raw);
          continue;
        }

      } catch (error) {
        console.error('Error processing image:', error);
        continue;
      }
    }

    if (allResults.length === 0) {
      return res.status(400).json({ 
        error: 'No valid match results could be extracted from the images' 
      });
    }

    // Placement points mapping
    const placementPoints = {
      1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 
      6: 2, 7: 1, 8: 1, 9: 0, 10: 0,
      11: 0, 12: 0, 13: 0, 14: 0, 15: 0,
      16: 0, 17: 0, 18: 0, 19: 0, 20: 0,
      21: 0, 22: 0, 23: 0, 24: 0, 25: 0
    };

    const seenTeams = new Set();
    const processedResults = [];

    // Process results and match with teams
    allResults.forEach(team => {
      const players = team.players || [];
      let teamName = "Unknown";
      let slotNumber = "";

      // Find team name by matching any player
      for (let player of players) {
        const cleanPlayer = player?.trim();
        if (cleanPlayer && playerToTeam[cleanPlayer]) {
          teamName = playerToTeam[cleanPlayer];
          slotNumber = playerToSlot[cleanPlayer];
          break;
        }
      }

      // Skip duplicate teams
      if (seenTeams.has(teamName)) return;
      seenTeams.add(teamName);

      const placement = parseInt(team.placement) || 25;
      const finishPoint = parseInt(team.kills) || 0;
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

    // Sort results by total points (descending), then by placement points
    processedResults.sort((a, b) => {
      if (a.totalPoint !== b.totalPoint) {
        return b.totalPoint - a.totalPoint;
      }
      if (a.placementPoint !== b.placementPoint) {
        return b.placementPoint - a.placementPoint;
      }
      return a.teamName.localeCompare(b.teamName);
    });

    // Create team result map for quick lookup
    const teamResultMap = {};
    processedResults.forEach(entry => {
      teamResultMap[entry.teamName] = entry;
    });

    // Prepare CSV data with all teams from slotlist
    const csvData = [
      ["TEAM NAME", "WIN", "MATCHES PLAYED", "PLACEMENT POINT", "FINISH POINT", "TOTAL POINT", "GROUP NAME", "SLOT NUMBER"]
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

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');

    // Prepare summary
    const summary = {
      totalMatches: parseInt(matchesPlayed) || 1,
      groupName: groupName || "G1",
      teamsProcessed: processedResults.length,
      totalTeams: csvData.length - 1, // Subtract header row
      winner: processedResults.length > 0 ? processedResults[0].teamName : "None"
    };

    res.status(200).json({
      success: true,
      csvData: csvString,
      processedResults,
      summary,
      message: `Successfully processed ${processedResults.length} teams from match results`
    });

  } catch (error) {
    console.error('Match results processing error:', error);
    res.status(500).json({ 
      error: 'Failed to process match results', 
      details: error.message 
    });
  }
}

// If using App Router (app/api/ranger/match-results/route.js)
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
      const teamName = team.name?.trim() || team.teamName?.trim();
      const slot = team.slot || team.slotNumber;
      const players = team.players || [];
      
      players.forEach(player => {
        const playerName = typeof player === 'string' ? player.trim() : player.name?.trim();
        if (playerName) {
          playerToTeam[playerName] = teamName;
          playerToSlot[playerName] = slot;
        }
      });
    });

    // AI prompt for processing result screenshots
    const prompt = `
You're an esports result parser. Each image shows match result boxes.
Each box contains:
1. Placement number (1 to 25)
2. 4 player names
3. Kill counts or finish counts

Return valid JSON only:
[
  {
    "placement": 1,
    "players": ["PlayerA", "PlayerB", "PlayerC", "PlayerD"],
    "kills": 12
  }
]

IMPORTANT: Return only the JSON array, no additional text or formatting.
`;

    const allResults = [];

    // Process each result screenshot
    for (const imageUrl of resultScreenshotUrls) {
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
            temperature: 0.1
          })
        });

        if (!openAIResponse.ok) {
          console.error('OpenAI API error:', await openAIResponse.text());
          continue;
        }

        const result = await openAIResponse.json();
        
        if (!result.choices || !result.choices[0]?.message?.content) {
          console.error('Invalid OpenAI response:', result);
          continue;
        }

        let raw = result.choices[0].message.content.trim();
        
        // Clean up the response - remove markdown formatting
        raw = raw.replace(/```json|```/g, '').trim();
        
        // Try to parse the JSON
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            allResults.push(...parsed);
          } else if (parsed.placement && parsed.players) {
            // Handle single object response
            allResults.push(parsed);
          }
        } catch (parseError) {
          console.warn('Failed to parse AI response as JSON:', raw);
          continue;
        }

      } catch (error) {
        console.error('Error processing image:', error);
        continue;
      }
    }

    if (allResults.length === 0) {
      return Response.json({ 
        error: 'No valid match results could be extracted from the images' 
      }, { status: 400 });
    }

    // Placement points mapping
    const placementPoints = {
      1: 10, 2: 6, 3: 5, 4: 4, 5: 3, 
      6: 2, 7: 1, 8: 1, 9: 0, 10: 0,
      11: 0, 12: 0, 13: 0, 14: 0, 15: 0,
      16: 0, 17: 0, 18: 0, 19: 0, 20: 0,
      21: 0, 22: 0, 23: 0, 24: 0, 25: 0
    };

    const seenTeams = new Set();
    const processedResults = [];

    // Process results and match with teams
    allResults.forEach(team => {
      const players = team.players || [];
      let teamName = "Unknown";
      let slotNumber = "";

      // Find team name by matching any player
      for (let player of players) {
        const cleanPlayer = player?.trim();
        if (cleanPlayer && playerToTeam[cleanPlayer]) {
          teamName = playerToTeam[cleanPlayer];
          slotNumber = playerToSlot[cleanPlayer];
          break;
        }
      }

      // Skip duplicate teams
      if (seenTeams.has(teamName)) return;
      seenTeams.add(teamName);

      const placement = parseInt(team.placement) || 25;
      const finishPoint = parseInt(team.kills) || 0;
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

    // Sort results by total points (descending), then by placement points
    processedResults.sort((a, b) => {
      if (a.totalPoint !== b.totalPoint) {
        return b.totalPoint - a.totalPoint;
      }
      if (a.placementPoint !== b.placementPoint) {
        return b.placementPoint - a.placementPoint;
      }
      return a.teamName.localeCompare(b.teamName);
    });

    // Create team result map for quick lookup
    const teamResultMap = {};
    processedResults.forEach(entry => {
      teamResultMap[entry.teamName] = entry;
    });

    // Prepare CSV data with all teams from slotlist
    const csvData = [
      ["TEAM NAME", "WIN", "MATCHES PLAYED", "PLACEMENT POINT", "FINISH POINT", "TOTAL POINT", "GROUP NAME", "SLOT NUMBER"]
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

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => {
        // Escape cells that contain commas, quotes, or newlines
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');

    // Prepare summary
    const summary = {
      totalMatches: parseInt(matchesPlayed) || 1,
      groupName: groupName || "G1",
      teamsProcessed: processedResults.length,
      totalTeams: csvData.length - 1, // Subtract header row
      winner: processedResults.length > 0 ? processedResults[0].teamName : "None"
    };

    return Response.json({
      success: true,
      csvData: csvString,
      processedResults,
      summary,
      message: `Successfully processed ${processedResults.length} teams from match results`
    });

  } catch (error) {
    console.error('Match results processing error:', error);
    return Response.json({ 
      error: 'Failed to process match results', 
      details: error.message 
    }, { status: 500 });
  }
}