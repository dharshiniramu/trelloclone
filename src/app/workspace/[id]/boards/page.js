"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Plus, FolderOpen, Layout, Trash, X, ArrowLeft, Users, LogOut } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

// ✅ Categories with 4 sample images each
const TEMPLATE_CATEGORIES = {
  personal: {
    label: "Personal",
    images: [
      "/ptemp1.jpg",
      "/ptemp2.png",
      "/ptemp3.jpg",
      "/ptemp4.jpg",
    ],
  },
  productivity: {
    label: "Productivity",
    images: [
      "/prtemp1.jpg",
      "/prtemp2.jpg",
      "/prtemp3.jpg",
      "/prtemp4.avif",
    ],
  },
  product_management: {
    label: "Product Management",
    images: [
      "/prmtemp1.png",
      "/prmtemp2.jpg",
      "/prmtemp3.jpeg",
      "/prmtemp4.avif",
    ],
  },
  project_management: {
    label: "Project Management",
    images: [
      "/pmtemp1.jpg",
      "/pmtemp2.jpg",
      "/pmtemp3.jpg",
      "/pmtemp4.jpg",
    ],
  },
};

export default function WorkspaceBoardsPage() {
  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <WorkspaceBoardsContent />
        </main>
      </div>
    </>
  );
}

function WorkspaceBoardsContent() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.id;
  
  const [boards, setBoards] = useState([]);
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showExistingMembersModal, setShowExistingMembersModal] = useState(false);
  const [showInviteWorkspaceModal, setShowInviteWorkspaceModal] = useState(false);
  const [user, setUser] = useState(null);
  const [isWorkspaceOwner, setIsWorkspaceOwner] = useState(false);
  const [workspaceOwner, setWorkspaceOwner] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loadingWorkspaceMembers, setLoadingWorkspaceMembers] = useState(false);

  // ✅ Get current user
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // ✅ Load workspace and its boards
  const load = async () => {
    setLoading(true);
    try {
      // Load workspace details
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("*")
        .eq("id", workspaceId)
        .single();

      if (workspaceError) throw workspaceError;
      setWorkspace(workspaceData);

      // Check if current user is the workspace owner
      if (user && workspaceData) {
        setIsWorkspaceOwner(user.id === workspaceData.user_id);
      }

      // Load boards for this workspace where user is a member
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (boardsError) throw boardsError;

      // Filter boards where user is owner or member
      const userBoards = (boardsData || []).filter(board => {
        // Check if user is the board creator (owner)
        if (board.user_id === user.id) {
          return true;
        }

        // Check if user is in the members array
        if (board.members && Array.isArray(board.members)) {
          return board.members.some(member => 
            member.user_id === user.id && 
            (member.role === 'owner' || member.role === 'admin' || member.role === 'member')
          );
        }

        return false;
      });

      setBoards(userBoards);
    } catch (err) {
      console.error("Error loading workspace boards:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load workspace members
  const loadWorkspaceMembers = async () => {
    if (!workspaceId) return;
    
    setLoadingWorkspaceMembers(true);
    try {
      // Get workspace owner
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("user_id")
        .eq("id", workspaceId)
        .single();

      if (workspaceError) throw workspaceError;

      // Get workspace owner profile
      const { data: ownerProfile, error: ownerError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .eq("id", workspaceData.user_id)
        .single();

      if (ownerError) throw ownerError;

      setWorkspaceOwner(ownerProfile);

      // Get accepted workspace members (excluding owner)
      const { data: invitations, error: invitationError } = await supabase
        .from("workspace_invitations")
        .select("invited_user_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "accepted");

      if (invitationError) {
        console.error("Error loading workspace invitations:", invitationError);
        setWorkspaceMembers([]);
        return;
      }

      if (invitations && invitations.length > 0) {
        const userIds = invitations.map(inv => inv.invited_user_id);
        const { data: memberProfiles, error: membersError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", userIds);

        if (membersError) {
          console.error("Error loading member profiles:", membersError);
          setWorkspaceMembers([]);
        } else {
          setWorkspaceMembers(memberProfiles || []);
        }
      } else {
        setWorkspaceMembers([]);
      }
    } catch (error) {
      console.error("Error loading workspace members:", error);
      setWorkspaceMembers([]);
    } finally {
      setLoadingWorkspaceMembers(false);
    }
  };

  // Remove member from workspace
  const removeMemberFromWorkspace = async (memberId) => {
    if (!isWorkspaceOwner) return;


    try {
      // First, check if the invitation exists and get details
      const { data: existingInvitation, error: checkError } = await supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("invited_user_id", memberId);

      if (checkError) {
        console.error("Error checking existing invitation:", checkError);
      } else {
        if (existingInvitation && existingInvitation.length > 0) {
        }
      }

      // Use status update approach instead of deletion (same as leave workspace)
      let statusUpdateSuccessful = false;

      if (existingInvitation && existingInvitation.length > 0) {
        const invitationId = existingInvitation[0].id;
        
        // Try different status update methods
        const statusOptions = ['removed', 'declined', 'cancelled', 'left'];
        
        for (const status of statusOptions) {
          const { error: updateError } = await supabase
            .from("workspace_invitations")
            .update({ status: status })
            .eq("id", invitationId);

          if (!updateError) {
            statusUpdateSuccessful = true;
            break;
          }
        }

        // If status updates also fail, try updating by workspace_id and user_id
        if (!statusUpdateSuccessful) {
          console.log("Status update by ID failed, trying by workspace_id and user_id...");
          
          for (const status of statusOptions) {
            console.log(`Attempting to update member status to: ${status} (by workspace_id and user_id)`);
            
            const { error: updateError } = await supabase
              .from("workspace_invitations")
              .update({ status: status })
              .eq("workspace_id", workspaceId)
              .eq("invited_user_id", memberId);

            if (updateError) {
              console.log(`Status '${status}' not available (by workspace_id and user_id), trying next option...`);
            } else {
              console.log(`Successfully updated member status to: ${status} (by workspace_id and user_id)`);
              statusUpdateSuccessful = true;
              break;
            }
          }
        }
      }

      if (!statusUpdateSuccessful) {
        console.error("All member status update methods failed");
        // Don't return here - continue with board cleanup
      } else {
        console.log("Successfully updated member invitation status");
      }

      // Verify the member invitation status was updated
      const { data: verifyMemberInvitation, error: verifyError } = await supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("invited_user_id", memberId);

      if (verifyError) {
        console.error("Error verifying member invitation status:", verifyError);
      } else {
        console.log("Verification - current member invitation status:", verifyMemberInvitation);
        if (verifyMemberInvitation && verifyMemberInvitation.length > 0) {
          const currentStatus = verifyMemberInvitation[0].status;
          console.log("Current member invitation status:", currentStatus);
          
          // Check if status was successfully updated to something other than 'accepted'
          if (currentStatus === 'accepted') {
            console.error("WARNING: Member invitation status is still 'accepted'!");
            console.log("This means the status update failed. The member will still see the workspace.");
            console.log("Available member invitation fields:", verifyMemberInvitation[0]);
          } else {
            console.log("SUCCESS: Member invitation status updated to:", currentStatus);
            console.log("The member should no longer see this workspace in their workspace list.");
          }
        } else {
          console.log("Verification successful - member invitation no longer exists (deleted)");
        }
      }

      // Update local state immediately
      setWorkspaceMembers(prev => {
        const filtered = prev.filter(member => member.id !== memberId);
        console.log("Updated workspace members after filtering:", filtered);
        return filtered;
      });
      
      // Also remove from any boards in this workspace
      const { data: boards, error: boardsError } = await supabase
        .from("boards")
        .select("id")
        .eq("workspace_id", workspaceId);

      if (!boardsError && boards && boards.length > 0) {
        console.log("Removing member from", boards.length, "boards");
        const boardIds = boards.map(b => b.id);
        
        // Remove from board invitations
        const { error: boardInviteError } = await supabase
        .from("board_invitations")
        .delete()
        .eq("invited_user_id", memberId)
          .in("board_id", boardIds);

        if (boardInviteError) {
          console.error("Error removing board invitations:", boardInviteError);
        } else {
          console.log("Successfully removed board invitations");
        }

        // Remove from board members
        for (const boardId of boardIds) {
          const { data: boardData, error: boardError } = await supabase
            .from("boards")
            .select("members")
            .eq("id", boardId)
            .single();

          if (!boardError && boardData && boardData.members) {
            const updatedMembers = boardData.members.filter(
              member => member.user_id !== memberId
            );
            
            const { error: updateError } = await supabase
              .from("boards")
              .update({ members: updatedMembers })
              .eq("id", boardId);

            if (updateError) {
              console.error("Error updating board members for board", boardId, ":", updateError);
            } else {
              console.log("Successfully updated board members for board", boardId);
            }
          }
        }
      }

    } catch (error) {
      console.error("Error removing member:", error);
    }
  };

  useEffect(() => {
    if (workspaceId && user) {
      load();
      loadWorkspaceMembers();
    }
  }, [workspaceId, user]);

  // Refresh workspace data when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      if (workspaceId && user) {
        load();
        loadWorkspaceMembers();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [workspaceId, user]);

  const addBoard = (board) => {
    setBoards((prev) => [...prev, board]);
  };

  // ✅ Navigation
  const handleBoardClick = (boardId) => {
    if (!boardId) return;
    router.push(`/board/${boardId}`);
  };

  const handleBackToWorkspaces = () => {
    router.push("/workspace");
  };

  // ✅ Delete
  const deleteBoard = async (boardId) => {
    try {
      const { error } = await supabase.from("boards").delete().eq("id", boardId);
      if (error) throw error;
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch (err) {
      console.error("Error deleting board:", err.message);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-gray-500 animate-fade-in">Loading...</div>
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-red-500 animate-fade-in">Workspace not found</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header with back button and workspace name */}
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div className="flex items-center gap-4">
        <button
          onClick={handleBackToWorkspaces}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
            <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
              {isWorkspaceOwner && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Owner
                </span>
              )}
            </div>
          <p className="text-gray-500">Boards in this workspace</p>
        </div>
      </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-3">
          <button
            onClick={() => { load(); loadWorkspaceMembers(); }}
            disabled={loading}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
          {/* Only show invite workspace button for owners */}
          {isWorkspaceOwner && (
          <button
            onClick={() => setShowInviteWorkspaceModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
          >
            <Users className="h-4 w-4 mr-2" />
            Invite Members to Workspace
          </button>
          )}
          <button
            onClick={() => setShowExistingMembersModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-md"
          >
            <Users className="h-4 w-4 mr-2" />
            Existing Members
          </button>
        </div>
      </div>

       {/* Only show action buttons if user is workspace owner */}
       {isWorkspaceOwner && (
       <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-3">
           <button 
             onClick={() => setShowInviteModal(true)}
             className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
           >
             <Users className="h-4 w-4 mr-2" />
             Invite Members to Boards
           </button>
           <button
             onClick={() => setShowCreate(true)}
             className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
           >
             <Plus className="h-4 w-4 mr-2" /> Create board
           </button>
         </div>
       </div>
       )}


      {boards.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center animate-fade-in-up">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
            <FolderOpen className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-1">
            No boards in this workspace
          </p>
          <p className="text-gray-500 mb-6">
            {isWorkspaceOwner 
              ? "Create your first board to start organizing tasks in this workspace."
              : "This workspace doesn't have any boards yet."
            }
          </p>
          {isWorkspaceOwner && (
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" /> Create board
          </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in-up">
          {boards.map((b, index) => (
            <div
              key={b.id}
              className="relative bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:scale-105 animate-fade-in-up cursor-pointer"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => handleBoardClick(b.id)}
            >
              {/* Background Image */}
              {b.background_image ? (
                <div
                  className="h-24 w-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${b.background_image})` }}
                />
              ) : (
                <div className="h-24 w-full bg-yellow-200" />
              )}

              <div className="p-4">
                <div className="font-semibold text-gray-900">{b.title}</div>
                <div className="text-sm text-gray-500 mt-1">
                  {workspace.name}
                </div>
              </div>

              {/* Trash delete button - only show for board owners */}
              {user && b.user_id === user.id && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBoard(b.id);
                }}
                className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-red-100 rounded"
              >
                <Trash className="h-4 w-4 text-red-500" />
              </button>
              )}
            </div>
          ))}
        </div>
      )}

       {showCreate && isWorkspaceOwner && (
         <CreateBoardModal
           workspaceId={workspaceId}
           workspaceName={workspace.name}
           userId={user?.id}
           onClose={() => setShowCreate(false)}
           onCreated={addBoard}
           workspaceMembers={workspaceMembers}
         />
       )}

       {showInviteModal && isWorkspaceOwner && (
         <InviteMembersToBoardModal
           boards={boards}
           currentUser={user}
           workspaceId={workspaceId}
           onClose={() => setShowInviteModal(false)}
         />
       )}

       {showExistingMembersModal && (
         <ExistingMembersModal
           key={`${workspaceMembers.length}-${workspaceOwner?.id}`}
           workspaceOwner={workspaceOwner}
           workspaceMembers={workspaceMembers}
           isWorkspaceOwner={isWorkspaceOwner}
           onClose={() => setShowExistingMembersModal(false)}
           onRemoveMember={removeMemberFromWorkspace}
           workspaceId={workspaceId}
           currentUser={user}
         />
       )}

       {showInviteWorkspaceModal && (
         <InviteMembersToWorkspaceModal
           workspaceId={workspaceId}
           workspaceName={workspace.name}
           currentUser={user}
           onClose={() => setShowInviteWorkspaceModal(false)}
           onInviteSent={() => {
             setShowInviteWorkspaceModal(false);
             loadWorkspaceMembers(); // Refresh the members list
           }}
         />
       )}
     </div>
   );
 }

// Invite Members to Workspace Modal Component
function InviteMembersToWorkspaceModal({ workspaceId, workspaceName, currentUser, onClose, onInviteSent }) {
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Search for users
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // Check if user is searching for themselves
      if (currentUser) {
        const isSearchingSelf = 
          currentUser.username?.toLowerCase().includes(query.toLowerCase()) ||
          currentUser.email?.toLowerCase().includes(query.toLowerCase());
        
        if (isSearchingSelf) {
          setSearchResults([]);
          setLoading(false);
          return;
        }
      }

      const { data: users, error: searchError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (searchError) {
        console.error("Error searching users:", searchError);
        setSearchResults([]);
      } else {
        setSearchResults(users || []);
      }
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
    setError("");
  };

  const removeSelectedMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== userId));
  };

  const submit = async () => {
    if (selectedMembers.length === 0) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      // Check for existing invitations first
      const { data: existingInvitations, error: checkError } = await supabase
        .from("workspace_invitations")
        .select("invited_user_id, status")
        .eq("workspace_id", workspaceId)
        .in("invited_user_id", selectedMembers.map(m => m.id));

      if (checkError) {
        console.error("Error checking existing invitations:", checkError);
        setError("Failed to check existing invitations. Please try again.");
        return;
      }

      // Filter out users who already have PENDING invitations (declined/cancelled/removed can be re-invited)
      const pendingInvitations = existingInvitations?.filter(inv => inv.status === 'pending') || [];
      const pendingUserIds = pendingInvitations.map(inv => inv.invited_user_id);
      
      // Find users with declined/cancelled/removed invitations that can be re-invited
      const declinedInvitations = existingInvitations?.filter(inv => 
        ['declined', 'cancelled', 'removed'].includes(inv.status)
      ) || [];
      
      // Clean up old declined/cancelled/removed invitations
      if (declinedInvitations.length > 0) {
        console.log("Cleaning up old declined/cancelled/removed invitations:", declinedInvitations);
        
        try {
          for (const oldInvitation of declinedInvitations) {
            console.log("Cleaning up invitation for user:", oldInvitation.invited_user_id);
            
            const { error: deleteError } = await supabase
              .from("workspace_invitations")
              .delete()
              .eq("invited_user_id", oldInvitation.invited_user_id)
              .eq("workspace_id", workspaceId);
            
            if (deleteError) {
              console.error("Error deleting old invitation:", deleteError);
              // Try updating status instead
              const { error: updateError } = await supabase
                .from("workspace_invitations")
                .update({ 
                  status: 'cancelled',
                  updated_at: new Date().toISOString()
                })
                .eq("invited_user_id", oldInvitation.invited_user_id)
                .eq("workspace_id", workspaceId);
              
              if (updateError) {
                console.error("Error updating old invitation status:", updateError);
                // Don't fail the entire process, just log the error
              } else {
                console.log("Successfully updated old invitation status to cancelled");
              }
            } else {
              console.log("Successfully deleted old invitation");
            }
          }
          
          // Wait a moment for the cleanup to complete
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (cleanupError) {
          console.error("Error during cleanup process:", cleanupError);
          // Don't fail the entire process, just log the error
        }
      }
      
      // Include users who had declined invitations in the new invitations list
      const declinedUserIds = declinedInvitations.map(inv => inv.invited_user_id);
      const newInvitations = selectedMembers.filter(member => 
        !pendingUserIds.includes(member.id) || declinedUserIds.includes(member.id)
      );
      const alreadyInvited = selectedMembers.filter(member => 
        pendingUserIds.includes(member.id) && !declinedUserIds.includes(member.id)
      );

      console.log("Invitation filtering results:");
      console.log("- Pending user IDs:", pendingUserIds);
      console.log("- Declined user IDs:", declinedUserIds);
      console.log("- New invitations:", newInvitations.map(m => ({ id: m.id, username: m.username })));
      console.log("- Already invited:", alreadyInvited.map(m => ({ id: m.id, username: m.username })));

      if (alreadyInvited.length > 0) {
        const names = alreadyInvited.map(m => m.username).join(', ');
        setError(`${names} ${alreadyInvited.length === 1 ? 'has' : 'have'} already been invited to this workspace.`);
        return;
      }

      if (newInvitations.length === 0) {
        setError("All selected users have already been invited to this workspace.");
        return;
      }

      // Create invitation objects for new invitations only
      const invitationsToSend = newInvitations.map(member => ({
        workspace_id: parseInt(workspaceId),
        invited_user_id: member.id,
        invited_by_user_id: currentUser.id,
        role: 'member',
        status: 'pending'
      }));

      console.log("Sending invitations:", invitationsToSend);
      console.log("Number of invitations to send:", invitationsToSend.length);

      if (invitationsToSend.length === 0) {
        setError("No valid invitations to send.");
        return;
      }

      // Validate invitation data before sending
      for (const invitation of invitationsToSend) {
        if (!invitation.workspace_id || !invitation.invited_user_id || !invitation.invited_by_user_id) {
          console.error("Invalid invitation data:", invitation);
          setError("Invalid invitation data. Please try again.");
          return;
        }
        
        if (typeof invitation.workspace_id !== 'number' || 
            typeof invitation.invited_user_id !== 'string' || 
            typeof invitation.invited_by_user_id !== 'string') {
          console.error("Invalid invitation data types:", invitation);
          setError("Invalid invitation data types. Please try again.");
          return;
        }
      }

      console.log("All invitation data is valid, proceeding with insert...");

      // Test Supabase connection first
      console.log("Testing Supabase connection...");
      console.log("Environment variables:", {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
        key: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Missing'
      });
      
      // Test basic Supabase functionality
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        console.log("Auth test result:", { data: authData, error: authError });
        
        if (authError) {
          console.error("Auth test failed:", authError);
          setError("Supabase authentication failed. Please check your configuration.");
          return;
        }
      } catch (authException) {
        console.error("Auth test exception:", authException);
        setError("Supabase connection failed. Please check your configuration.");
        return;
      }
      
      // Test if the table exists by doing a simple select
      console.log("Testing if workspace_invitations table exists...");
      const { data: testData, error: testError } = await supabase
        .from("workspace_invitations")
        .select("id")
        .limit(1);
      
      console.log("Table test result:", { data: testData, error: testError });
      console.log("Test error details:", {
        code: testError?.code,
        message: testError?.message,
        details: testError?.details,
        hint: testError?.hint
      });
      
      if (testError) {
        console.error("Table test failed:", testError);
        if (testError.code === '42P01') {
          setError("The workspace_invitations table doesn't exist. Please run the database setup script.");
          return;
        } else if (testError.code === '42501') {
          setError("Permission denied. Please check your database permissions.");
          return;
        } else {
          setError(`Database error: ${testError.message || 'Unknown error'}`);
          return;
        }
      }

      // Final check to ensure no pending invitations exist for these users
      const { data: finalCheck, error: finalCheckError } = await supabase
        .from("workspace_invitations")
        .select("invited_user_id, status")
        .eq("workspace_id", workspaceId)
        .in("invited_user_id", invitationsToSend.map(inv => inv.invited_user_id))
        .eq("status", "pending");

      if (finalCheckError) {
        console.error("Error in final check:", finalCheckError);
        setError("Failed to verify invitation status. Please try again.");
        return;
      }

      if (finalCheck && finalCheck.length > 0) {
        console.log("Found pending invitations in final check:", finalCheck);
        setError("Some users have pending invitations. Please refresh and try again.");
        return;
      }

      try {
        // Try inserting one invitation at a time to isolate any issues
        console.log("Attempting to insert invitations one by one...");
        
        const results = [];
        for (let i = 0; i < invitationsToSend.length; i++) {
          const invitation = invitationsToSend[i];
          console.log(`Inserting invitation ${i + 1}/${invitationsToSend.length}:`, invitation);
          
          // Try insert without select first to see if that's the issue
          console.log(`Attempting insert without select for invitation ${i + 1}...`);
          console.log(`Supabase client info:`, {
            url: supabase.supabaseUrl,
            hasAnonKey: !!supabase.supabaseKey,
            clientType: typeof supabase
          });
          
          try {
            // Try insert with select to get the actual created invitation
            const { data: insertData, error: insertError } = await supabase
  .from('workspace_invitations')
  .upsert(invitation, {
    onConflict: 'workspace_id,invited_user_id'
  })
  .select();

console.log(`Insert result for invitation ${i + 1}:`, { 
  data: insertData, 
  error: insertError,
  errorType: typeof insertError,
  errorKeys: insertError ? Object.keys(insertError) : 'N/A'
});
            
            // Check for insert errors first
            if (insertError) {
              console.error(`Insert error for invitation ${i + 1}:`, insertError);
              console.error(`Insert error details:`, {
                code: insertError.code,
                message: insertError.message,
                details: insertError.details,
                hint: insertError.hint
              });
              
              // Handle specific error types
              if (insertError.code === '42P01') {
                setError("The workspace_invitations table doesn't exist. Please run the database setup script.");
                return;
              } else if (insertError.code === '42501') {
                setError("Permission denied. Please check your database permissions.");
                return;
              } else if (insertError.code === '23505') {
                setError(`User ${invitation.invited_user_id} already has a pending invitation to this workspace.`);
                return;
              } else {
                setError(`Failed to create invitation for ${invitation.invited_user_id}: ${insertError.message || 'Database error'}`);
                return;
              }
            }
            
            // Check if we have actual data (real invitation created)
            if (insertData && insertData.length > 0) {
              console.log(`Invitation ${i + 1} created successfully with data:`, insertData[0]);
              results.push(insertData[0]);
            } else {
              // No data returned, but no error either - this might be a problem
              console.error(`No data returned for invitation ${i + 1}, but no error either`);
              
              // Try to verify by querying the database
              const { data: verifyData, error: verifyError } = await supabase
                .from("workspace_invitations")
                .select("*")
                .eq("workspace_id", invitation.workspace_id)
                .eq("invited_user_id", invitation.invited_user_id)
                .eq("invited_by_user_id", invitation.invited_by_user_id)
                .order("created_at", { ascending: false })
                .limit(1);
              
              console.log(`Verification query result for invitation ${i + 1}:`, { data: verifyData, error: verifyError });
              
              if (verifyData && verifyData.length > 0) {
                console.log(`Invitation ${i + 1} found in verification query:`, verifyData[0]);
                results.push(verifyData[0]);
              } else {
                // Invitation was not created - this is a real error
                console.error(`Invitation ${i + 1} was not created in the database`);
                setError(`Failed to create invitation for ${invitation.invited_user_id}. The invitation was not saved to the database.`);
                return;
              }
            }
            
          } catch (insertException) {
            console.error(`Exception during insert for invitation ${i + 1}:`, insertException);
            setError(`Failed to send invitation to ${invitation.invited_user_id}: ${insertException.message || 'Database operation failed'}`);
            return;
          }
          
          // This section is now handled above in the try-catch block
        }
        
        const data = results;
        const error = null;

        console.log("Insert result - data:", data);
        console.log("Insert result - error:", error);
        console.log("Error type:", typeof error);
        console.log("Error is null:", error === null);
        console.log("Error is undefined:", error === undefined);

        if (error) {
          console.error("Error sending invitations:", error);
          console.error("Error details:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          
          if (error.code === '23505') { // Unique constraint violation
            setError("Some users have already been invited to this workspace. Please refresh and try again.");
          } else {
            setError(`Failed to send invitations: ${error.message || 'Unknown error occurred'}`);
          }
          return;
        }

        // Check if data is null or empty (which could indicate an error)
        if (!data || data.length === 0) {
          console.error("No data returned from insert operation");
          setError("Failed to send invitations: No data returned from database");
          return;
        }

        console.log("Successfully inserted invitations:", data);
      } catch (insertError) {
        console.error("Caught exception during insert:", insertError);
        console.error("Exception details:", {
          name: insertError.name,
          message: insertError.message,
          stack: insertError.stack
        });
        setError(`Failed to send invitations: ${insertError.message || 'Database operation failed'}`);
        return;
      }

      setSuccess(`Successfully sent ${invitationsToSend.length} invitation${invitationsToSend.length !== 1 ? 's' : ''} to join "${workspaceName}"!`);
      
      // Reset state and close modal after a short delay
      setTimeout(() => {
        setSelectedMembers([]);
        setSearchQuery("");
        setSearchResults([]);
        setSuccess("");
        onInviteSent();
      }, 1500);

    } catch (error) {
      console.error("Error sending invitations:", error);
      setError(`Unexpected error: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = selectedMembers.length > 0 && !submitting;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
          <h2 className="text-xl font-semibold text-gray-900">Invite Members to Workspace</h2>
            <p className="text-sm text-gray-600 mt-1">Workspace: <span className="font-medium text-blue-600">{workspaceName}</span></p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError("");
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search users by email or username..."
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
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
          {searchQuery && searchResults.length === 0 && !loading && (
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-600">{error}</div>
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
              onClick={submit}
              disabled={!canSubmit}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              {submitting ? "Sending..." : `Send ${selectedMembers.length} Invitation${selectedMembers.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Existing Members Modal Component
function ExistingMembersModal({ workspaceOwner, workspaceMembers, isWorkspaceOwner, onClose, onRemoveMember, workspaceId, currentUser }) {
  const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const router = useRouter();
  
  const allMembers = workspaceOwner ? [workspaceOwner, ...workspaceMembers] : workspaceMembers;
  const totalMembers = allMembers.length;
  const isCurrentUserMember = !isWorkspaceOwner && allMembers.some(member => member.id === currentUser?.id);

  // Leave workspace function
  const handleLeaveWorkspace = async () => {
    if (!currentUser || !workspaceId) return;
    
    setLeaving(true);
    try {
      console.log("Leaving workspace:", workspaceId, "for user:", currentUser.id);
      
      // First, check if the invitation exists and get all details
      const { data: existingInvitation, error: checkError } = await supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("invited_user_id", currentUser.id);

      if (checkError) {
        console.error("Error checking existing invitation:", checkError);
      } else {
        console.log("Existing invitation before deletion:", existingInvitation);
        if (existingInvitation && existingInvitation.length > 0) {
          console.log("Invitation details:", {
            id: existingInvitation[0].id,
            workspace_id: existingInvitation[0].workspace_id,
            invited_user_id: existingInvitation[0].invited_user_id,
            status: existingInvitation[0].status,
            created_at: existingInvitation[0].created_at
          });
        }
      }
      
      // Since deletion doesn't work due to permissions, we'll use status updates instead
      let statusUpdateSuccessful = false;

      if (existingInvitation && existingInvitation.length > 0) {
        const invitationId = existingInvitation[0].id;
        console.log("Deletion not permitted, using status update approach for invitation ID:", invitationId);
        
        // Try different status update methods
        const statusOptions = ['removed', 'declined', 'cancelled', 'left'];
        
        for (const status of statusOptions) {
          console.log(`Attempting to update status to: ${status}`);
          
          const { error: updateError } = await supabase
            .from("workspace_invitations")
            .update({ status: status })
            .eq("id", invitationId);

          if (updateError) {
            console.log(`Status '${status}' not available, trying next option...`);
          } else {
            console.log(`Successfully updated status to: ${status}`);
            statusUpdateSuccessful = true;
            break;
          }
        }

        // If status updates also fail, try updating by workspace_id and user_id
        if (!statusUpdateSuccessful) {
          console.log("Status update by ID failed, trying by workspace_id and user_id...");
          
          for (const status of statusOptions) {
            console.log(`Attempting to update status to: ${status} (by workspace_id and user_id)`);
            
            const { error: updateError } = await supabase
              .from("workspace_invitations")
              .update({ status: status })
              .eq("workspace_id", workspaceId)
              .eq("invited_user_id", currentUser.id);

            if (updateError) {
              console.log(`Status '${status}' not available (by workspace_id and user_id), trying next option...`);
            } else {
              console.log(`Successfully updated status to: ${status} (by workspace_id and user_id)`);
              statusUpdateSuccessful = true;
              break;
            }
          }
        }
      }

      if (!statusUpdateSuccessful) {
        console.error("All status update methods failed");
        // Don't return here - continue with board cleanup
      } else {
        console.log("Successfully updated workspace invitation status");
      }

      // Verify the invitation status was updated
      const { data: verifyInvitation, error: verifyError } = await supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", workspaceId)
        .eq("invited_user_id", currentUser.id);

      if (verifyError) {
        console.error("Error verifying invitation status:", verifyError);
      } else {
        console.log("Verification - current invitation status:", verifyInvitation);
        if (verifyInvitation && verifyInvitation.length > 0) {
          const currentStatus = verifyInvitation[0].status;
          console.log("Current invitation status:", currentStatus);
          
          // Check if status was successfully updated to something other than 'accepted'
          if (currentStatus === 'accepted') {
            console.error("WARNING: Invitation status is still 'accepted'!");
            console.log("This means the status update failed. The workspace will still appear in your list.");
            console.log("Available invitation fields:", verifyInvitation[0]);
          } else {
            console.log("SUCCESS: Invitation status updated to:", currentStatus);
            console.log("The workspace should no longer appear in your workspace list.");
          }
        } else {
          console.log("Verification successful - invitation no longer exists (deleted)");
        }
      }

      // Also remove from any boards in this workspace
      const { data: boards, error: boardsError } = await supabase
        .from("boards")
        .select("id")
        .eq("workspace_id", workspaceId);

      if (!boardsError && boards && boards.length > 0) {
        console.log("Removing user from", boards.length, "boards");
        const boardIds = boards.map(b => b.id);
        
        // Remove from board invitations
        const { error: boardInviteError } = await supabase
          .from("board_invitations")
          .delete()
          .eq("invited_user_id", currentUser.id)
          .in("board_id", boardIds);

        if (boardInviteError) {
          console.error("Error removing board invitations:", boardInviteError);
        } else {
          console.log("Successfully removed board invitations");
        }

        // Remove from board members
        for (const boardId of boardIds) {
          const { data: boardData, error: boardError } = await supabase
            .from("boards")
            .select("members")
            .eq("id", boardId)
            .single();

          if (!boardError && boardData && boardData.members) {
            const updatedMembers = boardData.members.filter(
              member => member.user_id !== currentUser.id
            );
            
            const { error: updateError } = await supabase
              .from("boards")
              .update({ members: updatedMembers })
              .eq("id", boardId);

            if (updateError) {
              console.error("Error updating board members for board", boardId, ":", updateError);
            } else {
              console.log("Successfully updated board members for board", boardId);
            }
          }
        }
      }

      console.log("Successfully left workspace, redirecting...");
      onClose();
      
      // Force a hard redirect to ensure the workspace list is refreshed
      window.location.href = "/workspace";
    } catch (error) {
      console.error("Error leaving workspace:", error);
    } finally {
      setLeaving(false);
      setShowLeaveConfirmation(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden relative">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 opacity-30"></div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200 rounded-full -translate-y-16 translate-x-16 opacity-20"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-200 rounded-full translate-y-12 -translate-x-12 opacity-20"></div>
        {/* Modal Header */}
        <div className="relative flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Workspace Members</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="relative p-6 max-h-96 overflow-y-auto">
          <div className="space-y-3">
            {allMembers.map((member, index) => {
              const isOwner = index === 0 && workspaceOwner;
              const addedDate = new Date().toLocaleDateString(); // You can get actual date from member data
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.username?.charAt(0)?.toUpperCase() || 'M'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{member.username}</div>
                      <div className="text-sm text-gray-500">{member.email}</div>
                      <div className="text-xs text-gray-400">Added {addedDate}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-1">
                      {isOwner ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          Owner
                        </span>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <Users className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Member</span>
                        </div>
                      )}
                    </div>
                    
                    {!isOwner && isWorkspaceOwner && (
                      <button
                        onClick={() => onRemoveMember(member.id)}
                        className="p-1 hover:bg-red-100 rounded transition-colors duration-200"
                        title="Remove member from workspace"
                      >
                        <X className="h-4 w-4 text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="relative flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <div className="text-sm text-gray-500">
            {totalMembers} member{totalMembers !== 1 ? 's' : ''} total
          </div>
          <div className="flex items-center space-x-3">
            {/* Leave workspace button - only show for members, not owners */}
            {isCurrentUserMember && (
              <button
                onClick={() => setShowLeaveConfirmation(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Leave Workspace
              </button>
            )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
      </div>

      {/* Leave Workspace Confirmation Modal */}
      {showLeaveConfirmation && (
        <div className="fixed inset-0 z-60 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <LogOut className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Leave Workspace</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to leave this workspace? You will lose access to all boards and data in this workspace. This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowLeaveConfirmation(false)}
                  disabled={leaving}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLeaveWorkspace}
                  disabled={leaving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 flex items-center"
                >
                  {leaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Leaving...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave Workspace
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
     </div>
   );
 }

// Invite Members to Board Modal Component
function InviteMembersToBoardModal({ boards, currentUser, workspaceId, onClose }) {
  const [selectedBoard, setSelectedBoard] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [adding, setAdding] = useState(false);
  const [isOwnerSearch, setIsOwnerSearch] = useState(false);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [loadingWorkspaceMembers, setLoadingWorkspaceMembers] = useState(false);
  const [nonWorkspaceUsers, setNonWorkspaceUsers] = useState([]);
  const [showNonWorkspaceMessage, setShowNonWorkspaceMessage] = useState(false);
  const [inviteToWorkspaceMode, setInviteToWorkspaceMode] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  // Filter boards where current user is owner
  const ownedBoards = boards.filter(board => 
    currentUser && board.user_id === currentUser.id
  );

  // Filter workspace members based on search query
  const filteredWorkspaceMembers = workspaceMembers.filter(member => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.username?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
    );
  });

  // Get current user and workspace members
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        // User is already passed as prop, but we can use this for consistency
      }
    };
    getCurrentUser();
    if (workspaceId) {
      loadWorkspaceMembers();
    }
  }, [workspaceId]);

  // Load workspace members (only accepted members, excluding owner)
  const loadWorkspaceMembers = async () => {
    if (!currentUser || !workspaceId) {
      console.log("No current user or workspace ID, skipping workspace members load");
      return;
    }
    
    setLoadingWorkspaceMembers(true);
    try {
      console.log("Loading workspace members for workspace ID:", workspaceId);

      // Get workspace owner
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("user_id")
        .eq("id", workspaceId)
        .single();

      if (workspaceError) {
        console.error("Error fetching workspace data:", workspaceError);
        throw workspaceError;
      }

      const ownerId = workspaceData.user_id;
      console.log("Workspace owner ID:", ownerId);

      // Get accepted workspace members (excluding owner)
      console.log("Fetching workspace invitations for workspace ID:", workspaceId);
      
      let memberInvitations = [];
      let memberError = null;
      
      try {
        // First, let's check if the table exists by doing a simple query
        console.log("Checking if workspace_invitations table exists...");
        const tableCheck = await supabase
          .from("workspace_invitations")
          .select("id")
          .limit(1);
        
        console.log("Table check result:", tableCheck);
        
        if (tableCheck.error) {
          console.log("Table doesn't exist or has issues:", tableCheck.error);
          console.log("Skipping member invitations, using empty array");
          setWorkspaceMembers([]);
          return;
        }
        
        // Try simple query first
        console.log("Trying simple query without join...");
        const simpleResult = await supabase
          .from("workspace_invitations")
          .select("invited_user_id, status")
          .eq("workspace_id", workspaceId)
          .eq("status", "accepted");
        
        console.log("Simple query result:", simpleResult);
        
        if (simpleResult.error) {
          console.log("Simple query failed:", simpleResult.error);
          memberError = simpleResult.error;
        } else {
          console.log("Simple query successful, data:", simpleResult.data);
          
          if (simpleResult.data && simpleResult.data.length > 0) {
            const userIds = simpleResult.data.map(inv => inv.invited_user_id);
            console.log("User IDs to fetch:", userIds);
            
            const profilesResult = await supabase
              .from("profiles")
              .select("id, username, email")
              .in("id", userIds);
            
            console.log("Profiles query result:", profilesResult);
            
            if (!profilesResult.error && profilesResult.data) {
              // Filter out the owner from the results
              const membersOnly = profilesResult.data.filter(profile => profile.id !== ownerId);
              memberInvitations = membersOnly.map(profile => ({ profiles: profile }));
              console.log("Successfully loaded member profiles (excluding owner):", memberInvitations);
            } else {
              console.log("Profiles query failed:", profilesResult.error);
              memberError = profilesResult.error;
            }
          } else {
            console.log("No accepted invitations found for this workspace");
            memberInvitations = [];
          }
        }
      } catch (queryError) {
        console.error("Exception during workspace invitations query:", queryError);
        console.error("Exception details:", {
          name: queryError.name,
          message: queryError.message,
          stack: queryError.stack
        });
        memberError = queryError;
      }

      if (memberError) {
        console.error("Error loading workspace member invitations:", memberError);
        console.error("Error details:", {
          code: memberError.code,
          message: memberError.message,
          details: memberError.details,
          hint: memberError.hint
        });
        
        // If table doesn't exist or has issues, use empty array
        console.log("Falling back to empty array due to invitation error");
        setWorkspaceMembers([]);
        return;
      }

      // Only use member invitations (no owner)
      const members = [];
      if (memberInvitations && memberInvitations.length > 0) {
        const memberProfiles = memberInvitations
          .map(inv => inv.profiles)
          .filter(profile => profile !== null);
        members.push(...memberProfiles);
      }

      console.log("Final workspace members (excluding owner):", members);
      setWorkspaceMembers(members);
    } catch (error) {
      console.error("Error loading workspace members:", error);
      setWorkspaceMembers([]);
    } finally {
      setLoadingWorkspaceMembers(false);
    }
  };

  // Search for users - first in workspace members, then in all users if not found
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
          const isSearchingSelf = 
          currentUser.username?.toLowerCase().includes(query.toLowerCase()) ||
          currentUser.email?.toLowerCase().includes(query.toLowerCase());
          
          if (isSearchingSelf) {
            setIsOwnerSearch(true);
            setSearchResults([]);
            setLoading(false);
            return;
        }
      }

      setIsOwnerSearch(false);

      // First search within workspace members
      const filteredMembers = workspaceMembers.filter(member => {
        const usernameMatch = member.username?.toLowerCase().includes(query.toLowerCase());
        const emailMatch = member.email?.toLowerCase().includes(query.toLowerCase());
        return usernameMatch || emailMatch;
      });

      if (filteredMembers.length > 0) {
        // Found workspace members
        setSearchResults(filteredMembers);
      } else {
        // No workspace members found, search all users
        console.log("No workspace members found, searching all users for:", query);
        
        const { data: allUsers, error: searchError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (searchError) {
          console.error("Error searching all users:", searchError);
          setSearchResults([]);
        } else if (allUsers && allUsers.length > 0) {
          // Found users who are not in workspace
          setSearchResults([]);
          setNonWorkspaceUsers(allUsers);
          setShowNonWorkspaceMessage(true);
        } else {
          // No users found at all
          setSearchResults([]);
        }
      }
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

  const addMembersToBoard = async () => {
    if (selectedMembers.length === 0 || !selectedBoard) return;

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

      // Verify user is the owner of the selected board
      if (selectedBoard.user_id !== user.id) {
        setError("You can only invite members to boards you own.");
        return;
      }

      // Get current board data to check existing members and invitations
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("members, title")
        .eq("id", selectedBoard.id)
        .single();

      if (boardError) {
        setError("Failed to fetch board data.");
        return;
      }

      // Get existing members array
      const existingMembers = boardData.members || [];
      
      // Check for existing invitations
      const { data: existingInvitations, error: invitationsError } = await supabase
        .from("board_invitations")
        .select("invited_user_id, status")
        .eq("board_id", selectedBoard.id)
        .in("invited_user_id", selectedMembers.map(m => m.id));

      if (invitationsError) {
        console.error("Error checking existing invitations:", invitationsError);
      }

      // Separate checks for existing members and pending invitations
      const alreadyMembers = selectedMembers.filter(selectedMember => 
        existingMembers.some(existingMember => 
          existingMember.user_id === selectedMember.id
        )
      );
      
      const hasPendingInvitations = selectedMembers.filter(selectedMember => 
        existingInvitations?.some(invitation => 
          invitation.invited_user_id === selectedMember.id && invitation.status === 'pending'
        )
      );

      // Show specific alert for existing members
      if (alreadyMembers.length > 0) {
        const memberNames = alreadyMembers.map(member => member.username).join(', ');
        setError(`${memberNames} ${alreadyMembers.length === 1 ? 'is' : 'are'} already a member${alreadyMembers.length === 1 ? '' : 's'} of this board.`);
        return;
      }

      // Show specific alert for pending invitations
      if (hasPendingInvitations.length > 0) {
        const invitationNames = hasPendingInvitations.map(member => member.username).join(', ');
        setError(`${invitationNames} ${hasPendingInvitations.length === 1 ? 'has' : 'have'} pending invitation${hasPendingInvitations.length === 1 ? '' : 's'} for this board.`);
        return;
      }

      // Filter out users who are already members or have pending invitations
      const newInvitations = selectedMembers.filter(selectedMember => {
        const isAlreadyMember = existingMembers.some(existingMember => 
          existingMember.user_id === selectedMember.id
        );
        const hasPendingInvitation = existingInvitations?.some(invitation => 
          invitation.invited_user_id === selectedMember.id && invitation.status === 'pending'
        );
        return !isAlreadyMember && !hasPendingInvitation;
      });

      if (newInvitations.length === 0) {
        setError("All selected users are already members or have pending invitations for this board.");
        return;
      }

      // Create invitation objects
      const invitationsToSend = newInvitations.map(member => ({
        board_id: parseInt(selectedBoard.id),
        invited_user_id: member.id,
        invited_by_user_id: user.id,
        role: 'member'
      }));

      // Send invitations – create if new OR update existing declined/old ones
const { data, error } = await supabase
.from("workspace_invitations")
.upsert(invitationsToSend, {
  onConflict: 'workspace_id,invited_user_id'
})
.select();

      if (error) {
        console.error("Error sending invitations:", error);
        setError(`Failed to send invitations: ${error.message || 'Unknown error occurred'}`);
        return;
      }

      // Success
      setSuccess(`Successfully sent ${invitationsToSend.length} invitation${invitationsToSend.length !== 1 ? 's' : ''} to join "${boardData.title}"!`);
      
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

  // Handle combined workspace and board invitation
  const inviteToWorkspaceAndBoard = async (user) => {
    if (!selectedBoard || !workspaceId) return;

    setAdding(true);
    setError("");
    setSuccess("");
    
    try {
      // Get current user to check permissions
      const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
      if (userError || !currentUser) {
        setError("You must be logged in to invite members.");
        return;
      }

      // Verify user is the owner of the selected board
      if (selectedBoard.user_id !== currentUser.id) {
        setError("You can only invite members to boards you own.");
        return;
      }

      // Check for existing workspace invitation first
      const { data: existingInvitation, error: checkError } = await supabase
        .from("workspace_invitations")
        .select("id, status")
        .eq("workspace_id", workspaceId)
        .eq("invited_user_id", user.id)
        .maybeSingle();

      if (checkError) {
        console.error("Error checking existing invitation:", checkError);
        setError("Failed to check existing invitations. Please try again.");
        return;
      }

      if (existingInvitation) {
        console.log("Found existing workspace invitation:", existingInvitation);
        if (existingInvitation.status === 'pending') {
          setError("This user already has a pending invitation to this workspace.");
          return;
        } else if (existingInvitation.status === 'accepted') {
          setError("This user is already a member of this workspace.");
          return;
        } else if (existingInvitation.status === 'declined' || existingInvitation.status === 'cancelled' || existingInvitation.status === 'removed') {
          // Allow re-inviting declined/cancelled/removed users - delete the old invitation first
          console.log("User previously declined/cancelled/removed, deleting old invitation and creating new one");
          console.log("Deleting invitation with ID:", existingInvitation.id);
          
          const { error: deleteError } = await supabase
            .from("workspace_invitations")
            .delete()
            .eq("id", existingInvitation.id);
          
          if (deleteError) {
            console.error("Error deleting old invitation:", deleteError);
            console.error("Delete error details:", {
              code: deleteError.code,
              message: deleteError.message,
              details: deleteError.details,
              hint: deleteError.hint
            });
            
            // If deletion fails, try updating the status instead
            console.log("Deletion failed, trying to update status instead...");
            const { error: updateError } = await supabase
              .from("workspace_invitations")
              .update({ 
                status: 'cancelled',
                updated_at: new Date().toISOString()
              })
              .eq("id", existingInvitation.id);
            
            if (updateError) {
              console.error("Error updating invitation status:", updateError);
              setError("Failed to handle old invitation. Please try again.");
              return;
            }
            
            console.log("Successfully updated old invitation status to cancelled");
          } else {
            console.log("Successfully deleted old invitation");
          }
          
          // Verify the old invitation is no longer blocking new invitations
          console.log("Verifying old invitation is no longer blocking...");
          const { data: verifyInvitation, error: verifyError } = await supabase
            .from("workspace_invitations")
            .select("id, status")
            .eq("workspace_id", workspaceId)
            .eq("invited_user_id", user.id)
            .maybeSingle();
          
          if (verifyError) {
            console.error("Error verifying invitation cleanup:", verifyError);
            setError("Failed to verify invitation cleanup. Please try again.");
            return;
          }
          
          if (verifyInvitation && verifyInvitation.status === 'pending') {
            console.log("Old invitation still exists and is pending, cannot create new one");
            setError("This user already has a pending invitation to this workspace.");
            return;
          }
          
          console.log("Verification complete, proceeding with new invitation creation");
          
          // Also check and clean up any existing board invitations for this user
          console.log("Checking for existing board invitations to clean up...");
          const { data: existingBoardInvitations, error: boardCheckError } = await supabase
            .from("board_invitations")
            .select("id, status")
            .eq("board_id", selectedBoard.id)
            .eq("invited_user_id", user.id);
          
          if (boardCheckError) {
            console.error("Error checking existing board invitations:", boardCheckError);
            // Don't fail the process, just log the error
          } else if (existingBoardInvitations && existingBoardInvitations.length > 0) {
            console.log("Found existing board invitations to clean up:", existingBoardInvitations);
            
            // Delete or update existing board invitations
            for (const boardInv of existingBoardInvitations) {
              const { error: deleteBoardError } = await supabase
                .from("board_invitations")
                .delete()
                .eq("id", boardInv.id);
              
              if (deleteBoardError) {
                console.error("Error deleting old board invitation:", deleteBoardError);
                // Try updating status instead
                const { error: updateBoardError } = await supabase
                  .from("board_invitations")
                  .update({ 
                    status: 'cancelled',
                    updated_at: new Date().toISOString()
                  })
                  .eq("id", boardInv.id);
                
                if (updateBoardError) {
                  console.error("Error updating board invitation status:", updateBoardError);
                } else {
                  console.log("Successfully updated old board invitation status to cancelled");
                }
              } else {
                console.log("Successfully deleted old board invitation");
              }
            }
          }
        } else {
          // Handle any other status
          console.log("Found invitation with status:", existingInvitation.status);
          setError(`This user already has an invitation to this workspace with status: ${existingInvitation.status}`);
          return;
        }
      }

      // Note: We've already checked and cleaned up existing board invitations above
      // Now we can proceed with creating the new combined invitation

      // Create a single combined invitation by storing board info in workspace invitation
      // We'll use a special format in the role field to indicate it's a combined invitation
      console.log("Creating combined invitation with data:", {
        workspace_id: parseInt(workspaceId),
        invited_user_id: user.id,
        invited_by_user_id: currentUser.id,
        role: 'member', // Use standard role to avoid constraint violation
        status: 'pending'
      });
      
      // Create workspace invitation with standard role
      const { data: combinedInvitation, error: combinedError } = await supabase
        .from("workspace_invitations")
        .insert([{
          workspace_id: parseInt(workspaceId),
          invited_user_id: user.id,
          invited_by_user_id: currentUser.id,
          role: 'member', // Use standard role to avoid constraint violation
          status: 'pending'
        }])
        .select()
        .single();

      // If workspace invitation is successful, create a board invitation with a special marker
      if (!combinedError && combinedInvitation) {
        console.log("Workspace invitation created successfully, creating board invitation with combined marker");
        
        // Create board invitation with standard role to indicate it's combined
        const { data: boardInvitation, error: boardError } = await supabase
          .from("board_invitations")
          .insert([{
            board_id: parseInt(selectedBoard.id),
            invited_user_id: user.id,
            invited_by_user_id: currentUser.id,
            role: 'member', // Use standard role to avoid constraint violation
            status: 'pending'
          }])
          .select()
          .single();

        if (boardError) {
          console.error("Error creating board invitation for combined invitation:", boardError);
          // Don't fail the entire process, just log the error
        } else {
          console.log("Board invitation created successfully for combined invitation:", boardInvitation);
        }
      }

      if (combinedError) {
        console.error("Error sending combined invitation:", combinedError);
        console.error("Error type:", typeof combinedError);
        console.error("Error constructor:", combinedError.constructor.name);
        console.error("Error keys:", Object.keys(combinedError));
        console.error("Error details:", {
          code: combinedError.code,
          message: combinedError.message,
          details: combinedError.details,
          hint: combinedError.hint,
          status: combinedError.status,
          statusText: combinedError.statusText
        });
        console.error("Full error object:", JSON.stringify(combinedError, null, 2));
        
        // Check for specific error types
        if (combinedError.code === '23505') { // Unique constraint violation
          setError("This user already has an invitation to this workspace. Please check the existing invitations.");
        } else if (combinedError.code === '23514' || (combinedError.message && combinedError.message.includes('check constraint'))) {
          // If role constraint fails, we need to use a different approach
          // Let's try using a different field or approach to store board info
          console.log("Role constraint failed, trying alternative approach...");
          
          // Create workspace invitation with standard role but store board info differently
          const { data: workspaceInvitation, error: workspaceError } = await supabase
            .from("workspace_invitations")
            .insert([{
              workspace_id: parseInt(workspaceId),
              invited_user_id: user.id,
              invited_by_user_id: currentUser.id,
              role: 'member',
              status: 'pending'
            }])
            .select()
            .single();

          if (workspaceError) {
            console.error("Error sending workspace invitation:", workspaceError);
            console.error("Workspace error type:", typeof workspaceError);
            console.error("Workspace error constructor:", workspaceError.constructor.name);
            console.error("Workspace error keys:", Object.keys(workspaceError));
            console.error("Workspace error details:", {
              code: workspaceError.code,
              message: workspaceError.message,
              details: workspaceError.details,
              hint: workspaceError.hint,
              status: workspaceError.status,
              statusText: workspaceError.statusText
            });
            console.error("Full workspace error object:", JSON.stringify(workspaceError, null, 2));
            setError(`Failed to send invitation: ${workspaceError.message || 'Unknown error occurred'}`);
            return;
          }

          // Success - workspace invitation created
          setSuccess(`Successfully invited ${user.username} to the workspace! They'll be added to the board when they accept the workspace invitation.`);
        } else {
          setError(`Failed to send invitation: ${combinedError.message || 'Unknown error occurred. Please try again.'}`);
          return;
        }
      } else {
        // Success
        setSuccess(`Successfully invited ${user.username} to both workspace and board! They'll be added to both when they accept the workspace invitation.`);
      }
      
      // Reset state and close modal after a short delay
      setTimeout(() => {
        setSelectedMembers([]);
        setSearchQuery("");
        setSearchResults([]);
        setSuccess("");
        setError("");
        onClose(); // Use onClose prop instead of setShowInviteModal
      }, 2000);

    } catch (error) {
      console.error("Error sending combined invitations:", error);
      setError(`Unexpected error: ${error.message}`);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Members to Board</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Board Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Board <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedBoard?.id || ""}
              onChange={(e) => {
                const boardId = e.target.value;
                const board = ownedBoards.find(b => b.id.toString() === boardId);
                setSelectedBoard(board || null);
                setError(""); // Clear errors when board changes
              }}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Choose a board...</option>
              {ownedBoards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.title}
                </option>
              ))}
            </select>
            {ownedBoards.length === 0 && (
              <p className="text-sm text-gray-500 mt-1">
                You don't own any boards yet. Create a board first to invite members.
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
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              disabled={!selectedBoard || loadingWorkspaceMembers}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={
                loadingWorkspaceMembers 
                  ? "Loading workspace members..." 
                  : selectedBoard 
                    ? "Search workspace members by email or username..." 
                    : "Select a board first..."
              }
            />
            {(loading || loadingWorkspaceMembers) && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {/* Workspace Members Dropdown */}
            {showDropdown && selectedBoard && filteredWorkspaceMembers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div className="p-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                  Workspace Members ({filteredWorkspaceMembers.length})
                </div>
                {filteredWorkspaceMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      handleUserSelect(member);
                      setShowDropdown(false);
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {member.username?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.username}
                        </div>
                        {member.email && (
                          <div className="text-sm text-gray-500">{member.email}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Workspace Members Info */}
          {selectedBoard && !loadingWorkspaceMembers && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  ℹ
                </div>
                <div>
                  <div className="text-sm font-medium text-blue-900">Workspace Members Only</div>
                  <div className="text-xs text-blue-700">
                    You can only invite workspace members to boards. {workspaceMembers.length} member{workspaceMembers.length !== 1 ? 's' : ''} available. Click on the search field above to see them.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Owner Search Message */}
          {isOwnerSearch && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  👑
                </div>
                <div>
                  <div className="font-medium text-blue-900">You are the owner of this board</div>
                  <div className="text-sm text-blue-700">You don't need to invite yourself!</div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !isOwnerSearch && selectedBoard && (
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

          {/* Non-Workspace Users Message */}
          {showNonWorkspaceMessage && nonWorkspaceUsers.length > 0 && selectedBoard && (
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-3">
                <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  ⚠
                </div>
                <div>
                  <div className="text-sm font-medium text-orange-900">User Not in Workspace</div>
                  <div className="text-xs text-orange-700">
                    The user you're looking for is not a member of this workspace.
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                {nonWorkspaceUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-white border border-orange-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {user.username?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{user.username}</div>
                        {user.email && (
                          <div className="text-sm text-gray-500">{user.email}</div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => inviteToWorkspaceAndBoard(user)}
                      disabled={adding}
                      className="px-3 py-1 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    >
                      {adding ? "Inviting..." : "Invite to Workspace & Board"}
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-3 p-2 bg-orange-100 rounded text-xs text-orange-800">
                <strong>Note:</strong> This will invite them to both the workspace and the board. They'll be added to the board once they accept the workspace invitation.
              </div>
            </div>
          )}

          {/* No Results Message */}
          {searchQuery && searchResults.length === 0 && !loading && !isOwnerSearch && !showNonWorkspaceMessage && selectedBoard && (
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
              onClick={addMembersToBoard}
              disabled={selectedMembers.length === 0 || !selectedBoard || adding}
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

function CreateBoardModal({ workspaceId, workspaceName, userId, onClose, onCreated, workspaceMembers = [] }) {
  const [title, setTitle] = useState("");
  const [templateCategory, setTemplateCategory] = useState("personal");
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);

  const canSubmit = title.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      console.log("Creating board with workspace_id:", workspaceId, "parsed:", parseInt(workspaceId));
      
      // Create the board first
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .insert([
          {
            title: title.trim(),
            workspace_id: parseInt(workspaceId),
            background_image: selectedImage || null,
            user_id: userId,
            members: [], // Initialize empty members array
          },
        ])
        .select()
        .single();

      if (boardError) throw boardError;
      
      console.log("Board created successfully:", boardData);

      // Send invitations if members are selected
      if (selectedMembers.length > 0) {
        const invitationsToSend = selectedMembers.map(member => ({
          board_id: boardData.id,
          invited_user_id: member.id,
          invited_by_user_id: userId,
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

  return (
    <div className="fixed inset-0 z-50 animate-fade-in">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl p-6 overflow-auto animate-slide-in-right">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Create board in {workspaceName}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-50 rounded transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Template category */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template category
          </label>
          <select
            value={templateCategory}
            onChange={(e) => {
              setTemplateCategory(e.target.value);
              setSelectedImage(null);
            }}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          >
            {Object.entries(TEMPLATE_CATEGORIES).map(([key, c]) => (
              <option key={key} value={key}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Preview images */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {TEMPLATE_CATEGORIES[templateCategory].images.map((img) => (
            <div
              key={img}
              onClick={() => setSelectedImage(img)}
              className={`h-16 w-full rounded-lg bg-cover bg-center cursor-pointer border-2 ${
                selectedImage === img
                  ? "border-blue-500"
                  : "border-transparent"
              }`}
              style={{ backgroundImage: `url(${img})` }}
            />
          ))}
        </div>

        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Board title <span className="text-red-500">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="Enter board title"
          />
        </div>

         {/* Invite Members */}
         <div className="mb-6">
           <label className="block text-sm font-medium text-gray-700 mb-2">
             Invite Members
           </label>
           <button
             onClick={() => setShowInviteModal(true)}
             className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-left hover:border-gray-400 flex items-center justify-between"
           >
             <span className={selectedMembers.length > 0 ? "text-gray-900" : "text-gray-500"}>
               {selectedMembers.length > 0 
                 ? `${selectedMembers.length} member${selectedMembers.length !== 1 ? 's' : ''} selected`
                 : "Click to invite members by email or username"
               }
             </span>
             <Users className="h-4 w-4 text-gray-400" />
           </button>
           
           {/* Selected Members Preview */}
           {selectedMembers.length > 0 && (
             <div className="mt-2 space-y-1">
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
                     onClick={() => setSelectedMembers(prev => prev.filter(m => m.id !== member.id))}
                     className="p-1 hover:bg-red-100 rounded"
                   >
                     <X className="h-4 w-4 text-red-500" />
                   </button>
                 </div>
               ))}
             </div>
           )}
         </div>

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg"
        >
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>

      {/* Invite Members Modal */}
      {showInviteModal && (
        <InviteMembersModal
          selectedMembers={selectedMembers}
          setSelectedMembers={setSelectedMembers}
          onClose={() => setShowInviteModal(false)}
          workspaceMembers={workspaceMembers}
        />
      )}
    </div>
  );
}

// Invite Members Modal Component for Create Board
function InviteMembersModal({ selectedMembers, setSelectedMembers, onClose, workspaceMembers = [] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwnerSearch, setIsOwnerSearch] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

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

  // Filter workspace members based on search query
  const filteredWorkspaceMembers = workspaceMembers.filter(member => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      member.username?.toLowerCase().includes(query) ||
      member.email?.toLowerCase().includes(query)
    );
  });

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

      // Only search within workspace members
      const filteredMembers = workspaceMembers.filter(member => 
        member.username?.toLowerCase().includes(query.toLowerCase()) ||
        member.email?.toLowerCase().includes(query.toLowerCase())
      );

      setSearchResults(filteredMembers);
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Invite Members</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError(""); // Clear errors when user starts typing
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Search workspace members..."
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
            
            {/* Workspace Members Dropdown */}
            {showDropdown && filteredWorkspaceMembers.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                <div className="p-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                  Workspace Members
                </div>
                {filteredWorkspaceMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      handleUserSelect(member);
                      setShowDropdown(false);
                    }}
                    className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                        {member.username?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.username}
                        </div>
                        {member.email && (
                          <div className="text-sm text-gray-500">{member.email}</div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
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
                  <div className="font-medium text-blue-900">You are the board creator</div>
                  <div className="text-sm text-blue-700">You don't need to invite yourself!</div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !isOwnerSearch && (
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
          {searchQuery && searchResults.length === 0 && !loading && !isOwnerSearch && (
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
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-sm text-red-600">{error}</div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

