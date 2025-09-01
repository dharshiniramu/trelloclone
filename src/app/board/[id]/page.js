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
    <div className="h-full bg-gradient-to-br from-yellow-50 to-yellow-100 relative">
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
            <button className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">
              <Users className="h-4 w-4" />
              <span>Workspace Members</span>
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
