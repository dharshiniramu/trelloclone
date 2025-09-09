"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Plus, FolderOpen, Layout, Trash, X, Star } from "lucide-react";
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
  const [workspaces, setWorkspaces] = useState([
    { id: null, name: "No workspace" },
  ]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
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

      const { data: wsData, error: wsError } = await supabase
        .from("workspaces")
        .select("id, name");

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
        alert("Only board owners can delete boards");
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
        <div className="flex items-center gap-3">
          <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm">
            Add members
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

              {/* Trash delete button - only show for owners */}
              {getUserRole(b) === 'Owner' && (
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

      {showCreate && (
        <CreateBoardModal
          workspaces={workspaces}
          onClose={() => setShowCreate(false)}
          onCreated={addBoard}
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
  const [members, setMembers] = useState("");
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

      const { data, error } = await supabase
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

      if (error) throw error;
      onCreated(data);
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

        {/* Members */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Add members
          </label>
          <input
            value={members}
            onChange={(e) => setMembers(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
            placeholder="Enter emails separated by commas"
          />
        </div>

        <button
          onClick={submit}
          disabled={!canSubmit || submitting}
          className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg"
        >
          {submitting ? "Creating..." : "Create"}
        </button>
      </div>
    </div>
  );
}
