"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Plus, X, Building2, Trash, Users, RefreshCw } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; // 👈 you need to create this file like I showed before

export default function WorkspacePage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // ✅ Get logged in user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // ✅ Load workspaces from DB - only show workspaces user owns or is a member of
  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      if (!user) {
        setWorkspaces([]);
        return;
      }

      // Get workspaces owned by the user
      const { data: ownedWorkspaces, error: ownedError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("user_id", user.id);

      if (ownedError) {
        console.error("Error loading owned workspaces:", ownedError);
      }

      // Get workspaces where user is a member (accepted invitations)
      let member = [];
      try {
        console.log("Loading member workspaces for user:", user.id);
        
        // First get the workspace IDs from invitations
        const { data: invitations, error: invitationError } = await supabase
          .from("workspace_invitations")
          .select("workspace_id")
          .eq("invited_user_id", user.id)
          .eq("status", "accepted");

        if (invitationError) {
          console.error("Error loading workspace invitations:", invitationError);
          console.error("Error details:", {
            code: invitationError.code,
            message: invitationError.message,
            details: invitationError.details,
            hint: invitationError.hint
          });
        } else if (invitations && invitations.length > 0) {
          console.log("Found invitations:", invitations);
          
          // Get workspace details for each invitation
          const workspaceIds = invitations.map(inv => inv.workspace_id).filter(id => id !== null);
          console.log("Workspace IDs to fetch:", workspaceIds);
          
          if (workspaceIds.length > 0) {
            const { data: memberWorkspaces, error: memberError } = await supabase
              .from("workspaces")
              .select("*")
              .in("id", workspaceIds);

            if (memberError) {
              console.error("Error loading member workspace details:", memberError);
            } else {
              member = memberWorkspaces || [];
              console.log("Loaded member workspaces:", member);
            }
          }
        } else {
          console.log("No accepted invitations found for user");
        }
      } catch (err) {
        console.error("Exception in loadWorkspaces member section:", err);
        member = [];
      }

      // Combine owned and member workspaces, removing duplicates
      const owned = ownedWorkspaces || [];

      // Create a map to avoid duplicates
      const workspaceMap = new Map();
      
      // Add owned workspaces
      owned.forEach(workspace => {
        workspaceMap.set(workspace.id, { ...workspace, userRole: 'owner' });
      });

      // Add member workspaces (only if not already owned)
      member.forEach(workspace => {
        if (!workspaceMap.has(workspace.id)) {
          workspaceMap.set(workspace.id, { ...workspace, userRole: 'member' });
        }
      });

      // Convert map back to array
      const filteredWorkspaces = Array.from(workspaceMap.values());
      setWorkspaces(filteredWorkspaces);

    } catch (err) {
      console.error("Error loading workspaces:", err.message);
      setWorkspaces([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
  }, [user]);

  // Refresh workspaces when the page becomes visible (e.g., after accepting invitations)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        loadWorkspaces();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [user]);

  // ✅ Add workspace to DB
  const addWorkspace = async (workspace) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("workspaces")
        .insert([{ name: workspace.name, user_id: user.id }])
        .select();

      if (error) throw error;

      setWorkspaces((prev) => [...prev, data[0]]);
    } catch (err) {
      console.error("Error creating workspace:", err.message);
    }
  };
  const deleteWorkspace = async (workspaceId) => {
  try {
    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspaceId);

    if (error) throw error;

    setWorkspaces((prev) => prev.filter((w) => w.id !== workspaceId));
  } catch (err) {
    console.error("Error deleting workspace:", err.message);
  }
};

  // ✅ Navigate to workspace boards
  const handleWorkspaceClick = (workspaceId) => {
    router.push(`/workspace/${workspaceId}/boards`);
  };

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center justify-between mb-6 animate-fade-in">
              <h1 className="text-2xl font-bold text-gray-900">Workspaces</h1>
              <div className="flex gap-3">
                <button 
                  onClick={() => loadWorkspaces()}
                  disabled={loading}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
                <button 
                  onClick={() => setShowInviteModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
                >
                  <Users className="h-4 w-4 mr-2" />
                  Invite members to workspace
                </button>
                <button
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  <Plus className="h-4 w-4 mr-2" /> Create workspace
                </button>
              </div>
            </div>

            {loading ? (
              <div className="text-gray-500 animate-fade-in">Loading...</div>
            ) : workspaces.length === 0 ? (
              <div className="text-gray-500 animate-fade-in-up">
                No workspaces found. Create one or wait for an invitation!
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in-up">
                {workspaces.map((workspace, index) => (
  <div
    key={workspace.id}
    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 hover:scale-105 animate-fade-in-up relative cursor-pointer"
    style={{ animationDelay: `${index * 0.1}s` }}
    onClick={() => handleWorkspaceClick(workspace.id)}
  >
    {/* Icon */}
    <div className="w-10 h-10 rounded bg-blue-100 flex items-center justify-center mb-3">
      <Building2 className="h-5 w-5 text-blue-600" />
    </div>

    {/* Title */}
    <div className="font-semibold text-gray-900 mb-1">{workspace.name}</div>
    
    {/* User Role Badge */}
    <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mb-2 ${
      workspace.userRole === 'owner' 
        ? 'bg-blue-100 text-blue-800' 
        : 'bg-green-100 text-green-800'
    }`}>
      {workspace.userRole === 'owner' ? 'Owner' : 'Member'}
    </div>

    {/* 🗑️ Trash delete button - only show for owned workspaces */}
    {workspace.userRole === 'owner' && (
      <button
        onClick={(e) => {
          e.stopPropagation();
          deleteWorkspace(workspace.id);
        }}
        className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded"
      >
        <Trash className="h-4 w-4 text-red-500" />
      </button>
    )}
  </div>
))}
              </div>
            )}
          </div>
        </main>
      </div>
      {showCreate && (
        <CreateWorkspaceModal
          onClose={() => setShowCreate(false)}
          onCreated={addWorkspace}
        />
      )}

      {showInviteModal && (
        <InviteMembersToWorkspaceModal
          workspaces={workspaces.filter(w => w.userRole === 'owner')}
          currentUser={user}
          onClose={() => setShowInviteModal(false)}
        />
      )}
    </>
  );
}

function CreateWorkspaceModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwnerSearch, setIsOwnerSearch] = useState(false);

  const canSubmit = name.trim().length > 0;

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

  // Search for users based on email or username
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsOwnerSearch(false);
      return;
    }

    setLoading(true);
    try {
      // Check if user is searching for themselves
      if (currentUser) {
        const { data: currentUserProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .eq("id", currentUser.id)
          .single();

        if (!profileError && currentUserProfile) {
          const isSearchingSelf = 
            currentUserProfile.username?.toLowerCase().includes(query.toLowerCase()) ||
            currentUserProfile.email?.toLowerCase().includes(query.toLowerCase());
          
          if (isSearchingSelf) {
            setIsOwnerSearch(true);
            setSearchResults([]);
            setLoading(false);
            return;
          }
        }
      }

      setIsOwnerSearch(false);

      // Search for other users - try multiple approaches
      let profiles = [];
      let profilesError = null;

      // First, try to search with both username and email
      const { data: searchResults, error: searchError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (searchError) {
        // If email column doesn't exist, fallback to username only
        if (searchError.code === '42703') {
          const { data: usernameResults, error: usernameError } = await supabase
            .from("profiles")
            .select("id, username")
            .ilike("username", `%${query}%`)
            .limit(10);

          if (!usernameError && usernameResults) {
            profiles = usernameResults.map(p => ({ ...p, email: null }));
          }
        } else {
          // For other errors, try username search only
          const { data: usernameResults, error: usernameError } = await supabase
            .from("profiles")
            .select("id, username")
            .ilike("username", `%${query}%`)
            .limit(10);

          if (!usernameError && usernameResults) {
            profiles = usernameResults.map(p => ({ ...p, email: null }));
          }
        }
      } else if (searchResults) {
        profiles = searchResults;
      }

      // If no results with the OR query, try separate searches
      if (profiles.length === 0) {
        // Try username search
        const { data: usernameResults, error: usernameError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .ilike("username", `%${query}%`)
          .limit(5);

        if (!usernameError && usernameResults) {
          profiles = [...profiles, ...usernameResults];
        }

        // Try email search (if email column exists)
        const { data: emailResults, error: emailError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .ilike("email", `%${query}%`)
          .limit(5);

        if (!emailError && emailResults) {
          // Merge results, avoiding duplicates
          const existingIds = profiles.map(p => p.id);
          const newEmailResults = emailResults.filter(p => !existingIds.includes(p.id));
          profiles = [...profiles, ...newEmailResults];
        }
      }

      setSearchResults(profiles);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserSelect = (user) => {
    if (!selectedMembers.find(member => member.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setError(""); // Clear any previous errors
  };

  const removeSelectedMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== userId));
  };

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError("");

    try {
      // Create the workspace first
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .insert([{ name: name.trim(), user_id: currentUser.id }])
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // Send invitations if members are selected
      if (selectedMembers.length > 0) {
        console.log("Sending invitations to members:", selectedMembers);
        console.log("Workspace data:", workspaceData);
        console.log("Current user:", currentUser);
        
        const invitationsToSend = selectedMembers.map(member => ({
          workspace_id: workspaceData.id,
          invited_user_id: member.id,
          invited_by_user_id: currentUser.id,
          role: 'member',
          status: 'pending'
        }));

        console.log("Invitations to send:", invitationsToSend);

        const { data: invitationData, error: invitationError } = await supabase
          .from("workspace_invitations")
          .insert(invitationsToSend)
          .select();

        console.log("Invitation result:", { data: invitationData, error: invitationError });

        if (invitationError) {
          console.error("Error sending invitations:", invitationError);
          console.error("Error details:", {
            code: invitationError.code,
            message: invitationError.message,
            details: invitationError.details,
            hint: invitationError.hint
          });
          // Don't fail the workspace creation if invitations fail
          setError("Workspace created successfully, but some invitations failed to send. Please run the database setup script to fix the table structure.");
        } else {
          console.log("Invitations sent successfully:", invitationData);
        }
      }

      await onCreated(workspaceData);
      onClose();
    } catch (err) {
      console.error("Error creating workspace:", err.message);
      setError(`Failed to create workspace: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-auto animate-slide-in-right">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create workspace</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Workspace name - Compulsory */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace name <span className="text-red-500">*</span>
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="Enter workspace name"
          />
        </div>

        {/* Invite Members Section */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Invite Members (Optional)
          </label>
          
          {/* Search Input */}
          <div className="relative mb-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError(""); // Clear errors when user starts typing
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search by email or username..."
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Owner Search Message */}
          {isOwnerSearch && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  👑
                </div>
                <div>
                  <div className="font-medium text-blue-900">You are the workspace owner</div>
                  <div className="text-sm text-blue-700">You don't need to invite yourself!</div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !isOwnerSearch && (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto mb-3">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.username}
                      </div>
                      {user.email && (
                        <div className="text-sm text-gray-500">{user.email}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {searchQuery && searchResults.length === 0 && !loading && !isOwnerSearch && (
            <div className="p-4 text-center text-gray-500 mb-3">
              <div className="text-sm">No users found matching "{searchQuery}"</div>
              <div className="text-xs text-gray-400 mt-1">Try searching by username or email</div>
            </div>
          )}

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Selected Members:</h3>
              <div className="space-y-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{member.username}</div>
                      {member.email && (
                        <div className="text-sm text-gray-500">{member.email}</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeSelectedMember(member.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg"
        >
          {submitting ? "Creating..." : `Create${selectedMembers.length > 0 ? ` and Invite ${selectedMembers.length} Member${selectedMembers.length !== 1 ? 's' : ''}` : ''}`}
        </button>
      </div>
    </div>
  );
}

// Invite Members to Workspace Modal Component
function InviteMembersToWorkspaceModal({ workspaces, currentUser, onClose }) {
  const [selectedWorkspace, setSelectedWorkspace] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adding, setAdding] = useState(false);
  const [isOwnerSearch, setIsOwnerSearch] = useState(false);

  // Filter workspaces where current user is owner
  const ownedWorkspaces = workspaces.filter(workspace => 
    currentUser && workspace.user_id === currentUser.id
  );

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        // User is already passed as prop, but we can use this for consistency
      }
    };
    getCurrentUser();
  }, []);

  // Search for users based on email or username
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsOwnerSearch(false);
      return;
    }

    setLoading(true);
    try {
      // Check if user is searching for themselves
      if (currentUser) {
        const { data: currentUserProfile, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .eq("id", currentUser.id)
          .single();

        if (!profileError && currentUserProfile) {
          const isSearchingSelf = 
            currentUserProfile.username?.toLowerCase().includes(query.toLowerCase()) ||
            currentUserProfile.email?.toLowerCase().includes(query.toLowerCase());
          
          if (isSearchingSelf) {
            setIsOwnerSearch(true);
            setSearchResults([]);
            setLoading(false);
            return;
          }
        }
      }

      setIsOwnerSearch(false);

      // Search for other users - try multiple approaches
      let profiles = [];
      let profilesError = null;

      // First, try to search with both username and email
      const { data: searchResults, error: searchError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (searchError) {
        // If email column doesn't exist, fallback to username only
        if (searchError.code === '42703') {
          const { data: usernameResults, error: usernameError } = await supabase
            .from("profiles")
            .select("id, username")
            .ilike("username", `%${query}%`)
            .limit(10);

          if (!usernameError && usernameResults) {
            profiles = usernameResults.map(p => ({ ...p, email: null }));
          }
        } else {
          // For other errors, try username search only
          const { data: usernameResults, error: usernameError } = await supabase
            .from("profiles")
            .select("id, username")
            .ilike("username", `%${query}%`)
            .limit(10);

          if (!usernameError && usernameResults) {
            profiles = usernameResults.map(p => ({ ...p, email: null }));
          }
        }
      } else if (searchResults) {
        profiles = searchResults;
      }

      // If no results with the OR query, try separate searches
      if (profiles.length === 0) {
        // Try username search
        const { data: usernameResults, error: usernameError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .ilike("username", `%${query}%`)
          .limit(5);

        if (!usernameError && usernameResults) {
          profiles = [...profiles, ...usernameResults];
        }

        // Try email search (if email column exists)
        const { data: emailResults, error: emailError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .ilike("email", `%${query}%`)
          .limit(5);

        if (!emailError && emailResults) {
          // Merge results, avoiding duplicates
          const existingIds = profiles.map(p => p.id);
          const newEmailResults = emailResults.filter(p => !existingIds.includes(p.id));
          profiles = [...profiles, ...newEmailResults];
        }
      }

      setSearchResults(profiles);
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleUserSelect = (user) => {
    if (!selectedMembers.find(member => member.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
    }
    setSearchQuery("");
    setSearchResults([]);
    setError(""); // Clear any previous errors
  };

  const removeSelectedMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== userId));
  };

  const addMembersToWorkspace = async () => {
    if (selectedMembers.length === 0 || !selectedWorkspace) return;

    setAdding(true);
    setError("");
    setSuccess("");
    
    try {
      // Get current user to check permissions
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError("You must be logged in to invite members.");
        return;
      }

      // Verify user is the owner of the selected workspace
      if (selectedWorkspace.user_id !== user.id) {
        setError("You can only invite members to workspaces you own.");
        return;
      }

      // Get current workspace data
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", selectedWorkspace.id)
        .single();

      if (workspaceError) {
        setError("Failed to fetch workspace data.");
        return;
      }
      
      // Check for existing invitations
      const { data: existingInvitations, error: invitationsError } = await supabase
        .from("workspace_invitations")
        .select("invited_user_id, status")
        .eq("workspace_id", selectedWorkspace.id)
        .in("invited_user_id", selectedMembers.map(m => m.id));

      if (invitationsError) {
        console.error("Error checking existing invitations:", invitationsError);
        // If table doesn't exist, treat as no existing invitations
        if (invitationsError.code === '42P01') {
          console.log("workspace_invitations table doesn't exist yet. Please run the setup SQL.");
        }
      }

      // Check for pending invitations
      const hasPendingInvitations = selectedMembers.filter(selectedMember => 
        existingInvitations?.some(invitation => 
          invitation.invited_user_id === selectedMember.id && invitation.status === 'pending'
        )
      );

      // Show specific alert for pending invitations
      if (hasPendingInvitations.length > 0) {
        const invitationNames = hasPendingInvitations.map(member => member.username).join(', ');
        setError(`${invitationNames} ${hasPendingInvitations.length === 1 ? 'has' : 'have'} pending invitation${hasPendingInvitations.length === 1 ? '' : 's'} for this workspace.`);
        return;
      }

      // Filter out users who have pending invitations
      const newInvitations = selectedMembers.filter(selectedMember => {
        const hasPendingInvitation = existingInvitations?.some(invitation => 
          invitation.invited_user_id === selectedMember.id && invitation.status === 'pending'
        );
        return !hasPendingInvitation;
      });

      if (newInvitations.length === 0) {
        setError("All selected users have pending invitations for this workspace.");
        return;
      }

      // Create invitation objects
      const invitationsToSend = newInvitations.map(member => ({
        workspace_id: parseInt(selectedWorkspace.id),
        invited_user_id: member.id,
        invited_by_user_id: user.id,
        role: 'member',
        status: 'pending'
      }));

      // Send invitations
      const { data, error } = await supabase
        .from("workspace_invitations")
        .insert(invitationsToSend)
        .select();

      if (error) {
        console.error("Error sending invitations:", error);
        if (error.code === '42P01') {
          setError("The workspace_invitations table doesn't exist. Please run the setup SQL script in your Supabase database first.");
        } else {
          setError(`Failed to send invitations: ${error.message || 'Unknown error occurred'}`);
        }
        return;
      }

      // Success
      setSuccess(`Successfully sent ${invitationsToSend.length} invitation${invitationsToSend.length !== 1 ? 's' : ''} to join "${workspaceData.name}"!`);
      
      // Reset state and close modal after a short delay
      setTimeout(() => {
        setSelectedMembers([]);
        setSearchQuery("");
        setSearchResults([]);
        setSuccess("");
        onClose();
      }, 1500);

    } catch (error) {
      console.error("Error sending invitations:", error);
      setError(`Unexpected error: ${error.message}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Members to Workspace</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Workspace Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Workspace <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedWorkspace?.id || ""}
              onChange={(e) => {
                const workspaceId = e.target.value;
                const workspace = ownedWorkspaces.find(w => w.id.toString() === workspaceId);
                setSelectedWorkspace(workspace || null);
                setError(""); // Clear errors when workspace changes
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a workspace...</option>
              {ownedWorkspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            {ownedWorkspaces.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                You don't own any workspaces yet. Create a workspace first to invite members.
              </p>
            )}
          </div>

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError(""); // Clear errors when user starts typing
              }}
              disabled={!selectedWorkspace}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={selectedWorkspace ? "Search by email or username..." : "Select a workspace first..."}
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Owner Search Message */}
          {isOwnerSearch && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  👑
                </div>
                <div>
                  <div className="font-medium text-blue-900">You are the owner of this workspace</div>
                  <div className="text-sm text-blue-700">You don't need to invite yourself!</div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !isOwnerSearch && selectedWorkspace && (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {user.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {user.username}
                      </div>
                      {user.email && (
                        <div className="text-sm text-gray-500">{user.email}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {searchQuery && searchResults.length === 0 && !loading && !isOwnerSearch && selectedWorkspace && (
            <div className="p-4 text-center text-gray-500">
              <div className="text-sm">No users found matching "{searchQuery}"</div>
              <div className="text-xs text-gray-400 mt-1">Try searching by username or email</div>
            </div>
          )}

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Selected Members:</h3>
              <div className="space-y-2">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900">{member.username}</div>
                      {member.email && (
                        <div className="text-sm text-gray-500">{member.email}</div>
                      )}
                    </div>
                    <button
                      onClick={() => removeSelectedMember(member.id)}
                      className="p-1 hover:bg-red-100 rounded"
                    >
                      <X className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className={`p-3 rounded-lg ${
              error.includes('already a member') 
                ? 'bg-orange-50 border border-orange-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`text-sm ${
                error.includes('already a member') 
                  ? 'text-orange-600' 
                  : 'text-red-600'
              }`}>
                {error.includes('already a member') && (
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span className="font-medium">Member Already Exists</span>
                  </div>
                )}
                {error}
              </div>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-600">{success}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              onClick={addMembersToWorkspace}
              disabled={selectedMembers.length === 0 || !selectedWorkspace || adding}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {adding ? "Sending..." : `Send ${selectedMembers.length} Invitation${selectedMembers.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
