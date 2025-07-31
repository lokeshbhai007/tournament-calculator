// MatchHistory.js - Updated component
import { useState, useEffect } from 'react';
import { Download, Trash2, Calendar, Trophy, Users, AlertCircle } from 'lucide-react';

export default function MatchHistory() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deletingMatchId, setDeletingMatchId] = useState(null);

  // Fetch match history
  const fetchMatches = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ranger/match-csv-uploader');
      
      if (response.ok) {
        const data = await response.json();
        setMatches(data.matches || []);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to fetch match history');
      }
    } catch (err) {
      console.error('Error fetching matches:', err);
      setError('Failed to load match history');
    } finally {
      setLoading(false);
    }
  };

  // Delete match
  const deleteMatch = async (matchId) => {
    if (!confirm(`Are you sure you want to delete match "${matchId}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeletingMatchId(matchId);
      const response = await fetch(`/api/ranger/match-csv-uploader?matchId=${encodeURIComponent(matchId)}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setMatches(prev => prev.filter(match => match.matchId !== matchId));
        alert('Match deleted successfully');
      } else {
        const errorData = await response.json();
        alert(`Failed to delete match: ${errorData.error}`);
      }
    } catch (err) {
      console.error('Error deleting match:', err);
      alert('Failed to delete match');
    } finally {
      setDeletingMatchId(null);
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--purple-primary)' }}></div>
          <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>Loading match history...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card rounded-lg p-6 shadow-sm border" style={{ backgroundColor: '#fef2f2', borderColor: '#fecaca' }}>
        <div className="flex items-center mb-3">
          <AlertCircle className="w-5 h-5 mr-2" style={{ color: '#dc2626' }} />
          <h3 className="text-lg font-semibold" style={{ color: '#dc2626' }}>
            Error Loading Match History
          </h3>
        </div>
        <p className="text-sm mb-4" style={{ color: '#991b1b' }}>
          {error}
        </p>
        <button
          onClick={fetchMatches}
          className="font-medium py-2 px-4 rounded-lg transition-all duration-200 text-sm"
          style={{ 
            backgroundColor: '#dc2626',
            color: '#ffffff'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#b91c1c'}
          onMouseLeave={(e) => e.target.style.backgroundColor = '#dc2626'}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
          Match History
        </h2>
        <button
          onClick={fetchMatches}
          className="text-sm px-3 py-1 rounded transition-colors"
          style={{ 
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)'
          }}
        >
          Refresh
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="card rounded-lg p-8 shadow-sm border text-center">
          <div className="text-4xl mb-4" style={{ color: 'var(--text-secondary)' }}>📊</div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            No Match Results Yet
          </h3>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your processed match results will appear here after you complete Step 2.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {matches.map((match) => (
            <div
              key={match.id}
              className="card rounded-lg p-4 shadow-sm border hover:shadow-md transition-shadow"
              style={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)' }}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                      {match.matchId}
                    </h3>
                    <span 
                      className="px-2 py-1 text-xs rounded"
                      style={{ 
                        backgroundColor: 'var(--purple-primary)', 
                        color: 'white' 
                      }}
                    >
                      {match.groupName}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                    <div className="flex items-center space-x-2">
                      <Trophy className="w-4 h-4" style={{ color: '#f59e0b' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Winner: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {match.winner || 'N/A'}
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" style={{ color: '#3b82f6' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Teams: <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          {match.totalTeams || 0}
                        </span>
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4" style={{ color: '#10b981' }} />
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {formatDate(match.createdAt)}
                      </span>
                    </div>
                  </div>

                  {match.winnerPoints && (
                    <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                      Winner Points: <span className="font-semibold" style={{ color: '#16a34a' }}>
                        {match.winnerPoints}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {/* Download CSV Button */}
                  <a
                    href={match.csvFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium"
                    style={{ 
                      backgroundColor: '#16a34a',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#15803d'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#16a34a'}
                    title="Download CSV"
                  >
                    <Download className="w-4 h-4" />
                    <span>CSV</span>
                  </a>

                  {/* Delete Button */}
                  <button
                    onClick={() => deleteMatch(match.matchId)}
                    disabled={deletingMatchId === match.matchId}
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ 
                      backgroundColor: '#dc2626',
                      color: 'white'
                    }}
                    onMouseEnter={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#b91c1c')}
                    onMouseLeave={(e) => !e.target.disabled && (e.target.style.backgroundColor = '#dc2626')}
                    title="Delete Match"
                  >
                    {deletingMatchId === match.matchId ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                    <span>{deletingMatchId === match.matchId ? 'Deleting...' : 'Delete'}</span>
                  </button>
                </div>
              </div>

              
            </div>
          ))}
        </div>
      )}

      
    </div>
  );
}