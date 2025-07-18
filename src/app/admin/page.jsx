// app/admin/page.jsx
"use client";
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, Wallet, Eye, Search, AlertCircle } from 'lucide-react';

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/signin');
      return;
    }

    if (!session.user.isAdmin) {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  useEffect(() => {
    if (session?.user?.isAdmin) {
      fetchUsers();
    }
  }, [session]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.username && user.username.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleUserClick = (userId) => {
    router.push(`/admin/${userId}`);
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  if (!session?.user?.isAdmin) {
    return null;
  }

  return (
    <div className="mx-auto px-4 sm:px-6 pt-10 md:pt-0">
      <div className="max-h-screen overflow-hidden">
        {/* Header */}
        <div className="py-4">
          <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Admin Dashboard - User Management
          </h2>
        </div>

        {/* Search Bar */}
        <div className="card rounded-lg p-4 sm:p-6 shadow-sm border mb-6">
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
            <input
              type="text"
              placeholder="Search users by name, email, or username..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              style={{ 
                backgroundColor: 'var(--bg-primary)', 
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <p style={{ color: 'var(--text-secondary)' }}>
              Total Users: {users.length}
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              Filtered: {filteredUsers.length}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="card rounded-lg p-4 shadow-sm border mb-6 bg-red-50 border-red-200">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="card rounded-lg shadow-sm border">
          <div className="p-4 sm:p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
              Registered Users
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <User className="h-12 w-12 mx-auto mb-4" style={{ color: 'var(--text-secondary)' }} />
                    <p style={{ color: 'var(--text-secondary)' }}>
                      {searchTerm ? 'No users found matching your search.' : 'No users registered yet.'}
                    </p>
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => handleUserClick(user._id)}
                      className="user-card p-4 rounded-lg border cursor-pointer hover:shadow-md transition-all duration-200 hover:border-purple-300"
                      style={{ 
                        backgroundColor: 'var(--bg-secondary)', 
                        borderColor: 'var(--border-color)'
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-purple-600" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                {user.name}
                              </h4>
                              {user.isAdmin && (
                                <span className="px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                  Admin
                                </span>
                              )}
                            </div>
                            <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                              {user.email}
                            </p>
                            {user.username && (
                              <p className="text-sm truncate" style={{ color: 'var(--text-secondary)' }}>
                                @{user.username}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="flex items-center space-x-1">
                              <Wallet className="h-4 w-4" style={{ color: 'var(--text-secondary)' }} />
                              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                ₹{user.walletBalance || 0}
                              </span>
                            </div>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              Joined: {new Date(user.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <Eye className="h-5 w-5" style={{ color: 'var(--text-secondary)' }} />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}