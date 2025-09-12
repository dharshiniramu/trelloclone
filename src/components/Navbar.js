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
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [hasUnviewedNotifications, setHasUnviewedNotifications] = useState(false);

  // Load user + profile
  const loadUserAndProfile = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const user = session?.user;
    if (!user) {
      setCurrentUser(null);
      setNotificationCount(0);
      setHasUnviewedNotifications(false);
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

    // Fetch notification count
    await fetchNotificationCount(user.id);
  }, []);

  // Fetch pending invitations count
  const fetchNotificationCount = useCallback(async (userId) => {
    try {
      // Check if user has viewed notifications recently (within last 5 minutes)
      const lastViewed = localStorage.getItem(`notifications_viewed_${userId}`);
      const now = new Date().getTime();
      const fiveMinutesAgo = now - (5 * 60 * 1000);
      const hasViewedRecently = lastViewed && parseInt(lastViewed) > fiveMinutesAgo;

      // Fetch board invitations
      const { data: boardInvitations, error: boardError } = await supabase
        .from("board_invitations")
        .select("id, created_at")
        .eq("invited_user_id", userId)
        .eq("status", "pending");

      // Fetch workspace invitations
      const { data: workspaceInvitations, error: workspaceError } = await supabase
        .from("workspace_invitations")
        .select("id, created_at")
        .eq("invited_user_id", userId)
        .eq("status", "pending");

      if (boardError || workspaceError) {
        console.error("Error fetching notifications:", boardError || workspaceError);
        return;
      }

      const totalCount = (boardInvitations?.length || 0) + (workspaceInvitations?.length || 0);
      setNotificationCount(totalCount);

      // Check if there are unviewed notifications
      if (totalCount > 0) {
        if (!hasViewedRecently) {
          setHasUnviewedNotifications(true);
        } else {
          // Check if there are new notifications since last view
          const lastViewedTime = lastViewed ? new Date(parseInt(lastViewed)) : new Date(0);
          const hasNewNotifications = [
            ...(boardInvitations || []),
            ...(workspaceInvitations || [])
          ].some(invitation => new Date(invitation.created_at) > lastViewedTime);
          
          setHasUnviewedNotifications(hasNewNotifications);
        }
      } else {
        setHasUnviewedNotifications(false);
      }
    } catch (error) {
      console.error("Error fetching notification count:", error);
    }
  }, []);

  // Mark notifications as viewed
  const markNotificationsAsViewed = useCallback(() => {
    if (currentUser?.id) {
      localStorage.setItem(`notifications_viewed_${currentUser.id}`, new Date().getTime().toString());
      setHasUnviewedNotifications(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    // Initial fetch
    loadUserAndProfile();

    // React to auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      if (!user) {
        setCurrentUser(null);
        setIsAccountDropdownOpen(false);
        setNotificationCount(0);
        setHasUnviewedNotifications(false);
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

  // Refresh notification count periodically and on page focus
  useEffect(() => {
    if (!currentUser?.id) return;

    const refreshNotifications = () => {
      fetchNotificationCount(currentUser.id);
    };

    // Refresh every 30 seconds
    const interval = setInterval(refreshNotifications, 30000);

    // Refresh when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshNotifications();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.id, fetchNotificationCount]);

  // Search functionality
  const searchBoardsAndWorkspaces = useCallback(async (query) => {
    if (!query.trim() || !currentUser) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setIsSearching(true);
    try {
      // Search for boards where user is owner or member
      const { data: ownedBoards, error: ownedError } = await supabase
        .from("boards")
        .select("id, title, background_image, user_id")
        .eq("user_id", currentUser.id)
        .ilike("title", `%${query}%`);

      if (ownedError) throw ownedError;

      // Search for boards where user is a member
      const { data: allBoards, error: allBoardsError } = await supabase
        .from("boards")
        .select("id, title, background_image, user_id, members")
        .ilike("title", `%${query}%`);

      if (allBoardsError) throw allBoardsError;

      // Filter member boards
      const memberBoards = allBoards?.filter(board => {
        if (board.user_id === currentUser.id) return false; // Skip owned boards
        const members = board.members || [];
        return members.some(member => member.user_id === currentUser.id);
      }) || [];

      // Combine and format results
      const allResults = [...(ownedBoards || []), ...memberBoards].map(board => ({
        id: board.id,
        title: board.title,
        type: 'board',
        background_image: board.background_image,
        isOwner: board.user_id === currentUser.id
      }));

      // Search for workspaces - filter by user ownership
      try {
        const { data: workspaces, error: workspacesError } = await supabase
          .from("workspaces")
          .select("id, name, user_id")
          .eq("user_id", currentUser.id)
          .ilike("name", `%${query}%`);

        if (!workspacesError && workspaces && workspaces.length > 0) {
          const workspaceResults = workspaces.map(workspace => ({
            id: workspace.id,
            title: workspace.name,
            type: 'workspace',
            description: 'Workspace'
          }));
          allResults.push(...workspaceResults);
        }
      } catch (workspaceError) {
        console.log('Workspace search error:', workspaceError.message);
      }

      console.log('Search results:', allResults);
      setSearchResults(allResults);
      setShowSearchResults(true);
    } catch (error) {
      console.error('Search error:', error.message);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [currentUser]);

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchBoardsAndWorkspaces(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchBoardsAndWorkspaces]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchResults.length > 0) {
      // Navigate to first result
      const firstResult = searchResults[0];
      if (firstResult.type === 'board') {
        router.push(`/board/${firstResult.id}`);
      } else if (firstResult.type === 'workspace') {
        router.push(`/workspace`);
      }
      setShowSearchResults(false);
      setSearchQuery('');
    }
  };

  const handleResultClick = (result) => {
    if (result.type === 'board') {
      router.push(`/board/${result.id}`);
    } else if (result.type === 'workspace') {
      router.push(`/workspace`);
    }
    setShowSearchResults(false);
    setSearchQuery('');
  };

  const handleSearchInputChange = (e) => {
    setSearchQuery(e.target.value);
    if (e.target.value.trim()) {
      setShowSearchResults(true);
    } else {
      setShowSearchResults(false);
    }
  };

  // Handle notification bell click
  const handleNotificationClick = () => {
    markNotificationsAsViewed();
    router.push('/');
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
                  onChange={handleSearchInputChange}
                  placeholder="Search boards or workspaces"
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:bg-white focus:bg-white"
                />
                {isSearching && (
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </form>

              {/* Search Results Dropdown */}
              {showSearchResults && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto">
                  {searchResults.length > 0 ? (
                    <div className="py-2">
                      {searchResults.map((result, index) => (
                        <button
                          key={`${result.type}-${result.id}`}
                          onClick={() => handleResultClick(result)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors duration-200 border-b border-gray-100 last:border-b-0"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="flex-shrink-0">
                              {result.type === 'board' ? (
                                <div 
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-semibold"
                                  style={{
                                    backgroundColor: result.background_image ? 'transparent' : '#3B82F6',
                                    backgroundImage: result.background_image ? `url(${result.background_image})` : 'none',
                                    backgroundSize: 'cover',
                                    backgroundPosition: 'center'
                                  }}
                                >
                                  {!result.background_image && 'B'}
                                </div>
                              ) : (
                                <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center text-white text-sm font-semibold">
                                  W
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {result.title}
                                </p>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                  result.type === 'board' 
                                    ? 'bg-blue-100 text-blue-800' 
                                    : 'bg-green-100 text-green-800'
                                }`}>
                                  {result.type === 'board' ? 'Board' : 'Workspace'}
                                </span>
                                {result.type === 'board' && result.isOwner && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                    Owner
                                  </span>
                                )}
                              </div>
                              {result.description && (
                                <p className="text-xs text-gray-500 truncate mt-1">
                                  {result.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <Search className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No results found for "{searchQuery}"</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right - Menu Options */}
            <div className="flex items-center space-x-4">
              <Link 
                href="/how-to-use" 
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
              >
                How to use
              </Link>

              <button 
                onClick={handleNotificationClick}
                className="relative text-gray-600 hover:text-gray-900 p-2 rounded-md transition-all duration-200 hover:bg-gray-50 hover:shadow-sm"
              >
                <Bell className="h-5 w-5" />
                {hasUnviewedNotifications && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white animate-pulse"></span>
                )}
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
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

        {(isAccountDropdownOpen || showSearchResults) && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => {
              setIsAccountDropdownOpen(false);
              setShowSearchResults(false);
            }}
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
