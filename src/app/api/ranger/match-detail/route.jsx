// app/api/ranger/match-detail/route.js
import dbConnect from '@/lib/mongodb';
import MatchResult from '@/models/MatchResult';
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route"; // Adjust path as needed

export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');
    const format = searchParams.get('format'); // 'json' or 'csv'

    if (!matchId) {
      return Response.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Find the match (only if it belongs to the user)
    const match = await MatchResult.findOne({
      matchId: matchId,
      userEmail: session.user.email
    }).lean();

    if (!match) {
      return Response.json({ 
        error: 'Match not found or you do not have permission to access it' 
      }, { status: 404 });
    }

    // Return CSV data if requested
    if (format === 'csv') {
      if (!match.matchData?.csvData) {
        return Response.json({ 
          error: 'CSV data not available for this match' 
        }, { status: 404 });
      }

      return new Response(match.matchData.csvData, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="match_${matchId}_results.csv"`
        }
      });
    }

    // Return detailed JSON data
    const detailedMatch = {
      id: match._id,
      matchId: match.matchId,
      groupName: match.groupName,
      matchesPlayed: match.matchesPlayed,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt,
      
      // Match results and summary
      matchData: match.matchData,
      
      // Slotlist information
      slotlistData: match.slotlistData,
      
      // Processing metadata
      processingMetadata: match.processingMetadata,
      
      // Computed values
      formattedDate: new Date(match.createdAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      
      // Leaderboard (top 10)
      leaderboard: match.matchData?.processedResults
        ?.sort((a, b) => b.totalPoint - a.totalPoint)
        ?.slice(0, 10) || [],
      
      // Statistics
      statistics: {
        totalTeams: match.matchData?.summary?.totalTeams || 0,
        teamsProcessed: match.matchData?.summary?.teamsProcessed || 0,
        unidentifiedTeams: match.matchData?.summary?.unidentifiedTeams || 0,
        imageProcessingErrors: match.matchData?.summary?.imageProcessingErrors || 0,
        accuracyRate: match.matchData?.summary?.accuracyMetrics?.teamMatchRate || '0%',
        winnerPoints: match.matchData?.summary?.winnerPoints || 0,
        totalImages: match.matchData?.summary?.accuracyMetrics?.imagesProcessed || 0
      }
    };

    return Response.json({
      success: true,
      match: detailedMatch
    });

  } catch (error) {
    console.error('Error fetching match details:', error);
    return Response.json({
      error: 'Failed to fetch match details',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();

    const body = await request.json();
    const { matchId, updates } = body;

    if (!matchId) {
      return Response.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Find and update the match (only if it belongs to the user)
    const allowedUpdates = ['groupName', 'matchesPlayed'];
    const filteredUpdates = {};
    
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    if (Object.keys(filteredUpdates).length === 0) {
      return Response.json({ 
        error: 'No valid updates provided' 
      }, { status: 400 });
    }

    const updatedMatch = await MatchResult.findOneAndUpdate(
      {
        matchId: matchId,
        userEmail: session.user.email
      },
      {
        $set: {
          ...filteredUpdates,
          updatedAt: new Date()
        }
      },
      { 
        new: true,
        runValidators: true
      }
    ).lean();

    if (!updatedMatch) {
      return Response.json({ 
        error: 'Match not found or you do not have permission to update it' 
      }, { status: 404 });
    }

    return Response.json({
      success: true,
      message: 'Match updated successfully',
      match: {
        id: updatedMatch._id,
        matchId: updatedMatch.matchId,
        groupName: updatedMatch.groupName,
        matchesPlayed: updatedMatch.matchesPlayed,
        updatedAt: updatedMatch.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating match:', error);
    
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return Response.json({
        error: 'Validation failed',
        details: validationErrors
      }, { status: 400 });
    }

    return Response.json({
      error: 'Failed to update match',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { status: 500 });
  }
}