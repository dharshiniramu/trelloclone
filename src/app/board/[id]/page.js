"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Calendar,
  Layout,
  Tag,
  Clock,
  Grid3X3,
} from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";


export default function BoardViewPage() {
  const params = useParams();
  const router = useRouter();
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
          <BoardView board={board} router={router} />
        </main>
      </div>
    </>
  );
}

function BoardView({ board, router }) {
  const [lists, setLists] = useState([]);
  const [editingCard, setEditingCard] = useState(null);
  const [showCardModal, setShowCardModal] = useState(false);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [showExistingMembersModal, setShowExistingMembersModal] = useState(false);
  const [showSwitchBoardsModal, setShowSwitchBoardsModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [viewMode, setViewMode] = useState('board'); // 'board' or 'calendar'
  const [allBoards, setAllBoards] = useState([]);
  const [loadingBoards, setLoadingBoards] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    labels: [],
    dateRange: {
      start: null,
      end: null
    },
    dueDateFilter: 'all' // 'all', 'overdue', 'due_today', 'due_this_week', 'due_this_month'
  });
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);

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

  // Refetch boards when currentUser changes
  useEffect(() => {
    if (currentUser) {
      fetchAllBoards();
    }
  }, [currentUser]);

  // Check favorite status when user and board are available
  useEffect(() => {
    if (currentUser && board) {
      checkIfFavorite();
    }
  }, [currentUser, board]);

  // Fetch boards where current user is owner or member
  const fetchAllBoards = async () => {
    if (!currentUser) return;
    
    setLoadingBoards(true);
    try {
      // Get boards where user is the owner
      const { data: ownedBoards, error: ownedError } = await supabase
        .from("boards")
        .select("id, title, background_image, user_id")
        .eq("user_id", currentUser.id);

      if (ownedError) throw ownedError;

      // Get boards where user is a member (check the members array)
      const { data: allBoards, error: allBoardsError } = await supabase
        .from("boards")
        .select("id, title, background_image, user_id, members");

      if (allBoardsError) throw allBoardsError;

      // Filter boards where user is a member (not owner)
      const memberBoards = allBoards?.filter(board => {
        // Skip if this board is already in ownedBoards (user is owner)
        if (board.user_id === currentUser.id) return false;
        
        // Check if user is a member of this board
        const members = board.members || [];
        return members.some(member => member.user_id === currentUser.id);
      }) || [];

      // Combine owned and member boards, remove duplicates
      const allUserBoards = [...(ownedBoards || []), ...memberBoards];
      const uniqueBoards = allUserBoards.filter((board, index, self) => 
        index === self.findIndex(b => b.id === board.id)
      );

      setAllBoards(uniqueBoards);
    } catch (err) {
      console.error("Error fetching user boards:", err.message);
    } finally {
      setLoadingBoards(false);
    }
  };

  // Handle view mode change
  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    if (mode === 'calendar') {
      // Calendar view logic will be handled in render
    }
  };

  // Handle board switch
  const handleBoardSwitch = (boardId) => {
    window.location.href = `/board/${boardId}`;
  };

  // Helper function to check if current user is board owner
  const isBoardOwner = () => {
    if (!currentUser || !board) return false;
    return board.user_id === currentUser.id;
  };

  // Filter cards based on current filters
  const filterCards = (cards) => {
    if (!cards) return [];
    
    return cards.filter(card => {
      // Filter by labels
      if (filters.labels.length > 0) {
        const cardLabels = card.labels || [];
        const hasMatchingLabel = filters.labels.some(filterLabel => 
          cardLabels.some(cardLabel => cardLabel.id === filterLabel.id)
        );
        if (!hasMatchingLabel) return false;
      }

      // Filter by due date
      if (filters.dueDateFilter !== 'all' && card.due_date) {
        const dueDate = new Date(card.due_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        switch (filters.dueDateFilter) {
          case 'overdue':
            if (dueDate >= today) return false;
            break;
          case 'due_today':
            if (dueDate.toDateString() !== today.toDateString()) return false;
            break;
          case 'due_this_week':
            const weekEnd = new Date(today);
            weekEnd.setDate(today.getDate() + 7);
            if (dueDate < today || dueDate > weekEnd) return false;
            break;
          case 'due_this_month':
            const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            if (dueDate < today || dueDate > monthEnd) return false;
            break;
        }
      }

      // Filter by custom date range
      if (filters.dateRange.start || filters.dateRange.end) {
        const cardDate = card.due_date ? new Date(card.due_date) : null;
        if (!cardDate) return false;
        
        if (filters.dateRange.start) {
          const startDate = new Date(filters.dateRange.start);
          startDate.setHours(0, 0, 0, 0);
          if (cardDate < startDate) return false;
        }
        
        if (filters.dateRange.end) {
          const endDate = new Date(filters.dateRange.end);
          endDate.setHours(23, 59, 59, 999);
          if (cardDate > endDate) return false;
        }
      }

      return true;
    });
  };

  // Get all unique labels from all cards
  const getAllLabels = () => {
    const allCards = lists.flatMap(list => list.cards || []);
    const labelMap = new Map();
    
    allCards.forEach(card => {
      if (card.labels && Array.isArray(card.labels)) {
        card.labels.forEach(label => {
          if (!labelMap.has(label.id)) {
            labelMap.set(label.id, label);
          }
        });
      }
    });
    
    return Array.from(labelMap.values());
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      labels: [],
      dateRange: {
        start: null,
        end: null
      },
      dueDateFilter: 'all'
    });
  };

  // Check if any filters are active
  const hasActiveFilters = () => {
    return filters.labels.length > 0 || 
           filters.dateRange.start || 
           filters.dateRange.end || 
           filters.dueDateFilter !== 'all';
  };

  // Get total filtered cards count
  const getFilteredCardsCount = () => {
    return lists.reduce((total, list) => total + filterCards(list.cards).length, 0);
  };

  // Get total cards count
  const getTotalCardsCount = () => {
    return lists.reduce((total, list) => total + (list.cards?.length || 0), 0);
  };

  // Check if board is favorite
  const checkIfFavorite = async () => {
    if (!currentUser || !board) return;
    
    try {
      const { data, error } = await supabase
        .from("board_favorites")
        .select("id")
        .eq("user_id", currentUser.id)
        .eq("board_id", board.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error("Error checking favorite status:", error);
        return;
      }

      setIsFavorite(!!data);
    } catch (err) {
      console.error("Error checking favorite status:", err);
    }
  };

  // Toggle favorite status
  const toggleFavorite = async () => {
    if (!currentUser || !board || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      if (isFavorite) {
        // Remove from favorites
        const { error } = await supabase
          .from("board_favorites")
          .delete()
          .eq("user_id", currentUser.id)
          .eq("board_id", board.id);

        if (error) throw error;
        setIsFavorite(false);
      } else {
        // Add to favorites
        const { error } = await supabase
          .from("board_favorites")
          .insert([{
            user_id: currentUser.id,
            board_id: board.id
          }]);

        if (error) throw error;
        setIsFavorite(true);
      }
    } catch (err) {
      console.error("Error toggling favorite:", err);
      // Show error message to user
      alert("Failed to update favorite status. Please try again.");
    } finally {
      setFavoriteLoading(false);
    }
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
            .select("id, title, description, due_date, start_date, labels, attachments, list_id")
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
            <button 
              onClick={() => router.push('/boards')}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{board.title}</h1>
              {hasActiveFilters() && (
                <div className="text-sm text-blue-600 mt-1">
                  Showing {getFilteredCardsCount()} of {getTotalCardsCount()} cards
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setShowFilterModal(true)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  hasActiveFilters() 
                    ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <Filter className="h-4 w-4" />
                <span>Filter</span>
                {hasActiveFilters() && (
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                )}
              </button>
              {hasActiveFilters() && (
                <button
                  onClick={clearFilters}
                  className="flex items-center space-x-1 px-2 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                  title="Clear all filters"
                >
                  <X className="h-4 w-4" />
                  <span className="text-sm">Clear</span>
                </button>
              )}
            </div>
            <div className="relative group">
              <button 
                onClick={toggleFavorite}
                disabled={favoriteLoading}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                  isFavorite 
                    ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                    : 'text-gray-700 hover:bg-gray-100'
                } ${favoriteLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Star className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                <span>{isFavorite ? 'Favorited' : 'Favorites'}</span>
                {favoriteLoading && (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                )}
              </button>
              {/* Tooltip - positioned below the button */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                {isFavorite ? 'Remove from favorites' : 'Click to make this board your favorite'}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-b-gray-900"></div>
              </div>
            </div>
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

      {/* Main Content Area */}
      {viewMode === 'board' ? (
        /* Kanban Lists with DnD */
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
                        {filterCards(list.cards).length === 0 && hasActiveFilters() ? (
                          <div className="text-center py-8 text-gray-500">
                            <div className="text-sm">No cards match the current filters</div>
                            <button
                              onClick={clearFilters}
                              className="text-blue-600 hover:text-blue-800 text-sm mt-2 underline"
                            >
                              Clear filters to see all cards
                            </button>
                          </div>
                        ) : (
                          filterCards(list.cards).map((card, index) => (
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
        {card.labels && card.labels.length > 0 && (
          <div className="flex space-x-1">
            {card.labels.map((label, index) => (
              <span
                key={index}
                className={`${label.color} text-white px-1 py-0.5 rounded text-xs`}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}
        {card.due_date && (
          <span>
            📅 {new Date(card.due_date).toLocaleDateString()}
          </span>
        )}
        {card.attachments && card.attachments.length > 0 && (
          <span>📎 {card.attachments.length}</span>
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

                          ))
                        )}
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
      ) : (
        /* Calendar View */
        <CalendarView 
          lists={lists}
          onCardClick={handleCardClick}
        />
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <FilterModal
          filters={filters}
          setFilters={setFilters}
          allLabels={getAllLabels()}
          onClose={() => setShowFilterModal(false)}
          onClearFilters={clearFilters}
        />
      )}

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

      {/* Switch Boards Modal */}
      {showSwitchBoardsModal && (
        <SwitchBoardsModal
          boards={allBoards}
          currentBoardId={board.id}
          loading={loadingBoards}
          currentUser={currentUser}
          onClose={() => setShowSwitchBoardsModal(false)}
          onBoardSelect={handleBoardSwitch}
        />
      )}

      {/* Bottom Navigation Bar - Fixed at bottom */}
      <div className="fixed bottom-0 left-64 right-0 bg-white/90 backdrop-blur-sm border-t border-gray-200 shadow-lg px-6 py-3 z-20">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <button 
              onClick={() => handleViewModeChange('calendar')}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                viewMode === 'calendar' 
                  ? 'text-blue-600 bg-blue-50' 
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Calendar className="h-4 w-4" />
              <span>Calendar View</span>
            </button>
            
            <button 
              onClick={() => {
                fetchAllBoards();
                setShowSwitchBoardsModal(true);
              }}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
              <Layout className="h-4 w-4" />
              <span>Switch Boards</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Filter Modal Component
function FilterModal({ filters, setFilters, allLabels, onClose, onClearFilters }) {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleLabelToggle = (label) => {
    setLocalFilters(prev => ({
      ...prev,
      labels: prev.labels.some(l => l.id === label.id)
        ? prev.labels.filter(l => l.id !== label.id)
        : [...prev.labels, label]
    }));
  };

  const handleDateRangeChange = (field, value) => {
    setLocalFilters(prev => ({
      ...prev,
      dateRange: {
        ...prev.dateRange,
        [field]: value
      }
    }));
  };

  const handleDueDateFilterChange = (value) => {
    setLocalFilters(prev => ({
      ...prev,
      dueDateFilter: value
    }));
  };

  const applyFilters = () => {
    setFilters(localFilters);
    onClose();
  };

  const clearAllFilters = () => {
    setLocalFilters({
      labels: [],
      dateRange: {
        start: null,
        end: null
      },
      dueDateFilter: 'all'
    });
    onClearFilters();
  };

  const hasActiveFilters = () => {
    return localFilters.labels.length > 0 || 
           localFilters.dateRange.start || 
           localFilters.dateRange.end || 
           localFilters.dueDateFilter !== 'all';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Filter Cards</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          {/* Labels Filter */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <Tag className="h-5 w-5 mr-2" />
              Filter by Labels
            </h3>
            {allLabels.length === 0 ? (
              <p className="text-gray-500 text-sm">No labels found in this board</p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {allLabels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => handleLabelToggle(label)}
                    className={`flex items-center space-x-2 p-3 rounded-lg border-2 transition-all duration-200 ${
                      localFilters.labels.some(l => l.id === label.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded ${label.color}`}></div>
                    <span className="text-sm font-medium">{label.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Due Date Filter */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Filter by Due Date
            </h3>
            <div className="space-y-2">
              {[
                { value: 'all', label: 'All cards' },
                { value: 'overdue', label: 'Overdue' },
                { value: 'due_today', label: 'Due today' },
                { value: 'due_this_week', label: 'Due this week' },
                { value: 'due_this_month', label: 'Due this month' }
              ].map((option) => (
                <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="radio"
                    name="dueDateFilter"
                    value={option.value}
                    checked={localFilters.dueDateFilter === option.value}
                    onChange={(e) => handleDueDateFilterChange(e.target.value)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Custom Date Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={localFilters.dateRange.start || ''}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={localFilters.dateRange.end || ''}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex justify-between items-center">
            <button
              onClick={clearAllFilters}
              disabled={!hasActiveFilters()}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
            >
              Clear All
            </button>
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardEditModal({ card, onClose, onSave }) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [labels, setLabels] = useState(card.labels || []);
  const [dueDate, setDueDate] = useState(card.due_date ? new Date(card.due_date).toISOString().split('T')[0] : '');
  const [startDate, setStartDate] = useState(card.start_date ? new Date(card.start_date).toISOString().split('T')[0] : '');
  const [attachments, setAttachments] = useState(card.attachments || []);
  const [newAttachment, setNewAttachment] = useState('');
  const [showLabels, setShowLabels] = useState(false);
  const [showDates, setShowDates] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);

  const predefinedLabels = [
    { id: 1, name: 'High', color: 'bg-red-500' },
    { id: 2, name: 'Medium', color: 'bg-orange-500' },
    { id: 3, name: 'Low', color: 'bg-green-500' },
  ];

  const handleSave = async () => {
    const updates = {
      title,
      description,
      labels: labels.length > 0 ? labels : null,
      due_date: dueDate || null,
      start_date: startDate || null,
      attachments: attachments.length > 0 ? attachments : null,
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

  const addLabel = (label) => {
    if (!labels.find(l => l.id === label.id)) {
      setLabels([...labels, label]);
    }
    setShowLabels(false);
  };

  const removeLabel = (labelId) => {
    setLabels(labels.filter(l => l.id !== labelId));
  };

  const addAttachment = () => {
    if (newAttachment.trim()) {
      const attachment = {
        id: Date.now(),
        url: newAttachment.trim(),
        timestamp: new Date().toISOString(),
        type: 'link',
      };
      setAttachments([...attachments, attachment]);
      setNewAttachment('');
    }
  };

  const removeAttachment = (attachmentId) => {
    setAttachments(attachments.filter(a => a.id !== attachmentId));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-4 h-4 rounded-full border-2 border-gray-300"></div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xl font-semibold text-gray-900 border-none outline-none focus:ring-0"
              placeholder="Enter card title..."
            />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowLabels(!showLabels)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              <Tag className="h-4 w-4" />
              <span>Labels</span>
            </button>
            
            <button 
              onClick={() => setShowDates(!showDates)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              <Clock className="h-4 w-4" />
              <span>Dates</span>
            </button>
            
            <button 
              onClick={() => setShowAttachments(!showAttachments)}
              className="flex items-center space-x-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Attachments</span>
            </button>
          </div>
        </div>

        {/* Description */}
        <div className="px-6 py-4">
          <div className="flex items-center space-x-2 mb-3">
            <div className="w-4 h-4 bg-gray-300 rounded"></div>
            <h3 className="font-medium text-gray-900">Description</h3>
          </div>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add a more detailed description..."
          />
        </div>

        {/* Labels Section */}
        {showLabels && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <Tag className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">Labels</h3>
            </div>
            
            {/* Selected Labels */}
            {labels.length > 0 && (
              <div className="mb-3">
                <p className="text-sm text-gray-600 mb-2">Selected Labels:</p>
                <div className="flex flex-wrap gap-2">
                  {labels.map((label) => (
                    <div
                      key={label.id}
                      className={`${label.color} text-white px-2 py-1 rounded text-sm flex items-center space-x-1`}
                    >
                      <span>{label.name}</span>
                      <button
                        onClick={() => removeLabel(label.id)}
                        className="hover:bg-black/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Available Labels */}
            <div>
              <p className="text-sm text-gray-600 mb-2">Available Labels:</p>
              <div className="grid grid-cols-2 gap-2">
                {predefinedLabels.map((label) => (
                  <button
                    key={label.id}
                    onClick={() => addLabel(label)}
                    disabled={labels.find(l => l.id === label.id)}
                    className={`${label.color} text-white px-3 py-2 rounded text-sm text-left disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-80`}
                  >
                    {label.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Dates Section */}
        {showDates && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <Clock className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">Dates</h3>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate ? new Date(startDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={dueDate ? new Date(dueDate).toISOString().split("T")[0] : ""}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Attachments Section */}
        {showAttachments && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 mb-3">
              <Plus className="h-4 w-4 text-gray-600" />
              <h3 className="font-medium text-gray-900">Attachments</h3>
            </div>
            
            {/* Add new attachment */}
            <div className="space-y-2 mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Add Link
              </label>
              <textarea
                value={newAttachment}
                onChange={(e) => setNewAttachment(e.target.value)}
                placeholder="Paste any link here..."
                className="w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                onClick={addAttachment}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
              >
                Add Attachment
              </button>
            </div>
            
            {/* Attachments list */}
            {attachments.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 mb-2">Attached Links:</p>
                {attachments.map((attachment) => (
                  <div key={attachment.id} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline break-all"
                        >
                          {attachment.url}
                        </a>
                        <p className="text-xs text-gray-500 mt-1">
                          Added {new Date(attachment.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeAttachment(attachment.id)}
                        className="p-1 hover:bg-red-100 rounded text-red-500 ml-2"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Save Button */}
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

// Calendar View Component
function CalendarView({ lists, onCardClick }) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);

  // Get all cards with due dates
  const allCards = lists.flatMap(list => 
    list.cards
      .filter(card => card.due_date)
      .map(card => ({
        ...card,
        listName: list.name,
        dueDate: new Date(card.due_date)
      }))
  );

  // Group cards by date
  const cardsByDate = allCards.reduce((acc, card) => {
    const dateKey = card.dueDate.toDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(card);
    return acc;
  }, {});

  // Get calendar days
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const days = getCalendarDays();
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(prev.getMonth() + direction);
      return newDate;
    });
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  return (
    <div className="relative z-10 p-6 pb-20 h-full overflow-y-auto">
      <div className="bg-white/90 rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Calendar Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigateMonth(-1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          
          <h2 className="text-xl font-semibold">
            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
          </h2>
          
          <button
            onClick={() => navigateMonth(1)}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5 rotate-180" />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((date, index) => {
            const dateKey = date.toDateString();
            const dayCards = cardsByDate[dateKey] || [];
            
            return (
              <div
                key={index}
                className={`min-h-[100px] p-2 border border-gray-200 ${
                  isCurrentMonth(date) ? 'bg-white' : 'bg-gray-50'
                } ${isToday(date) ? 'ring-2 ring-blue-500' : ''}`}
              >
                <div className={`text-sm ${isCurrentMonth(date) ? 'text-gray-900' : 'text-gray-400'}`}>
                  {date.getDate()}
                </div>
                
                {dayCards.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {dayCards.slice(0, 3).map((card, cardIndex) => (
                      <div
                        key={cardIndex}
                        onClick={() => onCardClick(card)}
                        className="text-xs p-1 bg-blue-100 text-blue-800 rounded cursor-pointer hover:bg-blue-200 truncate"
                        title={card.title}
                      >
                        {card.title}
                      </div>
                    ))}
                    {dayCards.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{dayCards.length - 3} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Switch Boards Modal Component
function SwitchBoardsModal({ boards, currentBoardId, loading, onClose, onBoardSelect, currentUser }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Switch Boards</h2>
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
              <span className="ml-3 text-gray-600">Loading boards...</span>
            </div>
          ) : boards.length === 0 ? (
            <div className="text-center py-8">
              <Grid3X3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Boards Found</h3>
              <p className="text-gray-500">You don't have any boards yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {boards.map((board) => {
                // Determine user's role in this board
                const isOwner = board.user_id === currentUser?.id;
                const isMember = board.members?.some(member => member.user_id === currentUser?.id) || false;
                
                // Debug logging
                console.log('Board:', board.title, 'user_id:', board.user_id, 'currentUser.id:', currentUser?.id, 'isOwner:', isOwner);
                
                const userRole = isOwner ? 'Owner' : isMember ? 'Member' : 'Unknown';
                
                return (
                  <div
                    key={board.id}
                    onClick={() => onBoardSelect(board.id)}
                    className={`relative p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-md ${
                      board.id === currentBoardId
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    style={{
                      backgroundImage: board.background_image ? `url(${board.background_image})` : 'none',
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                    }}
                  >
                    <div className="relative z-10">
                      <h3 className="font-semibold text-gray-900 mb-2">{board.title}</h3>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-600">
                          {userRole}
                        </p>
                        {board.id === currentBoardId && (
                          <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    {board.background_image && (
                      <div className="absolute inset-0 bg-black/20 rounded-lg"></div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
