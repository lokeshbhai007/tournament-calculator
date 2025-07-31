// app/api/ranger/process-json/route.js
import dbConnect from '@/lib/mongodb';
import MatchResult from '@/models/MatchResult';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // Adjust path as needed

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const {
      matchId,
      groupName,
      matchesPlayed,
      processedResults,
      summary,
      unidentifiedTeams,
      imageProcessingErrors,
      csvData,
      slotlistJsonData,
      resultScreenshotUrls
    } = body;

    // Validate required fields
    if (!matchId || !processedResults || !csvData) {
      return Response.json({
        error: 'Missing required fields: matchId, processedResults, and csvData'
      }, { status: 400 });
    }

    // Check if match with same ID already exists for this user
    const existingMatch = await MatchResult.findOne({
      matchId: matchId.trim(),
      userEmail: session.user.email
    });

    if (existingMatch) {
      return Response.json({
        error: `Match with ID "${matchId}" already exists. Please use a different Match ID.`,
        existingMatch: {
          matchId: existingMatch.matchId,
          createdAt: existingMatch.createdAt,
          groupName: existingMatch.groupName
        }
      }, { status: 409 });
    }

    // Process slotlist data to extract teams info
    const teamsData = slotlistJsonData?.teams || slotlistJsonData || [];
    const slotlistInfo = {
      teamCount: Array.isArray(teamsData) ? teamsData.length : 0,
      playerCount: Array.isArray(teamsData) ? 
        teamsData.reduce((count, team) => count + (team.players?.length || 0), 0) : 0,
      teams: Array.isArray(teamsData) ? teamsData.map(team => ({
        name: team.name?.trim() || team.teamName?.trim() || 'Unknown',
        slot: team.slot || team.slotNumber || '',
        players: team.players || []
      })) : []
    };

    // Create comprehensive summary with fallbacks
    const matchSummary = {
      totalMatches: parseInt(matchesPlayed) || 1,
      groupName: groupName || 'G1',
      teamsProcessed: summary?.teamsProcessed || processedResults?.length || 0,
      totalTeams: summary?.totalTeams || slotlistInfo.teamCount || 0,
      winner: summary?.winner || (processedResults?.[0]?.teamName) || 'Unknown',
      winnerPoints: summary?.winnerPoints || (processedResults?.[0]?.totalPoint) || 0,
      unidentifiedTeams: summary?.unidentifiedTeams || (unidentifiedTeams?.length) || 0,
      imageProcessingErrors: summary?.imageProcessingErrors || (imageProcessingErrors?.length) || 0,
      accuracyMetrics: summary?.accuracyMetrics || {
        imagesProcessed: 0,
        totalImages: 0,
        teamMatchRate: '0%'
      }
    };

    // Create comprehensive match result document
    const matchResult = new MatchResult({
      matchId: matchId.trim(),
      userEmail: session.user.email,
      groupName: groupName || 'G1',
      matchesPlayed: parseInt(matchesPlayed) || 1,
      
      matchData: {
        processedResults: processedResults || [],
        summary: matchSummary,
        unidentifiedTeams: unidentifiedTeams || [],
        imageProcessingErrors: imageProcessingErrors || [],
        csvData: csvData // Store the CSV string directly
      },
      
      slotlistData: slotlistInfo,
      
      processingMetadata: {
        resultScreenshotUrls: resultScreenshotUrls || [],
        cloudinaryUrls: resultScreenshotUrls || [],
        processingTime: new Date(),
        apiVersion: 'v1.0'
      }
    });

    // Save to database
    const savedMatch = await matchResult.save();

    // Safely access the saved match data with fallbacks
    const responseData = {
      id: savedMatch._id,
      matchId: savedMatch.matchId,
      groupName: savedMatch.groupName,
      winner: savedMatch.matchData?.summary?.winner || 'Unknown',
      totalTeams: savedMatch.matchData?.summary?.totalTeams || 0,
      createdAt: savedMatch.createdAt,
      summary: savedMatch.matchData?.summary || matchSummary,
      // Include CSV data in response for verification
      csvGenerated: !!savedMatch.matchData?.csvData,
      csvDataLength: savedMatch.matchData?.csvData?.length || 0
    };

    // Return success response with saved data
    return Response.json({
      success: true,
      message: 'Match result data stored successfully',
      matchResult: responseData
    }, { status: 201 });

  } catch (error) {
    console.error('Error storing match result:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return Response.json({
        error: 'Match ID already exists for this user. Please use a different Match ID.',
        details: 'Duplicate match ID'
      }, { status: 409 });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return Response.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    return Response.json({
      error: 'Failed to store match result data',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const matchId = searchParams.get('matchId');
    
    // Debug endpoint to check data structure
    if (action === 'debug-structure' && matchId) {
      console.log('Debug structure request for matchId:', matchId);
      
      const match = await MatchResult.findOne({
        matchId: matchId,
        userEmail: session.user.email
      });

      if (!match) {
        return Response.json({ 
          error: 'Match not found',
          debug: { matchId, userEmail: session.user.email }
        }, { status: 404 });
      }

      const matchObj = match.toObject();
      
      return Response.json({
        success: true,
        debug: {
          matchId: match.matchId,
          userEmail: match.userEmail,
          topLevelKeys: Object.keys(matchObj),
          hasMatchData: !!match.matchData,
          matchDataKeys: match.matchData ? Object.keys(match.matchData) : [],
          hasCsvData: !!match.matchData?.csvData,
          csvDataType: typeof match.matchData?.csvData,
          csvDataLength: match.matchData?.csvData?.length || 0,
          csvPreview: match.matchData?.csvData ? 
            match.matchData.csvData.substring(0, 200) + '...' : null,
          // Show structure without sensitive data
          structure: {
            matchId: matchObj.matchId,
            userEmail: matchObj.userEmail,
            groupName: matchObj.groupName,
            hasMatchData: !!matchObj.matchData,
            matchDataStructure: matchObj.matchData ? {
              keys: Object.keys(matchObj.matchData),
              hasCsvData: !!matchObj.matchData.csvData,
              csvLength: matchObj.matchData.csvData?.length || 0
            } : null
          }
        }
      });
    }
    
    // CSV download endpoint
    if (action === 'download-csv' && matchId) {
      console.log('CSV download request:', { matchId, userEmail: session.user.email });
      
      const match = await MatchResult.findOne({
        matchId: matchId,
        userEmail: session.user.email
      });

      if (!match) {
        console.log('Match not found');
        return Response.json({ 
          error: 'Match not found or you do not have permission to access it',
          debug: {
            matchId,
            userEmail: session.user.email
          }
        }, { status: 404 });
      }

      console.log('Match found, checking for CSV data...');
      console.log('Has matchData:', !!match.matchData);
      console.log('Has csvData:', !!match.matchData?.csvData);
      console.log('CSV data type:', typeof match.matchData?.csvData);
      console.log('CSV data length:', match.matchData?.csvData?.length || 0);

      if (!match.matchData?.csvData) {
        console.log('CSV data not found in match');
        return Response.json({ 
          error: 'CSV data not found for this match',
          debug: {
            matchId: match.matchId,
            hasMatchData: !!match.matchData,
            matchDataKeys: match.matchData ? Object.keys(match.matchData) : [],
            suggestion: 'Use debug-structure action to see the complete data structure'
          }
        }, { status: 404 });
      }

      console.log('CSV data found, returning...');
      return Response.json({
        success: true,
        csvData: match.matchData.csvData,
        matchId: match.matchId,
        groupName: match.groupName,
        debug: {
          csvDataLength: match.matchData.csvData.length,
          csvDataType: typeof match.matchData.csvData
        }
      });
    }

    // Regular GET logic for fetching match history
    const limit = parseInt(searchParams.get('limit')) || 10;
    const page = parseInt(searchParams.get('page')) || 1;
    const groupName = searchParams.get('groupName');

    let query = { userEmail: session.user.email };
    
    if (matchId && !action) {
      query.matchId = { $regex: matchId, $options: 'i' };
    }
    
    if (groupName) {
      query.groupName = groupName;
    }

    const totalCount = await MatchResult.countDocuments(query);
    const totalPages = Math.ceil(totalCount / limit);
    const skip = (page - 1) * limit;

    const matches = await MatchResult.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('matchId groupName matchData.summary createdAt matchesPlayed matchData.csvData')
      .lean();

    return Response.json({
      success: true,
      data: {
        matches: matches.map(match => ({
          id: match._id,
          matchId: match.matchId,
          groupName: match.groupName,
          winner: match.matchData?.summary?.winner || 'Unknown',
          totalTeams: match.matchData?.summary?.totalTeams || 0,
          teamsProcessed: match.matchData?.summary?.teamsProcessed || 0,
          matchesPlayed: match.matchesPlayed,
          createdAt: match.createdAt,
          hasCsvData: !!match.matchData?.csvData,
          csvDataLength: match.matchData?.csvData?.length || 0,
          formattedDate: new Date(match.createdAt).toLocaleDateString('en-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })),
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Error in GET request:', error);
    return Response.json({
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return Response.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Find and delete the match (only if it belongs to the user)
    const deletedMatch = await MatchResult.findOneAndDelete({
      matchId: matchId,
      userEmail: session.user.email
    });

    if (!deletedMatch) {
      return Response.json({ 
        error: 'Match not found or you do not have permission to delete it' 
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: 'Match deleted successfully',
      deletedMatch: {
        matchId: deletedMatch.matchId,
        groupName: deletedMatch.groupName,
        hadCsvData: !!deletedMatch.matchData?.csvData
      }
    });

  } catch (error) {
    console.error('Error deleting match:', error);
    return Response.json({
      error: 'Failed to delete match',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

// Add a new endpoint to retrieve CSV data for a specific match
export async function PATCH(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const matchId = searchParams.get('matchId');

    if (action === 'download-csv' && matchId) {
      // Find the match and return its CSV data
      const match = await MatchResult.findOne({
        matchId: matchId,
        userEmail: session.user.email
      }).select('matchData.csvData matchId groupName');

      if (!match) {
        return Response.json({ 
          error: 'Match not found or you do not have permission to access it' 
        }, { status: 404 });
      }

      if (!match.matchData?.csvData) {
        return Response.json({ 
          error: 'CSV data not found for this match' 
        }, { status: 404 });
      }

      return Response.json({
        success: true,
        csvData: match.matchData.csvData,
        matchId: match.matchId,
        groupName: match.groupName
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in PATCH request:', error);
    return Response.json({
      error: 'Failed to process request',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}