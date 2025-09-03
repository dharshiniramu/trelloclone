"use client";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/lib/supabaseClient";
import {
  Plus,
  Filter,
  Star,
  Share2,
  Users,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  X,
  Trash,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";


export default function BoardViewPage() {
  const params = useParams();
  const boardId = params.id;
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadBoard = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("boards")
          .select("*")
          .eq("id", boardId)
          .single();

        if (error) throw error;
        setBoard(data);
      } catch (err) {
        console.error("Error fetching board:", err.message);
        setBoard(null);
      } finally {
        setLoading(false);
      }
    };

    if (boardId) loadBoard();
  }, [boardId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500">Loading board...</div>
          </div>
        </div>
      </>
    );
  }

  if (!board) {
    return (
      <>
        <Navbar />
        <div className="flex h-[calc(100vh-64px)] bg-gray-50">
          <Sidebar />
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500">Board not found</div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <BoardView board={board} />
        </main>
      </div>
    </>
  );
}

function BoardView({ board }) {
  const [lists, setLists] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showExistingMembersModal, setShowExistingMembersModal] = useState(false);
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

  // Helper function to check if current user is board owner
  const isBoardOwner = () => {
    if (!currentUser || !board) return false;
    return board.user_id === currentUser.id;
  };

  useEffect(() => {
    if (!board?.id) return;

    const fetchListsAndCards = async () => {
      const { data: listsData, error: listsError } = await supabase
        .from("lists")
        .select("id, name")
        .eq("board_id", board.id);

      if (listsError) {
        console.error("Error loading lists:", listsError.message);
        return;
      }

      const listsWithCards = await Promise.all(
        listsData.map(async (list) => {
          const { data: cards, error: cardsError } = await supabase
            .from("cards")
            .select("id, title, description, due_date, label, list_id")
            .eq("list_id", list.id);

          if (cardsError) {
            console.error("Error loading cards:", cardsError.message);
            return { ...list, cards: [] };
          }
          return { ...list, cards, collapsed: false };
        })
      );

      setLists(listsWithCards);
    };

    fetchListsAndCards();
  }, [board]);

  const addCard = async (listId) => {
    const { data, error } = await supabase
      .from("cards")
      .insert([{ title: "New Card", list_id: listId }])
      .select()
      .single();

    if (error) {
      console.error("Error adding card:", error.message);
      return;
    }

    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, cards: [...list.cards, data] } : list
      )
    );
  };

  const addNewList = async () => {
    if (!newListTitle.trim()) return;

    const { data, error } = await supabase
      .from("lists")
      .insert([{ name: newListTitle.trim(), board_id: board.id }])
      .select()
      .single();

    if (error) {
      console.error("Error adding list:", error.message);
      return;
    }

    setLists((prev) => [...prev, { ...data, cards: [], collapsed: false }]);
    setNewListTitle("");
    setShowNewListInput(false);
  };

  const updateCard = (listId, cardId, updates) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId
          ? {
              ...list,
              cards: list.cards.map((c) =>
                c.id === cardId ? { ...c, ...updates } : c
              ),
            }
          : list
      )
    );
  };

  const toggleCollapse = (listId) => {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, collapsed: !list.collapsed } : list
      )
    );
  };

  const handleCardClick = (card) => {
    setEditingCard(card);
    setShowCardModal(true);
  };

  // Drag handler
  const handleDragEnd = async (result) => {
    const { source, destination } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    const sourceListId = source.droppableId;
    const destListId = destination.droppableId;

    // Find card
    const sourceList = lists.find((l) => l.id.toString() === sourceListId);
    const [movedCard] = sourceList.cards.splice(source.index, 1);

    const destList = lists.find((l) => l.id.toString() === destListId);
    destList.cards.splice(destination.index, 0, movedCard);

    setLists([...lists]);

    // Update in DB
    const { error } = await supabase
      .from("cards")
      .update({ list_id: parseInt(destListId, 10) })
      .eq("id", movedCard.id);

    if (error) {
      console.error("Error moving card:", error.message);
    }
  };
  const deleteList = async (listId) => {
  const { error } = await supabase.from("lists").delete().eq("id", listId);

  if (error) {
    console.error("Error deleting list:", error.message);
    return;
  }

  setLists((prev) => prev.filter((list) => list.id !== listId));
};
const deleteCard = async (listId, cardId) => {
  const { error } = await supabase.from("cards").delete().eq("id", cardId);

  if (error) {
    console.error("Error deleting card:", error.message);
    return;
  }

  setLists((prev) =>
    prev.map((list) =>
      list.id === listId
        ? { ...list, cards: list.cards.filter((c) => c.id !== cardId) }
        : list
    )
  );
};


  return (
    <div
  className="h-full relative"
  style={{
    backgroundImage: board?.background_image
      ? `url(${board.background_image})`
      : "none",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundColor: board?.background_image ? "transparent" : "#FEF9C3", // fallback yellow
  }}
>

      {/* Board Header */}
      <div className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{board.title}</h1>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <Filter className="h-4 w-4" />
              <span>Filter</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <Star className="h-4 w-4" />
              <span>Favorites</span>
            </button>
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <Share2 className="h-4 w-4" />
              <span>Share</span>
            </button>
            {/* Only show Invite Members button for board owners */}
            {isBoardOwner() && (
              <button 
                onClick={() => setShowAddMembersModal(true)}
                className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Users className="h-4 w-4" />
                <span>Invite Members</span>
              </button>
            )}
            <button 
              onClick={() => setShowExistingMembersModal(true)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              <Users className="h-4 w-4" />
              <span>Existing Members</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Lists with DnD */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="relative z-10 p-6 pb-20 flex space-x-6 h-full overflow-x-auto">
          {lists.map((list) => (
            <div key={list.id} className="flex-shrink-0 w-80">
              <div className="bg-white/90 rounded-lg shadow-sm border border-gray-200">
                <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
  <h3 className="font-semibold">{list.name}</h3>
  <div className="flex items-center space-x-2">
    <button
      onClick={() => toggleCollapse(list.id)}
      className="p-1 hover:bg-gray-100 rounded"
    >
      {list.collapsed ? (
        <ChevronDown className="h-4 w-4 text-gray-500" />
      ) : (
        <ChevronUp className="h-4 w-4 text-gray-500" />
      )}
    </button>
    <button
      onClick={() => deleteList(list.id)}
      className="p-1 hover:bg-red-100 rounded"
    >
      <Trash className="h-4 w-4 text-red-500" />
    </button>
  </div>
</div>

                {!list.collapsed && (
                  <Droppable droppableId={list.id.toString()}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="p-3 space-y-3 min-h-[200px]"
                      >
                        {list.cards.map((card, index) => (
                          <Draggable
  key={card.id}
  draggableId={card.id.toString()}
  index={index}
>
  {(provided) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className="bg-white rounded-lg border p-3 hover:shadow-md cursor-pointer relative"
      onClick={() => handleCardClick(card)}
    >
      <h4 className="font-medium text-sm">{card.title}</h4>
      <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
        {card.label && <span>🏷 {card.label}</span>}
        {card.due_date && (
          <span>
            📅 {new Date(card.due_date).toLocaleDateString()}
          </span>
        )}
      </div>

      {/* ✅ Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // prevent opening modal
          deleteCard(list.id, card.id);
        }}
        className="absolute top-2 right-2 p-1 hover:bg-red-100 rounded"
      >
        <Trash className="h-4 w-4 text-red-500" />
      </button>
    </div>
  )}
</Draggable>

                        ))}
                        {provided.placeholder}
                        <button
                          onClick={() => addCard(list.id)}
                          className="w-full p-3 border-2 border-dashed rounded-lg text-gray-500 hover:border-gray-400 hover:text-gray-600"
                        >
                          <Plus className="h-4 w-4" /> Add a card
                        </button>
                      </div>
                    )}
                  </Droppable>
                )}
              </div>
            </div>
          ))}

          {/* Add new list */}
          {showNewListInput ? (
            <div className="flex-shrink-0 w-80">
              <div className="bg-white/90 p-4 rounded-lg shadow-sm border">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Enter list title..."
                  className="w-full p-2 border rounded-lg mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addNewList}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                  >
                    Add List
                  </button>
                  <button
                    onClick={() => {
                      setShowNewListInput(false);
                      setNewListTitle("");
                    }}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-shrink-0 w-80">
              <button
                onClick={() => setShowNewListInput(true)}
                className="w-full h-12 bg-white/90 rounded-lg shadow-sm border-2 border-dashed text-gray-500"
              >
                <Plus className="h-4 w-4" /> Add another list
              </button>
            </div>
          )}
        </div>
      </DragDropContext>

      {/* Card Edit Modal */}
      {showCardModal && editingCard && (
        <CardEditModal
          card={editingCard}
          onClose={() => setShowCardModal(false)}
          onSave={(updates) => {
            const listId = lists.find((list) =>
              list.cards.some((c) => c.id === editingCard.id)
            )?.id;
            if (listId) {
              updateCard(listId, editingCard.id, updates);
            }
            setShowCardModal(false);
          }}
        />
      )}

      {/* Add Members Modal */}
      {showAddMembersModal && (
        <AddMembersModal
          boardId={board.id}
          onClose={() => setShowAddMembersModal(false)}
        />
      )}

      {/* Existing Members Modal */}
      {showExistingMembersModal && (
        <ExistingMembersModal
          boardId={board.id}
          onClose={() => setShowExistingMembersModal(false)}
        />
      )}
    </div>
  );
}

function CardEditModal({ card, onClose, onSave }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [dueDate, setDueDate] = useState(card.due_date || "");
  const [label, setLabel] = useState(card.label || "");

  const handleSave = async () => {
    const updates = {
      title,
      description,
      due_date: dueDate || null,
      label,
    };

    // Update in Supabase
    const { error } = await supabase
      .from("cards")
      .update(updates)
      .eq("id", card.id);

    if (error) {
      console.error("Error updating card:", error.message);
      return;
    }

    // Update local state
    onSave(updates);
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="text-xl font-semibold text-gray-900 border-none outline-none focus:ring-0 w-full"
            placeholder="Enter card title..."
          />
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add a detailed description..."
          />
        </div>

        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate ? new Date(dueDate).toISOString().split("T")[0] : ""}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="px-6 py-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
            placeholder="Enter label"
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

function AddMembersModal({ boardId, onClose }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Search for users based on email or username
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      // First try to search with email column (for new users)
      let { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      // If that fails (email column might not exist), fallback to username only
      if (profilesError && profilesError.code === '42703') { // column doesn't exist
        const { data: usernameResults, error: usernameError } = await supabase
          .from("profiles")
          .select("id, username")
          .ilike("username", `%${query}%`)
          .limit(10);

        if (!usernameError && usernameResults) {
          setSearchResults(usernameResults.map(p => ({ ...p, email: null })));
        }
      } else if (!profilesError && profiles) {
        setSearchResults(profiles);
      } else if (profilesError) {
        console.error("Error searching profiles:", profilesError);
      }
    } catch (error) {
      console.error("Error searching users:", error);
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
    if (selectedMembers.length === 0) return;

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

      // Get current board data to check existing members and invitations
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("members, title")
        .eq("id", boardId)
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
        .eq("board_id", boardId)
        .in("invited_user_id", selectedMembers.map(m => m.id));

      if (invitationsError) {
        console.error("Error checking existing invitations:", invitationsError);
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
        board_id: parseInt(boardId), // Ensure board_id is an integer
        invited_user_id: member.id,
        invited_by_user_id: user.id,
        role: 'member'
      }));

      console.log("Sending invitations:", invitationsToSend);
      console.log("Board ID:", boardId);
      console.log("Current user ID:", user.id);

      // Validate data before sending
      if (!boardId || !user.id || invitationsToSend.length === 0) {
        setError("Invalid data for sending invitations. Please try again.");
        return;
      }

      // Send invitations
      const { data, error } = await supabase
        .from("board_invitations")
        .insert(invitationsToSend)
        .select();

      if (error) {
        console.error("Error sending invitations:", error);
        console.error("Error details:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint
        });
        
        // Provide more specific error messages
        if (error.code === '42P01') {
          setError("Database table 'board_invitations' doesn't exist. Please run the setup SQL script first.");
        } else if (error.code === '42501') {
          setError("You don't have permission to send invitations.");
        } else if (error.code === '23505') {
          setError("One or more users already have pending invitations for this board.");
        } else if (error.code === '23503') {
          setError("Invalid board or user reference. Please try again.");
        } else {
          setError(`Failed to send invitations: ${error.message || 'Unknown error occurred'}`);
        }
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

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="font-medium text-gray-900">
                    {user.username}
                  </div>
                  {user.email && (
                    <div className="text-sm text-gray-500">{user.email}</div>
                  )}
                </button>
              ))}
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
              onClick={addMembersToBoard}
              disabled={selectedMembers.length === 0 || adding}
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

function ExistingMembersModal({ boardId, onClose }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [leaving, setLeaving] = useState(false);

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

  // Leave board function
  const handleLeaveBoard = async () => {
    if (!currentUser) return;
    
    const confirmLeave = window.confirm(
      "Are you sure you want to leave this board? You won't be able to access it anymore."
    );
    
    if (!confirmLeave) return;

    setLeaving(true);
    try {
      // Get current board data
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("members")
        .eq("id", boardId)
        .single();

      if (boardError) {
        console.error("Error fetching board:", boardError);
        alert("Failed to leave board. Please try again.");
        return;
      }

      // Remove current user from members array
      const updatedMembers = (boardData.members || []).filter(
        member => member.user_id !== currentUser.id
      );

      // Update board with new members array
      const { error: updateError } = await supabase
        .from("boards")
        .update({ members: updatedMembers })
        .eq("id", boardId);

      if (updateError) {
        console.error("Error updating board:", updateError);
        alert("Failed to leave board. Please try again.");
        return;
      }

      alert("You have successfully left the board.");
      onClose(); // Close the modal
      // Optionally redirect to boards page
      window.location.href = '/boards';
      
    } catch (error) {
      console.error("Error leaving board:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setLeaving(false);
    }
  };

  // Check if current user is a member (not owner)
  const isCurrentUserMember = () => {
    if (!currentUser) return false;
    return members.some(member => 
      member.user_id === currentUser.id && member.role !== 'owner'
    );
  };

  // Check if current user is the board owner
  const isCurrentUserOwner = () => {
    if (!currentUser) return false;
    return members.some(member => 
      member.user_id === currentUser.id && member.role === 'owner'
    );
  };

  // Remove member function
  const handleRemoveMember = async (memberToRemove) => {
    if (!currentUser || !isCurrentUserOwner()) return;
    
    const confirmRemove = window.confirm(
      `Are you sure you want to remove ${memberToRemove.username} from this board?`
    );
    
    if (!confirmRemove) return;

    try {
      // Get current board data
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("members")
        .eq("id", boardId)
        .single();

      if (boardError) {
        console.error("Error fetching board:", boardError);
        alert("Failed to remove member. Please try again.");
        return;
      }

      // Remove the member from members array
      const updatedMembers = (boardData.members || []).filter(
        member => member.user_id !== memberToRemove.user_id
      );

      // Update board with new members array
      const { error: updateError } = await supabase
        .from("boards")
        .update({ members: updatedMembers })
        .eq("id", boardId);

      if (updateError) {
        console.error("Error updating board:", updateError);
        alert("Failed to remove member. Please try again.");
        return;
      }

      // Update local state to reflect the change
      setMembers(prevMembers => 
        prevMembers.filter(member => member.user_id !== memberToRemove.user_id)
      );

      alert(`${memberToRemove.username} has been removed from the board.`);
      
    } catch (error) {
      console.error("Error removing member:", error);
      alert("An unexpected error occurred. Please try again.");
    }
  };

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      setError("");
      
      try {
        // Get board data with members
        const { data: boardData, error: boardError } = await supabase
          .from("boards")
          .select("members")
          .eq("id", boardId)
          .single();

        if (boardError) {
          setError("Failed to fetch board members.");
          return;
        }

        const membersArray = boardData.members || [];
        
        if (membersArray.length === 0) {
          setMembers([]);
          return;
        }

        // Get user details for each member
        const userIds = membersArray.map(member => member.user_id);
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error fetching profiles:", profilesError);
          setError("Failed to fetch member details.");
          return;
        }

        // Combine member data with profile data
        const membersWithDetails = membersArray.map(member => {
          const profile = profiles.find(p => p.id === member.user_id);
          return {
            ...member,
            username: profile?.username || 'Unknown User',
            email: profile?.email || null
          };
        });

        setMembers(membersWithDetails);
      } catch (error) {
        console.error("Error fetching members:", error);
        setError("Unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [boardId]);

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-blue-100 text-blue-800';
      case 'member':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'owner':
        return '👑';
      case 'admin':
        return '⚡';
      case 'member':
        return '👤';
      default:
        return '👤';
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Board Members</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading members...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="text-red-600">{error}</div>
            </div>
          ) : members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Members Yet</h3>
              <p className="text-gray-500">This board doesn't have any members yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member, index) => (
                <div
                  key={member.user_id || index}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                      {member.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">
                        {member.username}
                      </div>
                      {member.email && (
                        <div className="text-sm text-gray-500">{member.email}</div>
                      )}
                      {member.added_at && (
                        <div className="text-xs text-gray-400">
                          Added {new Date(member.added_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                      <span className="mr-1">{getRoleIcon(member.role)}</span>
                      {member.role?.charAt(0)?.toUpperCase() + member.role?.slice(1) || 'Member'}
                    </span>
                    {/* Show Remove button only for owners and not for the owner themselves */}
                    {isCurrentUserOwner() && member.role !== 'owner' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveMember(member);
                        }}
                        className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-colors duration-200"
                        title={`Remove ${member.username} from board`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-500">
              {members.length} member{members.length !== 1 ? 's' : ''} total
            </div>
            <div className="flex space-x-3">
              {/* Show Leave button only for members (not owners) */}
              {isCurrentUserMember() && (
                <button
                  onClick={handleLeaveBoard}
                  disabled={leaving}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                >
                  {leaving ? "Leaving..." : "Leave Board"}
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
      </div>
    </div>
  );
}
