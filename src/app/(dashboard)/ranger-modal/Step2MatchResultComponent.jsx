import { Trophy, CheckCircle } from "lucide-react";

export default function Step2MatchResultComponent({
  accessGranted,
  buttonsLocked,
  processing,
  uploadProgress,
  slotlistJsonData,
  processResultScreenshots,
  ProgressIndicator
}) {
  return (
    <div className={`card rounded-lg p-4 sm:p-6 shadow-sm border mb-6 ${!accessGranted ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center mb-4">
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Ranger Modal - Step 2: Match Result
        </h2>
        <Trophy className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        {buttonsLocked.result && (
          <span className="ml-2 text-xs px-2 py-1 bg-red-100 text-red-800 rounded">
            Used
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Slotlist Data (from Step 1)
            {slotlistJsonData.hasData && (
              <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded inline-flex items-center">
                <CheckCircle className="w-3 h-3 mr-1" />
                Data Loaded
              </span>
            )}
          </label>
          <div 
            className="w-full px-3 py-2 border rounded-lg text-sm bg-gray-50 dark:bg-gray-800"
            style={{ 
              borderColor: slotlistJsonData.hasData ? '#16a34a' : 'var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            {slotlistJsonData.hasData ? (
              <span className="text-green-600 dark:text-green-400">
                ✓ Loaded: {slotlistJsonData.teamCount} teams, {slotlistJsonData.playerCount} players
              </span>
            ) : (
              <span className="text-gray-500">
                Please generate slotlist data from Step 1 first
              </span>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Match ID
          </label>
          <input
            type="text"
            id="match-id"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
            style={{ 
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              focusRingColor: 'var(--purple-primary)'
            }}
            required
            placeholder="Enter Match ID"
            disabled={!accessGranted || buttonsLocked.result || processing.result}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Matches Played
          </label>
          <input
            type="number"
            id="matches-played"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
            style={{ 
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              focusRingColor: 'var(--purple-primary)'
            }}
            min="1"
            defaultValue="1"
            disabled={!accessGranted || buttonsLocked.result || processing.result}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Group Name
          </label>
          <input
            type="text"
            id="group-name"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200"
            style={{ 
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-color)',
              color: 'var(--text-primary)',
              focusRingColor: 'var(--purple-primary)'
            }}
            defaultValue="G1"
            disabled={!accessGranted || buttonsLocked.result || processing.result}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Upload Match Result Screenshot(s) - Max 10MB each
          </label>
          <input
            type="file"
            id="result-upload"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
            style={{ 
              borderColor: 'var(--border-color)',
              focusRingColor: 'var(--purple-primary)'
            }}
            accept="image/*"
            multiple
            disabled={!accessGranted || buttonsLocked.result || processing.result}
          />

          {/* Progress Indicator for Results */}
          {/* <ProgressIndicator progress={uploadProgress.result} type="result" /> */}

          <button
            className="w-full mt-3 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            style={{ 
              backgroundColor: (accessGranted && !buttonsLocked.result && !processing.result && slotlistJsonData.hasData) ? 'var(--purple-primary)' : '#6b7280',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => {
              if (accessGranted && !buttonsLocked.result && !processing.result && slotlistJsonData.hasData) e.target.style.backgroundColor = 'var(--purple-hover)';
            }}
            onMouseLeave={(e) => {
              if (accessGranted && !buttonsLocked.result && !processing.result && slotlistJsonData.hasData) e.target.style.backgroundColor = 'var(--purple-primary)';
            }}
            onClick={processResultScreenshots}
            disabled={!accessGranted || buttonsLocked.result || processing.result || !slotlistJsonData.hasData}
          >
            {!accessGranted ? 'Access Required - Pay ₹3.00 to Continue' : 
             !slotlistJsonData.hasData ? 'Generate Slotlist Data First' :
             processing.result ? 'Processing Results with AI...' :
             buttonsLocked.result ? 'Feature Used - Reset Access to Use Again' : 
             'Generate Match Result CSV'}
          </button>
        </div>
      </div>
    </div>
  );
}