// pages/api/generate-csv.js or app/api/generate-csv/route.js
import mongoose from 'mongoose';
import Transaction from '../../models/Transaction';
import Wallet from '../../models/Wallet';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]'; // Adjust path as needed

const CSV_GENERATION_COST = 3;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get user session
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = session.user.id;
    const { modelType, matchData } = req.body; // Add any additional data needed

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);

    // Find user's wallet
    const wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      return res.status(404).json({ error: 'Wallet not found' });
    }

    // Check if user has sufficient balance
    if (wallet.balance < CSV_GENERATION_COST) {
      return res.status(400).json({ 
        error: 'Insufficient balance', 
        required: CSV_GENERATION_COST,
        current: wallet.balance 
      });
    }

    // Start a MongoDB transaction to ensure data consistency
    const mongoSession = await mongoose.startSession();
    
    try {
      await mongoSession.withTransaction(async () => {
        // Update wallet balance
        const newBalance = wallet.balance - CSV_GENERATION_COST;
        await Wallet.findByIdAndUpdate(
          wallet._id,
          { 
            balance: newBalance,
            totalWithdrawn: wallet.totalWithdrawn + CSV_GENERATION_COST
          },
          { session: mongoSession }
        );

        // Create transaction record
        const transaction = new Transaction({
          userId,
          walletId: wallet._id,
          type: 'debit',
          amount: CSV_GENERATION_COST,
          title: 'CSV Generation',
          description: `Generated match result CSV for ${modelType} model`,
          status: 'completed',
          balanceAfter: newBalance,
        });

        await transaction.save({ session: mongoSession });
      });

      await mongoSession.endSession();

      // Here you would implement your CSV generation logic
      // For example:
      const csvData = generateMatchResultCSV(matchData, modelType);

      // Return success response with CSV data
      res.status(200).json({
        success: true,
        message: 'CSV generated successfully',
        csvData,
        newBalance: wallet.balance - CSV_GENERATION_COST,
        transaction: {
          amount: CSV_GENERATION_COST,
          type: 'debit',
          title: 'CSV Generation',
          description: `Generated match result CSV for ${modelType} model`
        }
      });

    } catch (transactionError) {
      await mongoSession.endSession();
      throw transactionError;
    }

  } catch (error) {
    console.error('CSV Generation Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate CSV', 
      message: error.message 
    });
  }
}

// Helper function to generate CSV (implement according to your needs)
function generateMatchResultCSV(matchData, modelType) {
  // Implement your CSV generation logic here
  // This is just a placeholder
  const headers = ['Match ID', 'Team A', 'Team B', 'Prediction', 'Confidence'];
  const rows = matchData.map(match => [
    match.id,
    match.teamA,
    match.teamB,
    match.prediction,
    match.confidence
  ]);
  
  const csvContent = [headers, ...rows]
    .map(row => row.join(','))
    .join('\n');
    
  return csvContent;
}