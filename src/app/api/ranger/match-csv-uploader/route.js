// app/api/ranger/match-csv-uploader/route.js
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../auth/[...nextauth]/route";
import MatchResult from "@/models/MatchResult";
import dbConnect from "@/lib/mongodb";

export async function POST(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      matchId,
      groupName,
      matchesPlayed,
      csvData,
      processedResults,
      summary,
      unidentifiedTeams,
      imageProcessingErrors,
      slotlistJsonData,
      resultScreenshotUrls
    } = body;

    // Validate required fields
    if (!matchId || !csvData) {
      return Response.json({ 
        error: 'Missing required fields: matchId and csvData' 
      }, { status: 400 });
    }

    // Connect to MongoDB
    await dbConnect();

    // Check if match ID already exists for this user - FIXED
    const existingMatch = await MatchResult.findOne({ 
      matchId: matchId.trim(), 
      userEmail: session.user.email 
    });
    
    if (existingMatch) {
      return Response.json({ 
        error: `Match ID "${matchId.trim()}" already exists for your account. Please use a unique Match ID.` 
      }, { status: 409 });
    }

    // Upload CSV to Cloudinary
    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    const csvFile = new File([csvBlob], `match_${matchId.trim()}_results.csv`, { type: 'text/csv' });

    // Create FormData for Cloudinary upload
    const formData = new FormData();
    formData.append('file', csvFile);
    formData.append('upload_preset', process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ranger_uploads');
    formData.append('folder', 'ranger-modal/csv-results');
    formData.append('resource_type', 'raw'); // Important for non-image files
    formData.append('public_id', `match_${matchId.trim()}_${Date.now()}`);

    // Upload to Cloudinary
    const cloudinaryResponse = await fetch(
      `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/upload`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!cloudinaryResponse.ok) {
      const errorText = await cloudinaryResponse.text();
      console.error('Cloudinary upload error:', errorText);
      throw new Error('Failed to upload CSV to Cloudinary');
    }

    const cloudinaryData = await cloudinaryResponse.json();

    // Create new match result document
    const matchResult = new MatchResult({
      userEmail: session.user.email,
      matchId: matchId.trim(),
      groupName: groupName || 'G1',
      matchesPlayed: parseInt(matchesPlayed) || 1,
      csvFileUrl: cloudinaryData.secure_url,
      csvCloudinaryPublicId: cloudinaryData.public_id,
      processedResults: processedResults || [],
      summary: summary || {},
      unidentifiedTeams: unidentifiedTeams || [],
      imageProcessingErrors: imageProcessingErrors || [],
      slotlistJsonData: slotlistJsonData || {},
      resultScreenshotUrls: resultScreenshotUrls || []
    });

    // Save to MongoDB
    const savedMatch = await matchResult.save();

    return Response.json({
      success: true,
      message: 'Match result saved successfully',
      matchResult: savedMatch.getSummary ? savedMatch.getSummary() : savedMatch,
      csvUrl: cloudinaryData.secure_url
    }, { status: 201 });

  } catch (error) {
    console.error('CSV upload and save error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      return Response.json({ 
        error: 'Match ID already exists. Please use a unique Match ID.' 
      }, { status: 409 });
    }

    return Response.json({ 
      error: 'Failed to save match result', 
      details: error.message 
    }, { status: 500 });
  }
}

// GET method to retrieve user's match results - FIXED
export async function GET(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Connect to MongoDB
    await dbConnect();

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 10;
    const matchId = searchParams.get('matchId');

    if (matchId) {
      // Get specific match
      const match = await MatchResult.findOne({ 
        matchId: matchId.trim(), 
        userEmail: session.user.email 
      });
      
      if (!match) {
        return Response.json({ error: 'Match not found' }, { status: 404 });
      }

      return Response.json({
        success: true,
        matchResult: match
      });
    } else {
      // Get user's match history - FIXED to use standard Mongoose query
      const matches = await MatchResult.find({ userEmail: session.user.email })
        .sort({ createdAt: -1 })
        .limit(limit)
        .exec();
      
      return Response.json({
        success: true,
        matches: matches.map(match => match.getSummary ? match.getSummary() : match),
        total: matches.length
      });
    }

  } catch (error) {
    console.error('Error fetching match results:', error);
    return Response.json({ 
      error: 'Failed to fetch match results', 
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE method to remove a match result
export async function DELETE(request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const matchId = searchParams.get('matchId');

    if (!matchId) {
      return Response.json({ error: 'Match ID is required' }, { status: 400 });
    }

    // Connect to MongoDB
    await dbConnect();

    // Find and delete the match
    const match = await MatchResult.findOneAndDelete({ 
      matchId: matchId.trim(), 
      userEmail: session.user.email 
    });

    if (!match) {
      return Response.json({ error: 'Match not found' }, { status: 404 });
    }

    // Optionally delete from Cloudinary
    try {
      if (match.csvCloudinaryPublicId) {
        const cloudinaryDeleteResponse = await fetch(
          `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/raw/destroy`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${Buffer.from(`${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`).toString('base64')}`
            },
            body: JSON.stringify({
              public_id: match.csvCloudinaryPublicId
            })
          }
        );
        
        if (!cloudinaryDeleteResponse.ok) {
          console.warn('Failed to delete CSV from Cloudinary:', match.csvCloudinaryPublicId);
        }
      }
    } catch (cloudinaryError) {
      console.warn('Error deleting from Cloudinary:', cloudinaryError);
      // Don't fail the entire operation if Cloudinary deletion fails
    }

    return Response.json({
      success: true,
      message: 'Match result deleted successfully',
      deletedMatch: match.getSummary ? match.getSummary() : match
    });

  } catch (error) {
    console.error('Error deleting match result:', error);
    return Response.json({ 
      error: 'Failed to delete match result', 
      details: error.message 
    }, { status: 500 });
  }
}