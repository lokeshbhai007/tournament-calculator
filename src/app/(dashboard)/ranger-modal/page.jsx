// src/app/RangerModal/page.jsx

"use client"

import { Upload, Trophy, Download } from "lucide-react";

export default function RangerModal() {
  const processCombinedSlotlist = () => {
    // Show loader
    document.getElementById('csv-loader').style.display = 'block';
    document.getElementById('csv-links').style.display = 'block';
    
    // Simulate processing
    setTimeout(() => {
      document.getElementById('csv-loader').style.display = 'none';
      document.getElementById('slot-csv-link').style.display = 'inline-block';
      
      // Create dummy CSV data
      const csvData = "Team,Player,Role\nTeam A,Player1,DPS\nTeam A,Player2,Support\nTeam B,Player3,Tank\nTeam B,Player4,DPS";
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      document.getElementById('slot-csv-link').href = url;
      document.getElementById('slot-csv-link').download = 'slotlist.csv';
    }, 2000);
  };

  const processResultScreenshots = () => {
    // Show loader
    document.getElementById('csv-loader').style.display = 'block';
    document.getElementById('csv-links').style.display = 'block';
    
    // Simulate processing
    setTimeout(() => {
      document.getElementById('csv-loader').style.display = 'none';
      document.getElementById('result-csv-link').style.display = 'inline-block';
      
      // Create dummy result CSV data
      const csvData = "Match,Team,Score,Result\n1,Team A,15,Win\n1,Team B,12,Loss";
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      document.getElementById('result-csv-link').href = url;
      document.getElementById('result-csv-link').download = 'match_results.csv';
    }, 2000);
  };

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
       <div className="max-h-screen overflow-hidden" >
      {/* Header */}
      <div className="py-4">
        <h2 className="text-xl font-bold " style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>Ranger Modal</h2>
      </div>
      </div>
      
      {/* Step 1: Combined Slotlist */}
      <div className="card rounded-lg p-4 sm:p-6 shadow-sm border mb-6">
        <div className="flex items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ranger Modal - Step 1: Combined Slotlist
          </h2>
          <Upload className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Slotlist Poster (Team Names)
            </label>
            <input
              type="file"
              id="slotlist-poster"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
              style={{ 
                borderColor: 'var(--border-color)',
                focusRingColor: 'var(--purple-primary)'
              }}
              accept="image/*"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Slot Screenshots (Player Names)
            </label>
            <input
              type="file"
              id="slot-upload-combined"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
              style={{ 
                borderColor: 'var(--border-color)',
                focusRingColor: 'var(--purple-primary)'
              }}
              accept="image/*"
              multiple
            />
          </div>
          
          <button
            className="w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5"
            style={{ 
              backgroundColor: 'var(--purple-primary)',
              color: '#ffffff'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--purple-hover)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--purple-primary)'}
            onClick={processCombinedSlotlist}
          >
            Generate Final Slotlist CSV
          </button>
        </div>
      </div>

      {/* Step 2: Match Result */}
      <div className="card rounded-lg p-4 sm:p-6 shadow-sm border mb-6">
        <div className="flex items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Ranger Modal - Step 2: Match Result
          </h2>
          <Trophy className="ml-auto w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Slotlist CSV (from Step 1)
            </label>
            <input
              type="file"
              id="slotlist-file"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 transition-colors duration-200 bg-black text-white dark:bg-black dark:text-white file:bg-gray-800 file:border-gray-600 file:text-white file:rounded file:px-3 file:py-1 file:mr-3 file:cursor-pointer hover:file:bg-gray-700"
              style={{ 
                borderColor: 'var(--border-color)',
                focusRingColor: 'var(--purple-primary)'
              }}
              accept=".csv"
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
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
              Upload Match Result Screenshot(s)
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
            />
            <button
              className="w-full mt-3 font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-sm hover:transform hover:-translate-y-0.5"
              style={{ 
                backgroundColor: 'var(--purple-primary)',
                color: '#ffffff'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--purple-hover)'}
              onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--purple-primary)'}
              onClick={processResultScreenshots}
            >
              Generate Match Result CSV
            </button>
          </div>
        </div>
      </div>

      {/* Download Files */}
      <div id="csv-links" className="card rounded-lg p-4 sm:p-6 shadow-sm border" style={{ display: 'none' }}>
        <div className="flex items-center mb-4">
          <h2 className="text-lg sm:text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Download Your Files
          </h2>
          <i className="fas fa-download ml-auto text-lg" style={{ color: 'var(--text-secondary)' }}></i>
        </div>
        
        <div id="csv-loader" className="text-center mb-4" style={{ display: 'none' }}>
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2" style={{ borderColor: 'var(--purple-primary)' }}></div>
          <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Processing...</div>
        </div>
        
        <div className="space-y-3">
          <a
            id="slot-csv-link"
            className="block w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-center text-sm hover:transform hover:-translate-y-0.5"
            style={{ 
              backgroundColor: '#16a34a',
              color: '#ffffff',
              display: 'none'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#15803d'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#16a34a'}
            download
          >
            Download Slotlist CSV
          </a>
          
          <a
            id="result-csv-link"
            className="block w-full font-medium py-2.5 px-4 rounded-lg transition-all duration-200 text-center text-sm hover:transform hover:-translate-y-0.5"
            style={{ 
              backgroundColor: '#2563eb',
              color: '#ffffff',
              display: 'none'
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = '#1d4ed8'}
            onMouseLeave={(e) => e.target.style.backgroundColor = '#2563eb'}
            download
          >
            Download Match Result CSV
          </a>
        </div>
      </div>
    </div>
  );
}