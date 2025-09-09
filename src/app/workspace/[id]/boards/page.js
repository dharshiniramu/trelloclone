"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Plus, FolderOpen, Layout, Trash, X, ArrowLeft } from "lucide-react";
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
  const [user, setUser] = useState(null);

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

      // Load boards for this workspace
      const { data: boardsData, error: boardsError } = await supabase
        .from("boards")
        .select("*")
        .eq("workspace_id", workspaceId);

      if (boardsError) throw boardsError;
      setBoards(boardsData || []);
    } catch (err) {
      console.error("Error loading workspace boards:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workspaceId) {
      load();
    }
  }, [workspaceId]);

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
      <div className="flex items-center gap-4 mb-6 animate-fade-in">
        <button
          onClick={handleBackToWorkspaces}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{workspace.name}</h1>
          <p className="text-gray-500">Boards in this workspace</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
          >
            <Plus className="h-4 w-4 mr-2" /> Create board
          </button>
        </div>
      </div>

      {boards.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-10 text-center animate-fade-in-up">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
            <FolderOpen className="h-7 w-7 text-blue-600" />
          </div>
          <p className="text-lg font-medium text-gray-900 mb-1">
            No boards in this workspace
          </p>
          <p className="text-gray-500 mb-6">
            Create your first board to start organizing tasks in this workspace.
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

              {/* Trash delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteBoard(b.id);
                }}
                className="absolute top-2 right-2 p-1 bg-white/80 hover:bg-red-100 rounded"
              >
                <Trash className="h-4 w-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateBoardModal
          workspaceId={workspaceId}
          workspaceName={workspace.name}
          userId={user?.id}
          onClose={() => setShowCreate(false)}
          onCreated={addBoard}
        />
      )}
    </div>
  );
}

function CreateBoardModal({ workspaceId, workspaceName, userId, onClose, onCreated }) {
  const [title, setTitle] = useState("");
  const [templateCategory, setTemplateCategory] = useState("personal");
  const [selectedImage, setSelectedImage] = useState(null);
  const [members, setMembers] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = title.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("boards")
        .insert([
          {
            title: title.trim(),
            workspace_id: workspaceId,
            background_image: selectedImage || null,
            user_id: userId,
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

