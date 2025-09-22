"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Plus, FolderOpen, Layout, Trash, X, Star, Users, Edit, ChevronUp, ChevronDown } from "lucide-react";
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

export default function BoardsPage() {
  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <BoardsContent />
        </main>
      </div>
    </>
  );
}

function BoardsContent() {
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Helper function to get user's role in a board
  const getUserRole = (board) => {
    if (!currentUser || !board) return 'Member';
    if (board.user_id === currentUser.id) return 'Owner';
    const member = board.members?.find(m => m.user_id === currentUser.id);
    return member?.role || 'Member';
  };

  // ✅ Load boards + workspaces (only boards where user is owner/member)
  const load = async () => {
    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error getting user:", userError);
        setBoards([]);
        setLoading(false);
        return;
      }
      
      setCurrentUser(user);

      // Fetch all boards and filter client-side for now
      // TODO: Optimize with server-side filtering using PostgreSQL JSONB queries
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*");

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

      // Fetch user's favorite boards
      const { data: favoritesData, error: favoritesError } = await supabase
        .from("board_favorites")
        .select("board_id")
        .eq("user_id", user.id);

      if (favoritesError) {
        console.error("Error loading favorites:", favoritesError);
      }

      const favoriteBoardIds = new Set((favoritesData || []).map(fav => fav.board_id));

      // Add favorite status to boards and sort (favorites first)
      const boardsWithFavorites = userBoards.map(board => ({
        ...board,
        isFavorite: favoriteBoardIds.has(board.id)
      }));

      // Sort boards: favorites first, then by creation date
      const sortedBoards = boardsWithFavorites.sort((a, b) => {
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      });

      setBoards(sortedBoards);

      // Only fetch workspaces where the current user is the owner
      const { data: wsData, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name")
        .eq("user_id", user.id);

      if (wsError) throw wsError;
      setWorkspaces([{ id: null, name: "No workspace" }, ...(wsData || [])]);
    } catch (err) {
      console.error("Error loading boards:", err.message);
      setBoards([]); // Ensure boards is always an array
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Refresh boards when user returns to the page (e.g., after accepting invitations)
  useEffect(() => {
    const handleFocus = () => {
      load();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  const addBoard = (board) => {
    setBoards((prev) => [...prev, board]);
  };

  // ✅ Navigation
  const handleBoardClick = (boardId) => {
    if (!boardId) return;
    router.push(`/board/${boardId}`);
  };

  // ✅ Delete (only owners can delete boards)
  const deleteBoard = async (boardId) => {
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error getting user:", userError);
        return;
      }

      // Find the board to check permissions
      const board = (boards || []).find(b => b.id === boardId);
      if (!board) {
        console.error("Board not found");
        return;
      }

      // Check if user is the board owner
      const isOwner = board.user_id === user.id || 
        (board.members && board.members.some(member => 
          member.user_id === user.id && member.role === 'owner'
        ));

      if (!isOwner) {
        console.error("Only board owners can delete boards");
        return;
      }

      const { error } = await supabase.from("boards").delete().eq("id", boardId);
      if (error) throw error;
      setBoards((prev) => prev.filter((b) => b.id !== boardId));
    } catch (err) {
      console.error("Error deleting board:", err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-gray-900">Boards</h1>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>Refresh</span>
        </button>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowInviteModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm"
          >
            <Users className="h-4 w-4 mr-2" />
            Invite Members
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" /> Create board
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-gray-500 animate-fade-in">Loading...</div>
      ) : boards.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center animate-fade-in-up">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
            <FolderOpen className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-1">
            No boards created so far
          </p>
          <p className="text-gray-500 mb-6">
            Create your first board to start organizing tasks.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" /> Create board
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 animate-fade-in-up">
          {(boards || []).map((b, index) => (
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
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-gray-900 flex-1 truncate">{b.title}</div>
                  {b.isFavorite && (
                    <Star className="h-4 w-4 text-red-500 fill-current flex-shrink-0 ml-2" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-1">
                  {b.workspace_id ? (
                    <div className="text-sm text-gray-500">
                      Workspace #{b.workspace_id}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-400">No workspace</div>
                  )}
                  {/* Show user's role in this board */}
                  <div className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-800">
                    {getUserRole(b)}
                  </div>
                </div>
              </div>

              {/* Action buttons - only show for owners */}
              {getUserRole(b) === 'Owner' && (
                <div className="absolute top-2 right-2 flex gap-1">
                  {/* Edit button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingBoard(b);
                      setShowEditModal(true);
                    }}
                    className="p-1 bg-white/80 hover:bg-blue-100 rounded"
                  >
                    <Edit className="h-4 w-4 text-blue-500" />
                  </button>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteBoard(b.id);
                    }}
                    className="p-1 bg-white/80 hover:bg-red-100 rounded"
                  >
                    <Trash className="h-4 w-4 text-red-500" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBoardModal
          workspaces={workspaces}
          onClose={() => setShowCreate(false)}
          onCreated={addBoard}
        />
      )}

      {showInviteModal && (
        <InviteMembersToBoardModal
          boards={boards}
          currentUser={currentUser}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {showEditModal && editingBoard && (
        <EditBoardModal
          board={editingBoard}
          workspaces={workspaces}
          onClose={() => {
            setShowEditModal(false);
            setEditingBoard(null);
          }}
          onUpdated={(updatedBoard) => {
            setBoards(prev => prev.map(b => b.id === updatedBoard.id ? updatedBoard : b));
            setShowEditModal(false);
            setEditingBoard(null);
          }}
        />
      )}
    </div>
  );
}

function CreateBoardModal({ workspaces, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [workspaceId, setWorkspaceId] = useState(workspaces?.[0]?.id ?? null);
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
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error getting user:", userError);
        return;
      }

      // Create the board first
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .insert([
          {
            title: title.trim(),
            workspace_id: workspaceId || null,
            background_image: selectedImage || null,
            user_id: user.id, // Add the current user as the board creator
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
          invited_by_user_id: user.id,
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
          <h2 className="text-xl font-semibold">Create board</h2>
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

        {/* Workspace */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Workspace name
          </label>
          <select
            value={workspaceId ?? ""}
            onChange={(e) =>
              setWorkspaceId(
                e.target.value === "" ? null : Number(e.target.value)
              )
            }
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
          >
            {workspaces.map((w) => (
              <option key={String(w.id)} value={w.id ?? ""}>
                {w.name}
              </option>
            ))}
          </select>
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
        />
      )}
    </div>
  );
}

// Edit Board Modal Component
function EditBoardModal({ board, workspaces, onClose, onUpdated }) {
  const [title, setTitle] = useState(board?.title || "");
  const [workspaceId, setWorkspaceId] = useState(board?.workspace_id || null);
  const [templateCategory, setTemplateCategory] = useState("personal");
  const [selectedImage, setSelectedImage] = useState(board?.background_image || null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error("Error getting user:", userError);
        return;
      }

      // Update the board
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .update({
          title: title.trim(),
          workspace_id: workspaceId || null,
          background_image: selectedImage || null,
        })
        .eq("id", board.id)
        .select()
        .single();

      if (boardError) throw boardError;

      onUpdated(boardData);
    } catch (err) {
      console.error("Error updating board:", err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Edit Board</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Template Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Template category
            </label>
            <select
              value={templateCategory}
              onChange={(e) => setTemplateCategory(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {Object.entries(TEMPLATE_CATEGORIES).map(([key, category]) => (
                <option key={key} value={key}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          {/* Background Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Background
            </label>
            <div className="grid grid-cols-4 gap-2">
              {TEMPLATE_CATEGORIES[templateCategory].images.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(image)}
                  className={`aspect-video rounded-lg overflow-hidden border-2 ${
                    selectedImage === image
                      ? "border-blue-500"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <img
                    src={image}
                    alt={`Background ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Workspace Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Workspace name
            </label>
            <select
              value={workspaceId || ""}
              onChange={(e) => setWorkspaceId(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {workspaces.map((workspace) => (
                <option key={workspace.id || "no-workspace"} value={workspace.id || ""}>
                  {workspace.name}
                </option>
              ))}
            </select>
          </div>

          {/* Board Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Board title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter board title"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
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
            <span>{submitting ? 'Saving...' : 'Save Board'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

// Invite Members Modal Component for Create Board
function InviteMembersModal({ selectedMembers, setSelectedMembers, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [isOwnerSearch, setIsOwnerSearch] = useState(false);

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
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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

// Invite Members to Board Modal Component
function InviteMembersToBoardModal({ boards, currentUser, onClose }) {
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
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [showWorkspaceMembers, setShowWorkspaceMembers] = useState(false);
  const [loadingWorkspaceMembers, setLoadingWorkspaceMembers] = useState(false);
  const [existingBoardMembers, setExistingBoardMembers] = useState([]);
  const [availableMembers, setAvailableMembers] = useState([]);

  // Filter boards where current user is owner or admin
  const ownedBoards = boards.filter(board => {
    if (!currentUser) return false;
    
    // Check if user is the board owner
    if (board.user_id === currentUser.id) return true;
    
    // Check if user is an admin member
    if (board.members && Array.isArray(board.members)) {
      return board.members.some(member => 
        member.user_id === currentUser.id && 
        (member.role === 'owner' || member.role === 'admin')
      );
    }
    
    return false;
  });

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

  // Load workspace information and board members when board is selected
  useEffect(() => {
    if (selectedBoard) {
      loadWorkspaceInfo(selectedBoard.workspace_id);
      loadExistingBoardMembers(selectedBoard.id);
    } else {
      setWorkspaceInfo(null);
      setWorkspaceMembers([]);
      setExistingBoardMembers([]);
      setAvailableMembers([]);
    }
  }, [selectedBoard]);

  // Load workspace information and members
  const loadWorkspaceInfo = async (workspaceId) => {
    console.log("🔍 Loading workspace info for workspace ID:", workspaceId);
    if (!workspaceId) {
      console.log("❌ No workspace ID provided");
      setWorkspaceInfo(null);
      setWorkspaceMembers([]);
      return;
    }
    
    try {
      // Get workspace info
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id, name, user_id")
        .eq("id", workspaceId)
        .single();

      if (workspaceError) {
        console.error("Error fetching workspace:", workspaceError);
        return;
      }

      console.log("✅ Workspace info loaded:", workspaceData);
      setWorkspaceInfo(workspaceData);
      loadWorkspaceMembers(workspaceId);
    } catch (error) {
      console.error("Error loading workspace info:", error);
    }
  };

  // Load workspace members
  const loadWorkspaceMembers = async (workspaceId) => {
    console.log("👥 Loading workspace members for workspace ID:", workspaceId);
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

      console.log("👑 Workspace owner:", ownerProfile);
      // Start with workspace owner
      let allWorkspaceMembers = [ownerProfile];

      // Get accepted workspace members (excluding owner)
      const { data: invitations, error: invitationError } = await supabase
        .from("workspace_invitations")
        .select("invited_user_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "accepted");

      if (invitationError) {
        console.error("Error loading workspace invitations:", invitationError);
        // Still set workspace members with just the owner
        setWorkspaceMembers(allWorkspaceMembers);
        if (selectedBoard) {
          updateAvailableMembers(allWorkspaceMembers, existingBoardMembers, selectedBoard.user_id);
        }
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
          // Still set workspace members with just the owner
          setWorkspaceMembers(allWorkspaceMembers);
        } else {
          // Combine owner and invited members
          allWorkspaceMembers = [...allWorkspaceMembers, ...(memberProfiles || [])];
          console.log("✅ All workspace members loaded:", allWorkspaceMembers);
          setWorkspaceMembers(allWorkspaceMembers);
          // Update available members when workspace members are loaded
          if (selectedBoard) {
            updateAvailableMembers(allWorkspaceMembers, existingBoardMembers, selectedBoard.user_id);
          }
        }
      } else {
        // No invited members, just the owner
        setWorkspaceMembers(allWorkspaceMembers);
        if (selectedBoard) {
          updateAvailableMembers(allWorkspaceMembers, existingBoardMembers, selectedBoard.user_id);
        }
      }
    } catch (error) {
      console.error("Error loading workspace members:", error);
      setWorkspaceMembers([]);
    } finally {
      setLoadingWorkspaceMembers(false);
    }
  };

  // Load existing board members
  const loadExistingBoardMembers = async (boardId) => {
    if (!boardId) {
      setExistingBoardMembers([]);
      setAvailableMembers([]);
      return;
    }

    try {
      // Get the board data to access members array
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("members, user_id")
        .eq("id", boardId)
        .single();

      if (boardError) {
        console.error("Error loading board data:", boardError);
        setExistingBoardMembers([]);
        setAvailableMembers([]);
        return;
      }

      const members = boardData.members || [];
      const memberIds = members.map(member => member.user_id);
      
      // Add the board owner to the existing members list
      const allExistingMemberIds = [...memberIds, boardData.user_id];

      // Get profiles for existing members
      let memberProfiles = [];
      if (allExistingMemberIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", allExistingMemberIds);

        if (profilesError) {
          console.error("Error loading member profiles:", profilesError);
          setExistingBoardMembers([]);
        } else {
          memberProfiles = profiles || [];
          setExistingBoardMembers(memberProfiles);
        }
      } else {
        setExistingBoardMembers([]);
      }

      // Update available members by filtering out existing members
      updateAvailableMembers(workspaceMembers, memberProfiles, boardData.user_id);
    } catch (error) {
      console.error("Error loading existing board members:", error);
      setExistingBoardMembers([]);
      setAvailableMembers([]);
    }
  };

  // Update available members by filtering out existing board members
  const updateAvailableMembers = (workspaceMembersList, existingMembers, boardOwnerId) => {
    console.log("🔄 Updating available members:");
    console.log("  - Workspace members:", workspaceMembersList);
    console.log("  - Existing board members:", existingMembers);
    console.log("  - Board owner ID:", boardOwnerId);
    
    if (!workspaceInfo) {
      // If not in a workspace, we'll handle this in the search function
      console.log("❌ No workspace info, clearing available members");
      setAvailableMembers([]);
      return;
    }

    // Filter out those who are already on the board (including the board owner)
    const available = workspaceMembersList.filter(member => 
      !existingMembers.some(existing => existing.id === member.id) &&
      member.id !== boardOwnerId
    );

    console.log("✅ Available members after filtering:", available);
    setAvailableMembers(available);
  };

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

      // If board is not in a workspace, allow searching all users
      if (!workspaceInfo) {
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
        return;
      }

      // If board is in a workspace, search within all workspace members
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

      // Verify user is the owner or admin of the selected board
      const isOwner = selectedBoard.user_id === user.id;
      const isAdmin = selectedBoard.members && selectedBoard.members.some(member => 
        member.user_id === user.id && member.role === 'admin'
      );
      
      if (!isOwner && !isAdmin) {
        setError("You can only invite members to boards you own or administer.");
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

      // Check workspace membership if board is in a workspace
      if (workspaceInfo) {
        const nonWorkspaceMembers = selectedMembers.filter(selectedMember => 
          !workspaceMembers.some(workspaceMember => workspaceMember.id === selectedMember.id)
        );

        if (nonWorkspaceMembers.length > 0) {
          const memberNames = nonWorkspaceMembers.map(member => member.username).join(', ');
          setError(`${memberNames} ${nonWorkspaceMembers.length === 1 ? 'is' : 'are'} not members of the workspace "${workspaceInfo.name}". Only workspace members can be invited to boards.`);
          return;
        }
      }

      // For users who previously declined invitations, delete the old invitation record
      // so we can create a new one
      const declinedInvitations = selectedMembers.filter(selectedMember => 
        existingInvitations?.some(invitation => 
          invitation.invited_user_id === selectedMember.id && invitation.status === 'declined'
        )
      );

      if (declinedInvitations.length > 0) {
        console.log("Found users who previously declined invitations, cleaning up old records:", declinedInvitations);
        
        const declinedUserIds = declinedInvitations.map(member => member.id);
        const { error: deleteError } = await supabase
          .from("board_invitations")
          .delete()
          .eq("board_id", selectedBoard.id)
          .in("invited_user_id", declinedUserIds)
          .eq("status", "declined");

        if (deleteError) {
          console.error("Error deleting declined invitations:", deleteError);
          // Continue anyway - the new invitation might still work
        } else {
          console.log("Successfully cleaned up declined invitation records");
        }
      }

      // Filter out users who are already members or have pending invitations
      // Allow re-inviting users who previously declined invitations (we just cleaned up their old records)
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

      // Send invitations
      const { data, error } = await supabase
        .from("board_invitations")
        .insert(invitationsToSend)
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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900">Invite Members to Board</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
                You don't have permission to invite members to any boards yet. Create a board or become an admin first.
              </p>
            )}
          </div>

          {/* Workspace Info */}
          {workspaceInfo && selectedBoard && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  🏢
                </div>
                <div>
                  <div className="font-medium text-blue-900">Workspace Board</div>
                  <div className="text-sm text-blue-700">This board belongs to "{workspaceInfo.name}" workspace</div>
                  <div className="text-xs text-blue-600 mt-1">Only workspace members can be invited to this board</div>
                </div>
              </div>
            </div>
          )}

          {/* Existing Board Members */}
          {existingBoardMembers.length > 0 && selectedBoard && (
            <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  👥
                </div>
                <div className="font-medium text-gray-900">Current Board Members</div>
              </div>
              <div className="space-y-1">
                {existingBoardMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center space-x-2 text-sm"
                  >
                    <div className="w-6 h-6 bg-gray-400 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {member.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{member.username}</div>
                      {member.email && (
                        <div className="text-xs text-gray-500">{member.email}</div>
                      )}
                    </div>
                    {member.id === selectedBoard.user_id && (
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        Owner
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Workspace Members Dropdown Toggle */}
          {workspaceInfo && workspaceMembers.length > 0 && selectedBoard && (
            <div className="space-y-2">
              <button
                onClick={() => setShowWorkspaceMembers(!showWorkspaceMembers)}
                className="flex items-center justify-between w-full p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <span className="text-sm font-medium text-gray-700">
                  View Workspace Members ({workspaceMembers.length})
                </span>
                {showWorkspaceMembers ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {showWorkspaceMembers && (
                <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {workspaceMembers.map((member) => {
                    const isAlreadyOnBoard = existingBoardMembers.some(existing => existing.id === member.id);
                    const isBoardOwner = member.id === selectedBoard.user_id;
                    const canInvite = !isAlreadyOnBoard && !isBoardOwner;
                    
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center space-x-3 p-3 border-b border-gray-100 last:border-b-0 ${
                          !canInvite ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                          {member.username?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">
                            {member.username}
                          </div>
                          {member.email && (
                            <div className="text-sm text-gray-500">{member.email}</div>
                          )}
                          {isBoardOwner && (
                            <div className="text-xs text-blue-600 font-medium">Board Owner</div>
                          )}
                          {isAlreadyOnBoard && !isBoardOwner && (
                            <div className="text-xs text-orange-600 font-medium">Already on Board</div>
                          )}
                        </div>
                        {canInvite ? (
                          <button
                            onClick={() => handleUserSelect(member)}
                            className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors duration-200"
                          >
                            Invite
                          </button>
                        ) : (
                          <span className="px-3 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                            {isBoardOwner ? 'Owner' : 'On Board'}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* No Available Members Message */}
          {workspaceInfo && availableMembers.length === 0 && selectedBoard && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-yellow-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  !
                </div>
                <div>
                  <div className="font-medium text-yellow-900">
                    {workspaceMembers.length === 0 
                      ? "No workspace members to invite" 
                      : "All workspace members are already on this board"
                    }
                  </div>
                  <div className="text-sm text-yellow-700">
                    {workspaceMembers.length === 0 
                      ? "Add members to the workspace first" 
                      : "There are no available members to invite"
                    }
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Input */}
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setError(""); // Clear errors when user starts typing
              }}
              disabled={!selectedBoard}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              placeholder={selectedBoard ? (workspaceInfo ? "Search available members..." : "Search by email or username...") : "Select a board first..."}
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
                  <div className="font-medium text-blue-900">You are the owner of this board</div>
                  <div className="text-sm text-blue-700">You don't need to invite yourself!</div>
                </div>
              </div>
            </div>
          )}

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && !isOwnerSearch && selectedBoard && (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
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
          {searchQuery && searchResults.length === 0 && !loading && !isOwnerSearch && selectedBoard && (
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
                : error.includes('not members of the workspace')
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className={`text-sm ${
                error.includes('already a member') 
                  ? 'text-orange-600' 
                  : error.includes('not members of the workspace')
                  ? 'text-yellow-600'
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
                {error.includes('not members of the workspace') && (
                  <div className="flex items-center space-x-2 mb-1">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">!</span>
                    </div>
                    <span className="font-medium">Workspace Membership Required</span>
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

        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-3 p-6 border-t border-gray-200 flex-shrink-0">
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
  );
}