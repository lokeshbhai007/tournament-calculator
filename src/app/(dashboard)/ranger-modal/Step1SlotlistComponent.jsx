import { Upload } from "lucide-react";

export default function Step1SlotlistComponent({
  buttonsLocked,
  processing,
  processCombinedSlotlist
}) {
  return (
    <div className="card rounded-lg p-4 sm:p-6 shadow-sm border mb-6">
      <div className="flex items-center mb-4">
        <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Step 1: Slotlist Processing
        </h2>
        <Upload className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        {buttonsLocked.slotlist && (
          <span className="ml-2 text-xs px-2 py-1 bg-green-100 text-green-800 rounded">
            ✓ Complete
          </span>
        )}
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Slotlist Poster (Team Names)
          </label>
          <input
            type="file"
            id="slotlist-poster"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
            style={{ 
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
            accept="image/*"
            disabled={buttonsLocked.slotlist || processing.slotlist}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
            Slot Screenshots (Player Names)
          </label>
          <input
            type="file"
            id="slot-upload-combined"
            className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
            style={{ 
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)'
            }}
            accept="image/*"
            multiple
            disabled={buttonsLocked.slotlist || processing.slotlist}
          />
        </div>
        
        <button
          className="w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          style={{ 
            backgroundColor: (!buttonsLocked.slotlist && !processing.slotlist) ? 'var(--purple-primary)' : '#6b7280',
            color: '#ffffff'
          }}
          onClick={processCombinedSlotlist}
          disabled={buttonsLocked.slotlist || processing.slotlist}
        >
          {processing.slotlist ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processing Images...</span>
            </div>
          ) : buttonsLocked.slotlist ? 
            'Processing Complete ✓' : 
            'Process Slotlist'
          }
        </button>
      </div>
    </div>
  );
}