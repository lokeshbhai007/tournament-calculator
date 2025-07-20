// src/app/api/ranger/slotlist/route.js

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
    const slotlistPoster = formData.get('slotlistPoster');
    const slotScreenshots = formData.getAll('slotScreenshots');

    if (!slotlistPoster || slotScreenshots.length === 0) {
      return NextResponse.json(
        { error: 'Both slotlist poster and slot screenshots are required' },
        { status: 400 }
      );
    }

    // Convert files to base64 for OpenAI API
    const posterBase64 = await fileToBase64(slotlistPoster);
    const screenshotPromises = slotScreenshots.map(file => fileToBase64(file));
    const screenshotsBase64 = await Promise.all(screenshotPromises);

    // Extract team names from slotlist poster
    const teamNamesResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract all team names from this slotlist poster image. Return only the team names in a JSON array format like ['Team1', 'Team2', 'Team3']. Be precise and extract only actual team names, ignore any other text."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${posterBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 500
    });

    let teamNames = [];
    try {
      const teamNamesText = teamNamesResponse.choices[0].message.content;
      // Extract JSON array from response
      const jsonMatch = teamNamesText.match(/\[.*\]/);
      if (jsonMatch) {
        teamNames = JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error('Error parsing team names:', error);
      return NextResponse.json({ error: 'Failed to extract team names' }, { status: 500 });
    }

    // Extract player information from slot screenshots
    const playerData = [];
    
    for (let i = 0; i < screenshotsBase64.length; i++) {
      const screenshot = screenshotsBase64[i];
      
      const playersResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Extract player information from this gaming slot screenshot. Look for player names, their roles (like DPS, Support, Tank, etc.), and any team associations. Return the data in JSON format like:
                [
                  {"playerName": "PlayerName", "role": "DPS", "teamSlot": "1"},
                  {"playerName": "PlayerName2", "role": "Support", "teamSlot": "2"}
                ]
                
                If you can't determine the role, use "Player" as default. For teamSlot, use numbers 1, 2, 3, etc. to indicate which team slot this belongs to.`
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
        const playersText = playersResponse.choices[0].message.content;
        const jsonMatch = playersText.match(/\[.*\]/s);
        if (jsonMatch) {
          const players = JSON.parse(jsonMatch[0]);
          playerData.push(...players);
        }
      } catch (error) {
        console.error(`Error parsing players from screenshot ${i + 1}:`, error);
      }
    }

    // Combine team names with player data to create final CSV
    const csvData = [];
    csvData.push(['Team', 'Player', 'Role']); // Header

    // Assign players to teams
    let currentTeamIndex = 0;
    const playersPerTeam = Math.ceil(playerData.length / teamNames.length);
    
    playerData.forEach((player, index) => {
      const teamIndex = Math.floor(index / playersPerTeam);
      const teamName = teamNames[teamIndex] || `Team ${teamIndex + 1}`;
      
      csvData.push([
        teamName,
        player.playerName || `Player${index + 1}`,
        player.role || 'Player'
      ]);
    });

    // Convert to CSV string
    const csvString = csvData.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');

    // Return CSV data
    return NextResponse.json({
      success: true,
      csvData: csvString,
      teamNames: teamNames,
      playerCount: playerData.length,
      message: 'Slotlist CSV generated successfully'
    });

  } catch (error) {
    console.error('Error in slotlist generation:', error);
    return NextResponse.json(
      { error: 'Failed to generate slotlist CSV' },
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