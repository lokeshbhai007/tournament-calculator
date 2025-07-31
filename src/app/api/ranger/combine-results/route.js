// app/api/ranger/combine-results/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // Adjust path as needed

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      prevMatchCsvData,
      newResultScreenshotUrls,
      combineMatchesPlayed,
      combineGroupName,
      combineMatchId,
      useCloudinary = false 
    } = body;

    // Validate required fields
    if (!prevMatchCsvData || !newResultScreenshotUrls || newResultScreenshotUrls.length === 0) {
      return Response.json({ 
        error: 'Missing required fields: prevMatchCsvData and newResultScreenshotUrls' 
      }, { status: 400 });
    }

    if (!combineMatchId?.trim()) {
      return Response.json({ 
        error: 'Combined Match ID is required' 
      }, { status: 400 });
    }

    // Parse previous match CSV data
    const prevCsvLines = prevMatchCsvData.split('\n').filter(line => line.trim());
    if (prevCsvLines.length < 2) {
      return Response.json({ 
        error: 'Invalid previous match CSV data' 
      }, { status: 400 });
    }

    // Parse CSV header and data
    const csvHeader = prevCsvLines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const prevMatchResults = {};
    const teamSlotMapping = {};

    // Expected CSV columns: TEAM NAME, WIN, MATCHES PLAYED, PLACEMENT POINT, KILL POINT, TOTAL POINT, GROUP NAME, SLOT NUMBER
    const teamNameIndex = csvHeader.findIndex(h => h.toLowerCase().includes('team'));
    const winIndex = csvHeader.findIndex(h => h.toLowerCase().includes('win'));
    const matchesIndex = csvHeader.findIndex(h => h.toLowerCase().includes('matches'));
    const placementIndex = csvHeader.findIndex(h => h.toLowerCase().includes('placement'));
    const killIndex = csvHeader.findIndex(h => h.toLowerCase().includes('kill') || h.toLowerCase().includes('finish'));
    const totalIndex = csvHeader.findIndex(h => h.toLowerCase().includes('total'));
    const slotIndex = csvHeader.findIndex(h => h.toLowerCase().includes('slot'));

    if (teamNameIndex === -1) {
      return Response.json({ 
        error: 'Invalid CSV format: Team name column not found' 
      }, { status: 400 });
    }

    // Parse previous match data
    for (let i = 1; i < prevCsvLines.length; i++) {
      const row = prevCsvLines[i].split(',').map(cell => cell.replace(/"/g, '').trim());
      if (row.length < csvHeader.length) continue;

      const teamName = row[teamNameIndex]?.trim();
      if (!teamName || teamName.toLowerCase() === 'unknown') continue;

      prevMatchResults[teamName] = {
        wins: parseInt(row[winIndex]) || 0,
        matchesPlayed: parseInt(row[matchesIndex]) || 1,
        placementPoints: parseInt(row[placementIndex]) || 0,
        killPoints: parseInt(row[killIndex]) || 0,
        totalPoints: parseInt(row[totalIndex]) || 0,
        slotNumber: row[slotIndex]?.trim() || ""
      };

      teamSlotMapping[teamName] = row[slotIndex]?.trim() || "";
    }

    console.log(`Loaded ${Object.keys(prevMatchResults).length} teams from previous match data`);

    // Enhanced AI prompt for processing new match results
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

    const allNewResults = [];
    const imageProcessingErrors = [];

    // Process each new result screenshot with retry logic
    for (let i = 0; i < newResultScreenshotUrls.length; i++) {
      const imageUrl = newResultScreenshotUrls[i];
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
              temperature: 0.05,
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
          
          // Clean up the response
          raw = raw.replace(/```json\s*|```\s*|```/g, '').trim();
          raw = raw.replace(/^[^[\{]*/, '').replace(/[^}\]]*$/, '');
          
          try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) {
              const validResults = parsed.filter(item => 
                item.placement && 
                Array.isArray(item.players) && 
                item.players.length === 4 &&
                item.players.every(p => p && typeof p === 'string' && p.trim()) &&
                typeof item.kills === 'number' && 
                item.kills >= 0
              );
              
              if (validResults.length > 0) {
                allNewResults.push(...validResults);
                console.log(`Successfully processed image ${i + 1}: ${validResults.length} teams found`);
                break;
              } else {
                throw new Error('No valid results in parsed data');
              }
            } else if (parsed.placement && parsed.players) {
              if (Array.isArray(parsed.players) && parsed.players.length === 4) {
                allNewResults.push(parsed);
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

    if (allNewResults.length === 0) {
      return Response.json({ 
        error: 'No valid match results could be extracted from the new images',
        processingErrors: imageProcessingErrors
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

    // Create player to team mapping from previous match data
    const playerToTeam = {};
    
    // For combined results, we need to identify teams from the new match results
    // Since we don't have slotlist data, we'll try to match based on team names in previous data
    const prevTeamNames = Object.keys(prevMatchResults).map(name => name.toLowerCase());
    
    const processedNewResults = [];
    const unidentifiedTeams = [];
    const seenTeams = new Set();

    // Process new match results and try to match with previous teams
    allNewResults.forEach((team, index) => {
      const players = team.players || [];
      let teamName = "Unknown";
      let matchFound = false;

      // Try to identify team by checking if any player names match previous team names
      // This is a heuristic approach for combined results
      for (let player of players) {
        const cleanPlayer = player?.trim().toLowerCase();
        if (cleanPlayer) {
          // Check if this player name matches any previous team name (common in some tournaments)
          for (let prevTeam of prevTeamNames) {
            if (cleanPlayer.includes(prevTeam) || prevTeam.includes(cleanPlayer)) {
              teamName = Object.keys(prevMatchResults).find(t => 
                t.toLowerCase() === prevTeam
              );
              matchFound = true;
              break;
            }
          }
          if (matchFound) break;
        }
      }

      // If no match found, create a team name from first player
      if (!matchFound && players.length > 0) {
        teamName = players[0]?.trim() || `Team_${index + 1}`;
      }

      if (!matchFound) {
        unidentifiedTeams.push({
          placement: team.placement,
          players: players,
          kills: team.kills,
          suggestedTeamName: teamName
        });
      }

      // Create unique team identifier
      const teamKey = `${teamName}_${team.placement}`;
      if (seenTeams.has(teamKey)) {
        console.warn(`Duplicate team found: ${teamName} at placement ${team.placement}`);
        return;
      }
      seenTeams.add(teamKey);

      const placement = Math.max(1, Math.min(25, parseInt(team.placement) || 25));
      const finishPoint = Math.max(0, parseInt(team.kills) || 0);
      const placementPoint = placementPoints[placement] || 0;
      const win = placement === 1 ? 1 : 0;

      processedNewResults.push({
        teamName,
        placement,
        win,
        placementPoint,
        finishPoint,
        players: players,
        matchFound
      });
    });

    // Combine previous and new results
    const combinedResults = {};
    const totalMatchesPlayed = parseInt(combineMatchesPlayed) || 2;

    // Start with previous match data
    Object.keys(prevMatchResults).forEach(teamName => {
      const prevData = prevMatchResults[teamName];
      combinedResults[teamName] = {
        teamName,
        wins: prevData.wins,
        matchesPlayed: totalMatchesPlayed,
        placementPoints: prevData.placementPoints,
        killPoints: prevData.killPoints,
        totalPoints: prevData.totalPoints,
        groupName: combineGroupName || "G2",
        slotNumber: prevData.slotNumber,
        hasNewResult: false
      };
    });

    // Add new match results
    processedNewResults.forEach(newResult => {
      if (combinedResults[newResult.teamName]) {
        // Team exists in previous data - update with new results
        const existing = combinedResults[newResult.teamName];
        existing.wins += newResult.win;
        existing.placementPoints += newResult.placementPoint;
        existing.killPoints += newResult.finishPoint;
        existing.totalPoints += (newResult.placementPoint + newResult.finishPoint);
        existing.hasNewResult = true;
        existing.lastPlacement = newResult.placement;
      } else {
        // New team not in previous data
        combinedResults[newResult.teamName] = {
          teamName: newResult.teamName,
          wins: newResult.win,
          matchesPlayed: totalMatchesPlayed,
          placementPoints: newResult.placementPoint,
          killPoints: newResult.finishPoint,
          totalPoints: newResult.placementPoint + newResult.finishPoint,
          groupName: combineGroupName || "G2",
          slotNumber: teamSlotMapping[newResult.teamName] || "",
          hasNewResult: true,
          lastPlacement: newResult.placement,
          isNewTeam: true
        };
      }
    });

    // Convert to array and sort by total points
    const finalResults = Object.values(combinedResults).sort((a, b) => {
      if (a.totalPoints !== b.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (a.placementPoints !== b.placementPoints) {
        return b.placementPoints - a.placementPoints;
      }
      if (a.killPoints !== b.killPoints) {
        return b.killPoints - a.killPoints;
      }
      return a.teamName.localeCompare(b.teamName);
    });

    // Prepare CSV data
    const csvData = [
      ["TEAM NAME", "WIN", "MATCHES PLAYED", "PLACEMENT POINT", "KILL POINT", "TOTAL POINT", "GROUP NAME", "SLOT NUMBER"]
    ];

    finalResults.forEach((team, index) => {
      csvData.push([
        team.teamName,
        team.wins,
        team.matchesPlayed,
        team.placementPoints,
        team.killPoints,
        team.totalPoints,
        team.groupName,
        team.slotNumber
      ]);
    });

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => {
        if (typeof cell === 'string' && (cell.includes(',') || cell.includes('"') || cell.includes('\n'))) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      }).join(',')
    ).join('\n');

    // Create summary
    const summary = {
      totalMatches: totalMatchesPlayed,
      groupName: combineGroupName || "G2",
      previousTeamsCount: Object.keys(prevMatchResults).length,
      newResultsCount: processedNewResults.length,
      totalCombinedTeams: finalResults.length,
      winner: finalResults.length > 0 ? finalResults[0].teamName : "None",
      winnerPoints: finalResults.length > 0 ? finalResults[0].totalPoints : 0,
      unidentifiedTeams: unidentifiedTeams.length,
      imageProcessingErrors: imageProcessingErrors.length,
      teamsWithNewResults: finalResults.filter(t => t.hasNewResult).length,
      newTeamsAdded: finalResults.filter(t => t.isNewTeam).length,
      accuracyMetrics: {
        imagesProcessed: newResultScreenshotUrls.length - imageProcessingErrors.length,
        totalImages: newResultScreenshotUrls.length,
        teamMatchRate: processedNewResults.length > 0 ? 
          ((processedNewResults.length - unidentifiedTeams.length) / processedNewResults.length * 100).toFixed(1) + '%' : 'N/A'
      }
    };

    // Create combined teams data for storage
    const combinedTeamsData = {
      teams: finalResults.map(team => ({
        name: team.teamName,
        slot: team.slotNumber,
        players: [], // We don't have individual player data in combined results
        wins: team.wins,
        totalPoints: team.totalPoints,
        hasNewResult: team.hasNewResult,
        isNewTeam: team.isNewTeam || false
      }))
    };

    return Response.json({
      success: true,
      csvData: csvString,
      processedResults: finalResults,
      summary,
      unidentifiedTeams,
      imageProcessingErrors,
      combinedTeamsData,
      message: `Successfully combined ${Object.keys(prevMatchResults).length} previous teams with ${processedNewResults.length} new results. Total: ${finalResults.length} teams.`
    });

  } catch (error) {
    console.error('Combined results processing error:', error);
    return Response.json({ 
      error: 'Failed to process combined results', 
      details: error.message 
    }, { status: 500 });
  }
}