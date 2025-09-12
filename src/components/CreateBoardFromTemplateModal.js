'use client';
import { useState, useEffect } from 'react';
import { X, Plus, Users, Building2, Search } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function CreateBoardFromTemplateModal({ 
  template, 
  onClose, 
  onCreated 
}) {
  const [title, setTitle] = useState(template?.title || '');
  const [workspaceId, setWorkspaceId] = useState('');
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get current user and load owned workspaces
  useEffect(() => {
    const loadData = async () => {
      try {
        // Get current user
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          console.error("Error getting user:", userError);
          return;
        }
        setCurrentUser(user);

        // Load workspaces where user is owner
        const { data: workspacesData, error: workspacesError } = await supabase
          .from("workspaces")
          .select("*")
          .eq("user_id", user.id);

        if (workspacesError) throw workspacesError;
        
        setWorkspaces(workspacesData || []);
        // Set default to "No workspace" (null) if no workspaces exist
        setWorkspaceId(null);
      } catch (err) {
        console.error("Error loading data:", err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const canSubmit = title.trim().length > 0;

  const submit = async () => {
    if (!canSubmit || !currentUser) return;
    setSubmitting(true);

    try {
      // Create the board
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .insert([
          {
            title: title.trim(),
            workspace_id: workspaceId || null,
            background_image: template?.img || null,
            user_id: currentUser.id,
            members: [], // Initialize empty members array
          },
        ])
        .select()
        .single();

      if (boardError) throw boardError;

      // Send invitations if members are selected
      if (selectedMembers.length > 0) {
        const invitationsToSend = selectedMembers.map(member => ({
          board_id: boardData.id,
          invited_user_id: member.id,
          invited_by_user_id: currentUser.id,
          role: 'member'
        }));

        const { error: invitationError } = await supabase
          .from("board_invitations")
          .insert(invitationsToSend);

        if (invitationError) {
          console.error("Error sending invitations:", invitationError);
          // Don't fail the board creation if invitations fail
        }
      }

      onCreated(boardData);
      onClose();
    } catch (err) {
      console.error("Error creating board:", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white rounded-lg p-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Create Board from Template</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Template Preview */}
            {template && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <img
                    src={template.img}
                    alt={template.title}
                    className="w-12 h-12 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/48x48?text=Template";
                    }}
                  />
                  <div>
                    <h3 className="font-medium text-gray-900">{template.title}</h3>
                    <p className="text-sm text-gray-500">Template</p>
                  </div>
                </div>
              </div>
            )}

            {/* Board Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Board Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter board title"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                autoFocus
              />
            </div>

            {/* Workspace Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Workspace
              </label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <select
                  value={workspaceId || ''}
                  onChange={(e) => setWorkspaceId(e.target.value === '' ? null : e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
                >
                  <option value="">No workspace</option>
                  {workspaces.map((workspace) => (
                    <option key={workspace.id} value={workspace.id}>
                      {workspace.name}
                    </option>
                  ))}
                </select>
              </div>
              {workspaces.length === 0 && (
                <p className="mt-1 text-sm text-gray-500">
                  No workspaces available. Board will be created without a workspace.
                </p>
              )}
            </div>

            {/* Invite Members */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invite Members
              </label>
              <div className="space-y-2">
                {selectedMembers.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center space-x-2 bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        <span>{member.email}</span>
                        <button
                          onClick={() => setSelectedMembers(prev => 
                            prev.filter(m => m.id !== member.id)
                          )}
                          className="hover:bg-blue-200 rounded-full p-0.5"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex items-center space-x-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add members</span>
                </button>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit || submitting}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center space-x-2"
            >
              {submitting && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              )}
              <span>{submitting ? 'Creating...' : 'Create Board'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invite Members Modal */}
      {showInviteModal && (
        <InviteMembersModal
          selectedMembers={selectedMembers}
          setSelectedMembers={setSelectedMembers}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </div>
  );
}

// Invite Members Modal Component
function InviteMembersModal({ selectedMembers, setSelectedMembers, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        setCurrentUser(user);
      }
    };
    getCurrentUser();
  }, []);

  // Search for users based on email
  const searchUsers = async (query) => {
    if (!query.trim() || !currentUser) return;

    setLoading(true);
    setError("");
    try {
      // Search in profiles table by email
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, username")
        .ilike("email", `%${query}%`)
        .neq("id", currentUser.id) // Exclude current user
        .limit(10);

      if (profilesError) throw profilesError;

      // Filter out already selected members
      const filteredProfiles = (profiles || []).filter(profile => 
        !selectedMembers.some(selected => selected.id === profile.id)
      );

      setSearchResults(filteredProfiles);
    } catch (err) {
      console.error("Error searching users:", err.message);
      setError("Failed to search users");
    } finally {
      setLoading(false);
    }
  };

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim().length > 2) {
      searchUsers(query);
    } else {
      setSearchResults([]);
    }
  };

  // Add member to selection
  const addMember = (member) => {
    setSelectedMembers(prev => [...prev, member]);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Remove member from selection
  const removeMember = (memberId) => {
    setSelectedMembers(prev => prev.filter(m => m.id !== memberId));
  };

  return (
    <div className="fixed inset-0 z-60 animate-fade-in">
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        
        <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Invite Members</h3>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Search Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Search by email
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  placeholder="Enter email address"
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {error && (
                <p className="mt-1 text-sm text-red-600">{error}</p>
              )}
            </div>

            {/* Search Results */}
            {loading && (
              <div className="flex items-center justify-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Search Results</h4>
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{user.email}</p>
                      {user.username && (
                        <p className="text-sm text-gray-500">@{user.username}</p>
                      )}
                    </div>
                    <button
                      onClick={() => addMember(user)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
                    >
                      Add
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Members */}
            {selectedMembers.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-gray-700">Selected Members</h4>
                <div className="space-y-2">
                  {selectedMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 bg-blue-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-blue-900">{member.email}</p>
                        {member.username && (
                          <p className="text-sm text-blue-600">@{member.username}</p>
                        )}
                      </div>
                      <button
                        onClick={() => removeMember(member.id)}
                        className="p-1 hover:bg-blue-100 rounded-full transition-colors duration-200"
                      >
                        <X className="h-4 w-4 text-blue-600" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchQuery.length > 2 && searchResults.length === 0 && !loading && (
              <div className="text-center py-4">
                <p className="text-gray-500">No users found with that email</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
