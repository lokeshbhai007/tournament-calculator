// models/MatchResult.js
import mongoose from 'mongoose';

const MatchResultSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true
  },
  matchId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  groupName: {
    type: String,
    default: 'G1'
  },
  matchesPlayed: {
    type: Number,
    default: 1
  },
  
  // Main match data container
  matchData: {
    processedResults: [{
      teamName: String,
      win: Number,
      matchesPlayed: Number,
      placementPoint: Number,
      finishPoint: Number,
      totalPoint: Number,
      groupName: String,
      slotNumber: String,
      placement: Number,
      players: [String]
    }],
    summary: {
      totalMatches: Number,
      groupName: String,
      teamsProcessed: Number,
      totalTeams: Number,
      winner: String,
      winnerPoints: Number,
      unidentifiedTeams: Number,
      imageProcessingErrors: Number,
      accuracyMetrics: {
        imagesProcessed: Number,
        totalImages: Number,
        teamMatchRate: String
      }
    },
    unidentifiedTeams: [{
      placement: Number,
      players: [String],
      kills: Number
    }],
    imageProcessingErrors: [{
      imageIndex: Number,
      error: String
    }],
    csvData: String // ✅ Add this field for CSV data
  },
  
  // Slotlist data
  slotlistData: {
    teamCount: Number,
    playerCount: Number,
    teams: [{
      name: String,
      slot: String,
      players: [String]
    }]
  },
  
  // Processing metadata
  processingMetadata: {
    resultScreenshotUrls: [String],
    cloudinaryUrls: [String],
    processingTime: Date,
    apiVersion: String
  },
  
  // Legacy fields (if you need backward compatibility)
  csvFileUrl: String,
  csvCloudinaryPublicId: String,
  resultScreenshotUrls: [String],
  
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound indexes for efficient queries
MatchResultSchema.index({ userEmail: 1, createdAt: -1 });
MatchResultSchema.index({ matchId: 1, userEmail: 1 });

// Pre-save middleware to update updatedAt
MatchResultSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Static method to find user's match results
MatchResultSchema.statics.findByUserEmail = function(email, limit = 10) {
  return this.find({ userEmail: email })
    .sort({ createdAt: -1 })
    .limit(limit)
    .select('-slotlistData -matchData.processedResults.players'); // Exclude large fields for list view
};

// Static method to check if match ID exists for user
MatchResultSchema.statics.checkMatchIdExists = function(matchId, userEmail) {
  return this.findOne({ matchId, userEmail });
};

// Static method for user statistics
MatchResultSchema.statics.getUserStats = function(userEmail) {
  return this.aggregate([
    { $match: { userEmail } },
    {
      $group: {
        _id: '$userEmail',
        totalMatches: { $sum: 1 },
        totalTeamsProcessed: { $sum: '$matchData.summary.teamsProcessed' },
        groups: { $addToSet: '$groupName' },
        lastMatchDate: { $max: '$createdAt' }
      }
    },
    {
      $addFields: {
        averageTeamsPerMatch: {
          $cond: {
            if: { $gt: ['$totalMatches', 0] },
            then: { $divide: ['$totalTeamsProcessed', '$totalMatches'] },
            else: 0
          }
        }
      }
    }
  ]);
};

// Instance method to get summary info
MatchResultSchema.methods.getSummary = function() {
  return {
    id: this._id,
    matchId: this.matchId,
    groupName: this.groupName,
    matchesPlayed: this.matchesPlayed,
    winner: this.matchData?.summary?.winner,
    winnerPoints: this.matchData?.summary?.winnerPoints,
    totalTeams: this.matchData?.summary?.totalTeams,
    hasCsvData: !!this.matchData?.csvData,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt
  };
};

export default mongoose.models.MatchResult || mongoose.model('MatchResult', MatchResultSchema);