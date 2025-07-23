// src/app/api/ranger/match-results/route.js

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse form data
    const formData = await request.formData();
    const slotlistFile = formData.get('slotlistFile');
    const csvId = formData.get('csvId'); // For auto-populated CSV
    const resultScreenshots = formData.getAll('resultScreenshots');
    const matchesPlayed = formData.get('matchesPlayed') || '1';
    const groupName = formData.get('groupName') || 'G1';

    // Check if we have either a file or csvId for auto-population
    if (!slotlistFile && !csvId) {
      return NextResponse.json(
        { error: 'Either slotlist CSV file or CSV ID for auto-population is required' },
        { status: 400 }
      );
    }

    if (resultScreenshots.length === 0) {
      return NextResponse.json(
        { error: 'Result screenshots are required' },
        { status: 400 }
      );
    }

    let slotlistText = '';

    // Handle auto-populated CSV data
    if (csvId && !slotlistFile) {
      try {
        // Retrieve CSV data from cache
        global.csvCache = global.csvCache || new Map();
        const csvData = global.csvCache.get(csvId);

        if (!csvData) {
          return NextResponse.json(
            { error: 'CSV data not found or expired. Please regenerate the slotlist.' },
            { status: 404 }
          );
        }

        // Verify session ownership
        if (csvData.sessionId !== (session.user?.id || 'anonymous')) {
          return NextResponse.json(
            { error: 'Access denied to CSV data' },
            { status: 403 }
          );
        }

        slotlistText = csvData.csvData;
        console.log('Using auto-populated CSV data from cache');

      } catch (error) {
        console.error('Error retrieving auto-populated CSV:', error);
        return NextResponse.json(
          { error: 'Failed to retrieve auto-populated CSV data' },
          { status: 500 }
        );
      }
    } 
    // Handle uploaded CSV file
    else if (slotlistFile) {
      try {
        slotlistText = await slotlistFile.text();
        console.log('Using uploaded CSV file');
      } catch (error) {
        console.error('Error reading uploaded CSV file:', error);
        return NextResponse.json(
          { error: 'Failed to read uploaded CSV file' },
          { status: 400 }
        );
      }
    }

    // Parse the slotlist CSV
    const slotlistLines = slotlistText.split('\n');
    const teams = new Set();
    
    // Extract team names from CSV (skip header)
    for (let i = 1; i < slotlistLines.length; i++) {
      const line = slotlistLines[i].trim();
      if (line) {
        const columns = line.split(',').map(col => col.replace(/"/g, '').trim());
        if (columns[0]) {
          teams.add(columns[0]);
        }
      }
    }

    const teamList = Array.from(teams);

    if (teamList.length === 0) {
      return NextResponse.json(
        { error: 'No team data found in the slotlist. Please check the CSV format.' },
        { status: 400 }
      );
    }

    console.log('Extracted teams:', teamList);

    // Convert result screenshots to base64
    const screenshotPromises = resultScreenshots.map(file => fileToBase64(file));
    const screenshotsBase64 = await Promise.all(screenshotPromises);

    // Extract match results from screenshots
    const matchResults = [];
    
    for (let i = 0; i < screenshotsBase64.length; i++) {
      const screenshot = screenshotsBase64[i];
      
      const resultResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this gaming match result screenshot and extract the following information:
                1. Team names and their scores
                2. Which team won and which team lost
                3. Any other relevant match details (kills, rounds, etc.)
                
                The teams should be from this list: ${teamList.join(', ')}
                
                Return the data in JSON format like:
                {
                  "matchNumber": ${i + 1},
                  "teams": [
                    {"name": "Team Name", "score": 15, "result": "Win", "kills": 30},
                    {"name": "Team Name 2", "score": 12, "result": "Loss", "kills": 25}
                  ],
                  "additionalInfo": "Any other relevant details"
                }
                
                Be precise with team names and scores. If you can't find exact team names, match them closely to the provided team list.
                
                IMPORTANT: Make sure to extract ALL visible team data from the screenshot, even if there are more than 2 teams shown.`
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${screenshot}`
                }
              }
            ]
          }
        ],
        max_tokens: 1500
      });

      try {
        const resultText = resultResponse.choices[0].message.content;
        console.log(`Screenshot ${i + 1} analysis result:`, resultText);
        
        // Try to parse JSON from the response
        const jsonMatch = resultText.match(/\{.*\}/s);
        if (jsonMatch) {
          const matchData = JSON.parse(jsonMatch[0]);
          matchData.matchNumber = i + 1;
          matchResults.push(matchData);
        } else {
          throw new Error('No JSON found in response');
        }
      } catch (error) {
        console.error(`Error parsing result from screenshot ${i + 1}:`, error);
        // Add fallback data if parsing fails
        matchResults.push({
          matchNumber: i + 1,
          teams: teamList.slice(0, 2).map((team, idx) => ({
            name: team,
            score: idx === 0 ? 15 : 12,
            result: idx === 0 ? 'Win' : 'Loss',
            kills: 0
          })),
          additionalInfo: 'Could not extract detailed information from screenshot',
          extractionError: true
        });
      }
    }

    // Generate CSV data
    const csvData = [];
    
    // Header
    csvData.push(['Group', 'Match', 'Team', 'Score', 'Result', 'Kills', 'Additional Info']);

    // Add data for each match
    matchResults.forEach((match) => {
      match.teams.forEach((team) => {
        csvData.push([
          groupName,
          match.matchNumber.toString(),
          team.name,
          team.score.toString(),
          team.result,
          team.kills ? team.kills.toString() : '0',
          match.additionalInfo || ''
        ]);
      });
    });

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    // Generate summary statistics
    const summary = {
      totalMatches: matchResults.length,
      teamsInvolved: teamList,
      matchesPlayed: parseInt(matchesPlayed),
      groupName: groupName,
      dataSource: csvId ? 'auto-populated' : 'uploaded-file',
      extractionErrors: matchResults.filter(m => m.extractionError).length
    };

    // Clean up the CSV data from cache if it was used (optional)
    if (csvId && global.csvCache && global.csvCache.has(csvId)) {
      // Optionally keep it for potential reuse or delete it
      // global.csvCache.delete(csvId);
    }

    // Return CSV data
    return NextResponse.json({
      success: true,
      csvData: csvString,
      summary: summary,
      matchResults: matchResults,
      warnings: summary.extractionErrors > 0 ? 
        [`${summary.extractionErrors} match(es) had extraction errors and used fallback data`] : [],
      message: `Match results CSV generated successfully from ${summary.dataSource === 'auto-populated' ? 'auto-populated slotlist' : 'uploaded CSV file'}. Processed ${matchResults.length} match(es) with ${teamList.length} teams.`
    });

  } catch (error) {
    console.error('Error in match results generation:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate match results CSV',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
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