'use client';
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, ChevronDown, Edit, HelpCircle, Plus, LogOut, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function Navbar() {
  const router = useRouter();
  const [isAccountDropdownOpen, setIsAccountDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editingUsername, setEditingUsername] = useState('');

  // Load user + profile
  const loadUserAndProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setCurrentUser(null);
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single();

    if (profileErr && profileErr.code !== 'PGRST116') {
      // PGRST116 = No rows found; ignore and fall back to email/Account
      console.error(profileErr.message);
    }

    setCurrentUser({
      id: user.id,
      email: user.email ?? '',
      name: profile?.username || 'Account',
    });
  }, []);

  useEffect(() => {
    // Initial fetch
    loadUserAndProfile();

    // React to auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) {
        setCurrentUser(null);
        setIsAccountDropdownOpen(false);
        // Ensure guest landing after logout from anywhere
        router.push('/');
        router.refresh();
        return;
      }
      // When logged in, refresh profile
      loadUserAndProfile();
    });

    return () => subscription.unsubscribe();
  }, [loadUserAndProfile, router]);

  const handleSearch = (e) => {
    e.preventDefault();
    console.log('Searching for:', searchQuery);
  };

  // Logout -> clear state -> go to GuestLanding
  const handleLogout = async () => {
  await supabase.auth.signOut();
  setCurrentUser(null);
  setIsAccountDropdownOpen(false);
  router.push('/');
  window.location.href = '/'; // 👈 Force full reload to guest landing page
};

  const handleEditProfile = () => {
    setEditingUsername(currentUser?.name || '');
    setShowProfileModal(true);
    setIsAccountDropdownOpen(false);
  };

  // Save/Upsert username in profiles
  const handleSaveProfile = async () => {
    const newName = editingUsername.trim();
    if (!newName || newName === currentUser?.name || !currentUser?.id) return;

    const { error } = await supabase
      .from('profiles')
      .upsert([{ id: currentUser.id, username: newName }], { onConflict: 'id' });

    if (error) {
      console.error('Failed to update profile:', error.message);
      return;
    }

    setCurrentUser(prev => prev ? ({ ...prev, name: newName }) : prev);
    setShowProfileModal(false);
  };

  const displayName = currentUser?.name || 'Account';
  const displayEmail = currentUser?.email || '';
  const avatarInitial = (currentUser?.name || currentUser?.email || 'A').charAt(0).toUpperCase();

  return (
    <>
      <nav className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-50 animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left - Logo */}
            <div className="flex items-center">
              <Link href="/" className="flex items-center space-x-2 hover:scale-105 transition-transform duration-200">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">T</span>
                </div>
                <span className="text-xl font-bold text-gray-900">TrelloClone</span>
              </Link>
            </div>

            {/* Center - Search Bar */}
            <div className="flex-1 max-w-2xl mx-8">
              <form onSubmit={handleSearch} className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search boards, cards, or members..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-white focus:bg-white"
                />
              </form>
            </div>

            {/* Right - Menu Options */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/how-to-use" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
              >
                How to use
              </Link>

              <button className="relative text-gray-600 hover:text-gray-900 p-2 rounded-md transition-all duration-200 hover:bg-gray-50 hover:shadow-sm">
                <Bell className="h-5 w-5" />
                <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-400 ring-2 ring-white animate-pulse"></span>
              </button>

              {/* Account Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsAccountDropdownOpen(!isAccountDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center hover:scale-105 transition-transform duration-200">
                    <span className="h-4 w-4 text-blue-600 font-semibold">{avatarInitial}</span>
                  </div>
                  <span>{displayName}</span>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isAccountDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className={`absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50 transition-all duration-200 ${
                  isAccountDropdownOpen 
                    ? 'opacity-100 transform translate-y-0' 
                    : 'opacity-0 transform -translate-y-2 pointer-events-none'
                }`}>
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{displayName}</p>
                    {displayEmail && <p className="text-sm text-gray-500">{displayEmail}</p>}
                  </div>
                  
                  {currentUser ? (
                    <>
                      <button 
                        onClick={handleEditProfile}
                        className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:text-blue-600"
                      >
                        <Edit className="h-4 w-4 mr-3 text-gray-400" />
                        Edit Profile
                      </button>
                      <Link 
                        href="/help" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:text-blue-600"
                      >
                        <HelpCircle className="h-4 w-4 mr-3 text-gray-400" />
                        Help
                      </Link>
                      <Link 
                        href="/workspace" 
                        className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:text-blue-600"
                      >
                        <Plus className="h-4 w-4 mr-3 text-gray-400" />
                        Create Workspace
                      </Link>
                      
                      <div className="border-t border-gray-100 my-1"></div>
                      <button
                        onClick={handleLogout}
                        className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-all duration-200 hover:bg-red-100"
                      >
                        <LogOut className="h-4 w-4 mr-3" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:text-blue-600">Sign in</Link>
                      <Link href="/signup" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-all duration-200 hover:text-blue-600">Create account</Link>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {isAccountDropdownOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsAccountDropdownOpen(false)}
          />
        )}
      </nav>

      {/* Profile Edit Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Edit Profile</h2>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <div className="p-6">
              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={editingUsername}
                  onChange={(e) => setEditingUsername(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your username"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={displayEmail}
                  disabled
                  className="w-full p-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={!editingUsername.trim() || editingUsername === currentUser?.name}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
