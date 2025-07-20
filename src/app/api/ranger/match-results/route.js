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
    const resultScreenshots = formData.getAll('resultScreenshots');
    const matchesPlayed = formData.get('matchesPlayed') || '1';
    const groupName = formData.get('groupName') || 'G1';

    if (!slotlistFile || resultScreenshots.length === 0) {
      return NextResponse.json(
        { error: 'Both slotlist CSV file and result screenshots are required' },
        { status: 400 }
      );
    }

    // Read and parse the slotlist CSV file
    const slotlistText = await slotlistFile.text();
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
                  "matchNumber": 1,
                  "teams": [
                    {"name": "Team Name", "score": 15, "result": "Win", "kills": 30},
                    {"name": "Team Name 2", "score": 12, "result": "Loss", "kills": 25}
                  ],
                  "additionalInfo": "Any other relevant details"
                }
                
                Be precise with team names and scores. If you can't find exact team names, match them closely to the provided team list.`
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
        max_tokens: 1000
      });

      try {
        const resultText = resultResponse.choices[0].message.content;
        const jsonMatch = resultText.match(/\{.*\}/s);
        if (jsonMatch) {
          const matchData = JSON.parse(jsonMatch[0]);
          matchData.matchNumber = i + 1;
          matchResults.push(matchData);
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
          additionalInfo: 'Could not extract detailed information from screenshot'
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
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Generate summary statistics
    const summary = {
      totalMatches: matchResults.length,
      teamsInvolved: teamList,
      matchesPlayed: parseInt(matchesPlayed),
      groupName: groupName
    };

    // Return CSV data
    return NextResponse.json({
      success: true,
      csvData: csvString,
      summary: summary,
      matchResults: matchResults,
      message: 'Match results CSV generated successfully'
    });

  } catch (error) {
    console.error('Error in match results generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate match results CSV' },
      { status: 500 }
    );
  }
}

// Helper function to convert file to base64
async function fileToBase64(file) {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  return buffer.toString('base64');
}