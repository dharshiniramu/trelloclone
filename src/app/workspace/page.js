"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { Plus, X, Building2, Trash } from "lucide-react";
import { supabase } from "@/lib/supabaseClient"; // 👈 you need to create this file like I showed before

export default function WorkspacePage() {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(false);
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

  // ✅ Load workspaces from DB
  const loadWorkspaces = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.from("workspaces").select("*");
      if (error) throw error;
      setWorkspaces(data);
    } catch (err) {
      console.error("Error loading workspaces:", err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadWorkspaces();
    }
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
                <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200 hover:shadow-sm">
                  Add members
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
                No workspaces found. Create one!
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
    <div className="font-semibold text-gray-900">{workspace.name}</div>

    {/* 🗑️ Trash delete button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        deleteWorkspace(workspace.id);
      }}
      className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded"
    >
      <Trash className="h-4 w-4 text-red-500" />
    </button>
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
    </>
  );
}

function CreateWorkspaceModal({ onClose, onCreated }) {
  const [name, setName] = useState("");
  const canSubmit = name.trim().length > 0;

  const submit = async () => {
    if (!canSubmit) return;
    await onCreated({ name: name.trim() });
    onClose();
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

        <button
          onClick={submit}
          disabled={!canSubmit}
          className="w-full bg-blue-600 text-white py-2 rounded-lg disabled:opacity-50 transition-all duration-200 hover:bg-blue-700 hover:shadow-lg"
        >
          Create
        </button>
      </div>
    </div>
  );
}
