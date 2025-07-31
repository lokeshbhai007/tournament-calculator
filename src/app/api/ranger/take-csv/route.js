// app/api/ranger/take-csv/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../auth/[...nextauth]/route';
import MatchResult from '../../../../models/MatchResult';
import dbConnect from '@/lib/mongodb';

export async function GET(request) {
  try {
    console.log('=== CSV Fetch API called ===');
    
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      console.log('Authentication failed - no session');
      return NextResponse.json({ 
        success: false, 
        error: 'Authentication required' 
      }, { status: 401 });
    }

    console.log('User authenticated:', session.user.email);

    // Extract matchId from URL parameters
    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      console.log('No matchId provided');
      return NextResponse.json({ 
        success: false, 
        error: 'Match ID is required' 
      }, { status: 400 });
    }

    console.log('Searching for matchId:', matchId.trim());

    // Connect to database
    await dbConnect();

    // Find the match result by matchId and user email
    const matchResult = await MatchResult.findOne({ 
      matchId: matchId.trim(), 
      userEmail: session.user.email 
    });

    console.log('Match result found:', !!matchResult);

    if (!matchResult) {
      console.log('Match not found or access denied');
      return NextResponse.json({ 
        success: false, 
        error: 'Match not found or you do not have access to this match',
        debug: {
          matchId: matchId.trim(),
          userEmail: session.user.email,
          searchResult: 'No matching document found'
        }
      }, { status: 404 });
    }

    // Check for CSV data in different locations
    let csvData = null;
    let csvSource = null;
    let csvFileUrl = null;

    // Priority 1: Check matchData.csvData (raw CSV content)
    if (matchResult.matchData?.csvData) {
      csvData = matchResult.matchData.csvData;
      csvSource = 'matchData.csvData';
      console.log('CSV found in matchData.csvData');
    }
    // Priority 2: Check csvFileUrl (legacy field)
    else if (matchResult.csvFileUrl) {
      csvFileUrl = matchResult.csvFileUrl;
      csvSource = 'csvFileUrl';
      console.log('CSV URL found in csvFileUrl:', csvFileUrl);
      
      // If we have a URL, we need to fetch the content
      try {
        const response = await fetch(csvFileUrl);
        if (response.ok) {
          csvData = await response.text();
          console.log('CSV content fetched from URL successfully');
        } else {
          console.error('Failed to fetch CSV from URL:', response.status);
        }
      } catch (fetchError) {
        console.error('Error fetching CSV from URL:', fetchError);
      }
    }

    // If no CSV data found anywhere
    if (!csvData) {
      console.log('No CSV data found in any location');
      return NextResponse.json({ 
        success: false, 
        error: 'No CSV data found for this match',
        debug: {
          matchId: matchId.trim(),
          hasMatchDataCsvData: !!matchResult.matchData?.csvData,
          hasCsvFileUrl: !!matchResult.csvFileUrl,
          hasCsvCloudinaryPublicId: !!matchResult.csvCloudinaryPublicId,
          csvSource: csvSource
        }
      }, { status: 404 });
    }

    console.log('CSV data successfully retrieved from:', csvSource);

    // Prepare match info
    const matchInfo = {
      matchId: matchResult.matchId,
      groupName: matchResult.groupName,
      matchesPlayed: matchResult.matchesPlayed,
      totalTeams: matchResult.matchData?.summary?.totalTeams || 0,
      winner: matchResult.matchData?.summary?.winner,
      winnerPoints: matchResult.matchData?.summary?.winnerPoints,
      createdAt: matchResult.createdAt,
      csvSource: csvSource,
      csvFileUrl: csvFileUrl // Include the URL if available
    };

    // Count teams in CSV data
    const teamCount = csvData ? csvData.split('\n').filter(line => line.trim()).length - 1 : 0;
    
    console.log('Returning CSV data with team count:', teamCount);

    // Return the CSV data
    return NextResponse.json({ 
      success: true, 
      csvData: csvData,
      csvFileUrl: csvFileUrl, // Include the file URL
      csvCloudinaryPublicId: matchResult.csvCloudinaryPublicId, // Include Cloudinary ID if available
      teamCount: teamCount,
      matchInfo: matchInfo
    });

  } catch (error) {
    console.error('Error fetching CSV data:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error',
      debug: {
        message: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      }
    }, { status: 500 });
  }
}