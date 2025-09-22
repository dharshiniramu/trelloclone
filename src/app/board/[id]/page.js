"use client";
import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import NotificationContainer from "@/components/NotificationContainer";
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
  const [cardMembers, setCardMembers] = useState({}); // cardId -> array of members
  const [showCardMembersModal, setShowCardMembersModal] = useState(false);
  const [selectedCardForMembers, setSelectedCardForMembers] = useState(null);
  const [notifications, setNotifications] = useState([]);

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

  // Load card members for all cards
  const loadCardMembers = async (cardIds) => {
    if (!cardIds || cardIds.length === 0) return;
    
    try {
      
      // First, test if the table exists by doing a simple count
      const { count, error: countError } = await supabase
        .from("card_members")
        .select("*", { count: "exact", head: true });
      
      if (countError) {
        console.error("Table access error:", countError);
        throw countError;
      }
      
      const { data: members, error } = await supabase
        .from("card_members")
        .select(`
          card_id,
          user_id,
          added_at,
          added_by_user_id
        `)
        .in("card_id", cardIds);

      if (error) {
        console.error("Supabase error details:", error);
        
        // If table doesn't exist, initialize empty card members
        if (error.code === 'PGRST116' || error.message.includes('relation "card_members" does not exist')) {
          setCardMembers({});
          return;
        }
        
        throw error;
      }

      // If we have members, get their profile information
      if (members && members.length > 0) {
        const userIds = [...new Set(members.map(member => member.user_id))];
        
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, email")
          .in("id", userIds);

        if (profilesError) {
          console.error("Error loading profiles:", profilesError);
        }

        // Group members by card_id
        const membersByCard = {};
        members.forEach(member => {
          if (!membersByCard[member.card_id]) {
            membersByCard[member.card_id] = [];
          }
          
          const profile = profiles?.find(p => p.id === member.user_id);
          membersByCard[member.card_id].push({
            user_id: member.user_id,
            added_at: member.added_at,
            profile: profile || { id: member.user_id, username: 'Unknown', email: '' }
          });
        });

        setCardMembers(membersByCard);
      } else {
        // No members found, initialize empty
        setCardMembers({});
      }
    } catch (error) {
      console.error("Error loading card members:", error);
    }
  };

  // Add member to card
  const addCardMember = async (cardId, userId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Get card details for notification
      const { data: card, error: cardError } = await supabase
        .from("cards")
        .select("title")
        .eq("id", cardId)
        .single();
      
      if (cardError) {
        console.error("Error fetching card:", cardError);
      }
      
      const cardTitle = card?.title || 'Unknown Card';

      // Get user profile for notification
      const { data: profile } = await supabase
        .from("profiles")
        .select("username, email")
        .eq("id", userId)
        .single();

      const { error } = await supabase
        .from("card_members")
        .insert({
          card_id: cardId,
          user_id: userId,
          added_by_user_id: user.id
        });

      if (error) throw error;

      // Show notification to the added user
      const memberName = profile?.username || profile?.email || 'Unknown User';
      showNotification(
        `You have been assigned to the card "${cardTitle}"`,
        'success'
      );

      // Reload card members
      const allCardIds = Object.keys(cardMembers).map(Number);
      await loadCardMembers(allCardIds);
    } catch (error) {
      console.error("Error adding card member:", error);
      showNotification("Error adding member to card", 'error');
    }
  };

  // Remove member from card
  const removeCardMember = async (cardId, userId) => {
    try {
      const { error } = await supabase
        .from("card_members")
        .delete()
        .eq("card_id", cardId)
        .eq("user_id", userId);

      if (error) throw error;

      // Update local state
      setCardMembers(prev => ({
        ...prev,
        [cardId]: prev[cardId]?.filter(member => member.user_id !== userId) || []
      }));
    } catch (error) {
      console.error("Error removing card member:", error);
    }
  };

  // Show notification
  const showNotification = (message, type = 'info') => {
    const id = Date.now();
    const notification = { id, message, type };
    
    setNotifications(prev => [...prev, notification]);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  };

  return (
    <>
      <Navbar />
      <div className="flex h-[calc(100vh-64px)] bg-gray-50">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <BoardView 
            board={board} 
            router={router} 
            cardMembers={cardMembers}
            setCardMembers={setCardMembers}
            showCardMembersModal={showCardMembersModal}
            setShowCardMembersModal={setShowCardMembersModal}
            selectedCardForMembers={selectedCardForMembers}
            setSelectedCardForMembers={setSelectedCardForMembers}
            loadCardMembers={loadCardMembers}
            addCardMember={addCardMember}
            removeCardMember={removeCardMember}
          />
        </main>
      </div>
      
      {/* Card Members Modal */}
      {showCardMembersModal && selectedCardForMembers && (
        <CardMembersModal
          card={selectedCardForMembers}
          cardMembers={cardMembers[selectedCardForMembers.id] || []}
          onClose={() => {
            setShowCardMembersModal(false);
            setSelectedCardForMembers(null);
          }}
          onAddMember={addCardMember}
          onRemoveMember={removeCardMember}
          boardId={boardId}
        />
      )}
      
      {/* Notifications */}
      <NotificationContainer notifications={notifications} />
    </>
  );
}

// Card Members Modal Component
function CardMembersModal({ card, cardMembers, onClose, onAddMember, onRemoveMember, boardId }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);

  // Get current user
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        setCurrentUser(user);
      }
    };
    getCurrentUser();
    loadWorkspaceInfo();
  }, [boardId]);

  // Load workspace information
  const loadWorkspaceInfo = async () => {
    try {
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("workspace_id")
        .eq("id", boardId)
        .single();

      if (boardError) throw boardError;

      if (boardData.workspace_id) {
        const { data: workspaceData, error: workspaceError } = await supabase
          .from("workspaces")
          .select("id, name")
          .eq("id", boardData.workspace_id)
          .single();

        if (workspaceError) throw workspaceError;
        setWorkspaceInfo(workspaceData);
        await loadWorkspaceMembers(boardData.workspace_id);
      }
    } catch (error) {
      console.error("Error loading workspace info:", error);
    }
  };

  // Load workspace members
  const loadWorkspaceMembers = async (workspaceId) => {
    try {
      // Get workspace owner
      const { data: ownerData, error: ownerError } = await supabase
        .from("workspaces")
        .select("user_id")
        .eq("id", workspaceId)
        .single();

      if (ownerError) throw ownerError;

      // Get accepted workspace members
      const { data: invitations, error: invitationError } = await supabase
        .from("workspace_invitations")
        .select("invited_user_id")
        .eq("workspace_id", workspaceId)
        .eq("status", "accepted");

      if (invitationError) throw invitationError;

      const userIds = [ownerData.user_id, ...(invitations?.map(inv => inv.invited_user_id) || [])];
      const { data: memberProfiles, error: membersError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", userIds);

      if (membersError) throw membersError;
      setWorkspaceMembers(memberProfiles || []);
    } catch (error) {
      console.error("Error loading workspace members:", error);
    }
  };

  // Search users
  const searchUsers = async (query) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      if (workspaceInfo) {
        // Search within workspace members
        const filteredMembers = workspaceMembers.filter(member => 
          member.username?.toLowerCase().includes(query.toLowerCase()) ||
          member.email?.toLowerCase().includes(query.toLowerCase())
        );
        setSearchResults(filteredMembers);
      } else {
        // Search all users
        const { data: users, error } = await supabase
          .from("profiles")
          .select("id, username, email")
          .or(`username.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(10);

        if (error) throw error;
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
  };

  const removeSelectedMember = (userId) => {
    setSelectedMembers(selectedMembers.filter(member => member.id !== userId));
  };

  const addMembersToCard = async () => {
    if (selectedMembers.length === 0) return;

    setAdding(true);
    setError("");

    try {
      for (const member of selectedMembers) {
        await onAddMember(card.id, member.id);
      }
      setSelectedMembers([]);
      setSearchQuery("");
    } catch (error) {
      setError("Error adding members to card");
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    try {
      await onRemoveMember(card.id, userId);
    } catch (error) {
      setError("Error removing member from card");
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Manage Card Members</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Card: {card.title}</h3>
        </div>

        {/* Current Members */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Current Members:</h3>
          {cardMembers.length === 0 ? (
            <p className="text-sm text-gray-500">No members assigned to this card</p>
          ) : (
            <div className="space-y-2">
              {cardMembers.map((member) => (
                <div key={member.user_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {(member.profile?.username || member.profile?.email || '?').charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">
                        {member.profile?.username || 'Unknown User'}
                      </div>
                      {member.profile?.email && (
                        <div className="text-xs text-gray-500">{member.profile.email}</div>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="text-red-500 hover:text-red-700 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Members */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Add Members:</h3>
          
          {workspaceInfo && (
            <div className="mb-3 p-2 bg-blue-50 rounded-lg">
              <div className="text-sm text-blue-800">
                <strong>Workspace Board:</strong> Only workspace members can be added
              </div>
            </div>
          )}

          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder={workspaceInfo ? "Search workspace members..." : "Search by email or username..."}
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              </div>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="flex items-center space-x-3 p-2 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                    {(user.username || user.email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{user.username || 'Unknown'}</div>
                    {user.email && <div className="text-xs text-gray-500">{user.email}</div>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Selected Members:</h4>
              <div className="space-y-1">
                {selectedMembers.map((member) => (
                  <div key={member.id} className="flex items-center justify-between p-2 bg-blue-50 rounded">
                    <div className="flex items-center space-x-2">
                      <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {(member.username || member.email || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm">{member.username || member.email}</span>
                    </div>
                    <button
                      onClick={() => removeSelectedMember(member.id)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={addMembersToCard}
                disabled={adding}
                className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {adding ? "Adding..." : "Add Members to Card"}
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4">{error}</div>
        )}

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function BoardView({ board, router, cardMembers, setCardMembers, showCardMembersModal, setShowCardMembersModal, selectedCardForMembers, setSelectedCardForMembers, loadCardMembers, addCardMember, removeCardMember }) {
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
  const [showShareModal, setShowShareModal] = useState(false);

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
      
      // Load card members for all cards
      const allCardIds = listsWithCards.flatMap(list => list.cards.map(card => card.id));
      await loadCardMembers(allCardIds);
    };

    fetchListsAndCards();
  }, [board]);

  // Refresh board data when user returns to the page
  useEffect(() => {
    const handleFocus = () => {
      if (board) {
        fetchListsAndCards();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
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
    // Check if user can open this card
    if (!canUserOpenCard(card.id)) {
      return;
    }
    
    setEditingCard(card);
    setShowCardModal(true);
  };

  // Drag handler
  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) {
      return;
    }

    // Check if user can drag this card
    if (!canUserDragCard(parseInt(draggableId))) {
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

// Check if user can drag a card
const canUserDragCard = (cardId) => {
  if (!currentUser) return false; // Must be logged in to drag
  
  const members = cardMembers[cardId] || [];
  
  // If no members assigned to the card, only the card creator can drag
  if (members.length === 0) {
    // Check if current user is the card creator
    const card = lists.flatMap(list => list.cards).find(c => c.id === cardId);
    return card && card.user_id === currentUser.id;
  }
  
  // If members exist, check if current user is a member
  return members.some(member => member.user_id === currentUser.id);
};

// Check if user can open/edit a card
const canUserOpenCard = (cardId) => {
  if (!currentUser) return false; // Must be logged in to open
  
  const members = cardMembers[cardId] || [];
  
  // If no members assigned to the card, only the card creator can open
  if (members.length === 0) {
    // Check if current user is the card creator
    const card = lists.flatMap(list => list.cards).find(c => c.id === cardId);
    return card && card.user_id === currentUser.id;
  }
  
  // If members exist, check if current user is a member
  return members.some(member => member.user_id === currentUser.id);
};

// Handle card member management
const handleCardMemberClick = (e, card) => {
  e.stopPropagation();
  setSelectedCardForMembers(card);
  setShowCardMembersModal(true);
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
              onClick={() => {
                // Check if board belongs to a workspace
                if (board?.workspace_id) {
                  // Navigate to workspace boards page
                  router.push(`/workspace/${board.workspace_id}/boards`);
                } else {
                  // Navigate to general boards page
                  router.push('/boards');
                }
              }}
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
            <button 
              onClick={() => setShowShareModal(true)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors duration-200"
            >
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
                              isDragDisabled={!canUserDragCard(card.id)}
                            >
  {(provided) => (
    <div
      ref={provided.innerRef}
      {...provided.draggableProps}
      {...provided.dragHandleProps}
      className={`bg-white rounded-lg border p-3 hover:shadow-md relative ${
        canUserDragCard(card.id) 
          ? 'cursor-pointer' 
          : 'cursor-not-allowed opacity-75'
      }`}
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

      {/* Card members display */}
      {cardMembers[card.id] && cardMembers[card.id].length > 0 && (
        <div className="flex items-center space-x-1 mt-2">
          <Users className="h-3 w-3 text-gray-400" />
          <div className="flex -space-x-1">
            {cardMembers[card.id].slice(0, 3).map((member, index) => (
              <div
                key={member.user_id}
                className="w-5 h-5 bg-gray-300 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 border border-white"
                title={member.profile?.username || member.profile?.email || 'Unknown'}
              >
                {(member.profile?.username || member.profile?.email || '?').charAt(0).toUpperCase()}
              </div>
            ))}
            {cardMembers[card.id].length > 3 && (
              <div className="w-5 h-5 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600 border border-white">
                +{cardMembers[card.id].length - 3}
              </div>
            )}
          </div>
        </div>
      )}
      
      
      {/* Drag permission indicator */}
      {!canUserDragCard(card.id) && (
        <div className="text-xs text-red-500 mt-1 flex items-center">
          <span className="mr-1">🔒</span>
          Only members can move this card
        </div>
      )}

      {/* Action buttons */}
      <div className="absolute top-2 right-2 flex space-x-1">
        {/* Members button */}
        <button
          onClick={(e) => handleCardMemberClick(e, card)}
          className="p-1 hover:bg-blue-100 rounded"
          title="Manage members"
        >
          <Users className="h-4 w-4 text-blue-500" />
        </button>
        
        {/* Delete button */}
      <button
        onClick={(e) => {
          e.stopPropagation(); // prevent opening modal
          deleteCard(list.id, card.id);
        }}
          className="p-1 hover:bg-red-100 rounded"
      >
        <Trash className="h-4 w-4 text-red-500" />
      </button>
      </div>
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

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          board={board}
          onClose={() => setShowShareModal(false)}
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
          canEdit={canUserOpenCard(editingCard.id)}
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

// Share Modal Component
function ShareModal({ board, onClose }) {
  const [copied, setCopied] = useState(false);
  const [shareLink, setShareLink] = useState('');

  // Generate share link when modal opens
  useEffect(() => {
    if (board) {
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/board/${board.id}`;
      setShareLink(link);
    }
  }, [board]);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error('Failed to copy: ', err);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const shareViaEmail = () => {
    const subject = `Check out this board: ${board.title}`;
    const body = `I'd like to share this board with you: ${shareLink}`;
    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  };

  const shareViaTwitter = () => {
    const text = `Check out this board: ${board.title}`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareLink)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareViaLinkedIn = () => {
    const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`;
    window.open(linkedinUrl, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Share Board</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Board Info */}
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">{board.title}</h3>
            <p className="text-sm text-gray-500">Share this board with others</p>
          </div>

          {/* Share Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share Link
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={shareLink}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm"
              />
              <button
                onClick={copyToClipboard}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  copied
                    ? 'bg-green-100 text-green-700'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
            {copied && (
              <p className="text-green-600 text-xs mt-1">Link copied to clipboard!</p>
            )}
          </div>

          {/* Share Options */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Share via</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={shareViaEmail}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="w-5 h-5 bg-blue-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">@</span>
                </div>
                <span className="text-sm">Email</span>
              </button>

              <button
                onClick={shareViaTwitter}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="w-5 h-5 bg-blue-400 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">𝕏</span>
                </div>
                <span className="text-sm">Twitter</span>
              </button>

              <button
                onClick={shareViaLinkedIn}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="w-5 h-5 bg-blue-700 rounded flex items-center justify-center">
                  <span className="text-white text-xs font-bold">in</span>
                </div>
                <span className="text-sm">LinkedIn</span>
              </button>

              <button
                onClick={copyToClipboard}
                className="flex items-center justify-center space-x-2 p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200"
              >
                <div className="w-5 h-5 bg-gray-500 rounded flex items-center justify-center">
                  <span className="text-white text-xs">📋</span>
                </div>
                <span className="text-sm">Copy Link</span>
              </button>
            </div>
          </div>

          {/* Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Anyone with this link can view the board. Make sure to only share with trusted people.
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors duration-200"
          >
            Close
          </button>
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

function CardEditModal({ card, canEdit, onClose, onSave }) {
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
              disabled={!canEdit}
              className={`text-xl font-semibold text-gray-900 border-none outline-none focus:ring-0 ${
                !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              placeholder="Enter card title..."
            />
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Access Control Message */}
        {!canEdit && (
          <div className="px-6 py-4 bg-yellow-50 border-b border-yellow-200">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs">!</span>
              </div>
              <div className="text-sm text-yellow-800">
                <strong>Read-only access:</strong> You can only view this card. Only card members can edit details.
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setShowLabels(!showLabels)}
              disabled={!canEdit}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                canEdit 
                  ? 'bg-gray-100 hover:bg-gray-200' 
                  : 'bg-gray-50 cursor-not-allowed opacity-50'
              }`}
            >
              <Tag className="h-4 w-4" />
              <span>Labels</span>
            </button>
            
            <button 
              onClick={() => setShowDates(!showDates)}
              disabled={!canEdit}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                canEdit 
                  ? 'bg-gray-100 hover:bg-gray-200' 
                  : 'bg-gray-50 cursor-not-allowed opacity-50'
              }`}
            >
              <Clock className="h-4 w-4" />
              <span>Dates</span>
            </button>
            
            <button 
              onClick={() => setShowAttachments(!showAttachments)}
              disabled={!canEdit}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors duration-200 ${
                canEdit 
                  ? 'bg-gray-100 hover:bg-gray-200' 
                  : 'bg-gray-50 cursor-not-allowed opacity-50'
              }`}
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
            disabled={!canEdit}
            className={`w-full h-24 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
            }`}
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
                disabled={!canEdit}
                placeholder="Paste any link here..."
                className={`w-full h-20 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
              />
              <button
                onClick={addAttachment}
                disabled={!canEdit}
                className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
                  canEdit 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
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
                        disabled={!canEdit}
                        className={`p-1 rounded ml-2 ${
                          canEdit 
                            ? 'hover:bg-red-100 text-red-500' 
                            : 'text-gray-400 cursor-not-allowed'
                        }`}
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
            disabled={!canEdit}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${
              canEdit 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {canEdit ? 'Save Changes' : 'Read-only Mode'}
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
  const [workspaceMembers, setWorkspaceMembers] = useState([]);
  const [workspaceInfo, setWorkspaceInfo] = useState(null);
  const [showWorkspaceMembers, setShowWorkspaceMembers] = useState(false);
  const [loadingWorkspaceMembers, setLoadingWorkspaceMembers] = useState(false);

  // Get current user and load workspace info
  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!error && user) {
        setCurrentUser(user);
      }
    };
    getCurrentUser();
    loadWorkspaceInfo();
  }, [boardId]);

  // Load workspace information and members
  const loadWorkspaceInfo = async () => {
    if (!boardId) return;
    
    try {
      // Get board info to find workspace_id
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("workspace_id")
        .eq("id", boardId)
        .single();

      if (boardError) {
        console.error("Error fetching board workspace:", boardError);
        return;
      }

      if (!boardData.workspace_id) {
        console.log("Board is not associated with any workspace");
        return;
      }

      // Get workspace info
      const { data: workspaceData, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id, name, user_id")
        .eq("id", boardData.workspace_id)
        .single();

      if (workspaceError) {
        console.error("Error fetching workspace:", workspaceError);
        return;
      }

      setWorkspaceInfo(workspaceData);
      loadWorkspaceMembers(boardData.workspace_id);
    } catch (error) {
      console.error("Error loading workspace info:", error);
    }
  };

  // Load workspace members
  const loadWorkspaceMembers = async (workspaceId) => {
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

      // Combine owner and accepted members
      const allUserIds = [workspaceData.user_id];
      if (invitations && invitations.length > 0) {
        allUserIds.push(...invitations.map(inv => inv.invited_user_id));
      }

      const { data: memberProfiles, error: membersError } = await supabase
        .from("profiles")
        .select("id, username, email")
        .in("id", allUserIds);

      if (membersError) {
        console.error("Error loading member profiles:", membersError);
        setWorkspaceMembers([]);
      } else {
        setWorkspaceMembers(memberProfiles || []);
      }
    } catch (error) {
      console.error("Error loading workspace members:", error);
      setWorkspaceMembers([]);
    } finally {
      setLoadingWorkspaceMembers(false);
    }
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

      // If board is in a workspace, only search within workspace members
      const workspaceMemberIds = workspaceMembers.map(member => member.id);
      
      // Search within workspace members
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

      // For users who previously declined invitations, delete the old invitation record
      // so we can create a new one
      const declinedInvitations = selectedMembers.filter(selectedMember => 
        existingInvitations?.some(invitation => 
          invitation.invited_user_id === selectedMember.id && invitation.status === 'declined'
        )
      );

      if (declinedInvitations.length > 0) {
        const declinedUserIds = declinedInvitations.map(member => member.id);
        const { error: deleteError } = await supabase
          .from("board_invitations")
          .delete()
          .eq("board_id", boardId)
          .in("invited_user_id", declinedUserIds)
          .eq("status", "declined");

        if (deleteError) {
          console.error("Error deleting declined invitations:", deleteError);
          // Continue anyway - the new invitation might still work
        }
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
        board_id: parseInt(boardId), // Ensure board_id is an integer
        invited_user_id: member.id,
        invited_by_user_id: user.id,
        role: 'member'
      }));

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
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-2">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xs max-h-[75vh] flex flex-col">
        <div className="flex items-center justify-between p-2 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-sm font-semibold text-gray-900">Invite Members</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-2 space-y-1 overflow-y-auto flex-1 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {/* Workspace Info */}
          {workspaceInfo && (
            <div className="p-1 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                  🏢
                </div>
                <div>
                  <div className="font-medium text-blue-900 text-sm">Workspace Board</div>
                  <div className="text-xs text-blue-700">This board belongs to "{workspaceInfo.name}" workspace</div>
                  <div className="text-xs text-blue-600 mt-1">Only workspace members can be invited to this board</div>
                </div>
              </div>
            </div>
          )}

          {/* Workspace Members Dropdown Toggle */}
          {workspaceInfo && workspaceMembers.length > 0 && (
            <div className="space-y-2">
              <button
                onClick={() => setShowWorkspaceMembers(!showWorkspaceMembers)}
                className="flex items-center justify-between w-full p-1 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-sm"
              >
                <span className="text-xs font-medium text-gray-700">
                  View Workspace Members ({workspaceMembers.length})
                </span>
                {showWorkspaceMembers ? (
                  <ChevronUp className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                )}
              </button>
              
              {showWorkspaceMembers && (
                <div className="border border-gray-200 rounded-lg max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                  {workspaceMembers.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center space-x-2 p-1 border-b border-gray-100 last:border-b-0"
                    >
                      <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                        {member.username?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900 text-sm">
                          {member.username}
                        </div>
                        {member.email && (
                          <div className="text-xs text-gray-500">{member.email}</div>
                        )}
                      </div>
                      <button
                        onClick={() => handleUserSelect(member)}
                        className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full hover:bg-blue-200 transition-colors duration-200"
                      >
                        Invite
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              placeholder={workspaceInfo ? "Search workspace members..." : "Search by email or username..."}
            />
            {loading && (
              <div className="absolute right-3 top-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Owner Search Message */}
          {isOwnerSearch && (
            <div className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
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
            <div className="border border-gray-200 rounded-lg max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleUserSelect(user)}
                  className="w-full p-1 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-gray-500 rounded-full flex items-center justify-center text-white font-semibold text-xs">
                      {user.username?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {user.username}
                      </div>
                      {user.email && (
                        <div className="text-xs text-gray-500">{user.email}</div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* No Results Message */}
          {searchQuery && searchResults.length === 0 && !loading && !isOwnerSearch && (
            <div className="p-2 text-center text-gray-500">
              <div className="text-sm">No users found matching "{searchQuery}"</div>
              <div className="text-xs text-gray-400 mt-1">Try searching by username or email</div>
            </div>
          )}

          {/* Selected Members */}
          {selectedMembers.length > 0 && (
            <div className="space-y-1">
              <h3 className="text-xs font-medium text-gray-700">Selected:</h3>
              <div className="space-y-1 max-h-16 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                {selectedMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-1 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{member.username}</div>
                      {member.email && (
                        <div className="text-xs text-gray-500">{member.email}</div>
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
            <div className={`p-2 rounded-lg ${
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
            <div className="p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="text-sm text-green-600">{success}</div>
            </div>
          )}

        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="flex gap-1 p-2 border-t border-gray-200 flex-shrink-0">
          <button
            onClick={onClose}
            className="flex-1 px-2 py-1 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200 text-xs"
          >
            Cancel
          </button>
          <button
            onClick={addMembersToBoard}
            disabled={selectedMembers.length === 0 || adding}
            className="flex-1 px-2 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 text-xs"
          >
            {adding ? "Sending..." : `Send ${selectedMembers.length} Invitation${selectedMembers.length !== 1 ? 's' : ''}`}
          </button>
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
        return;
      }

      onClose(); // Close the modal
      // Optionally redirect to boards page
      window.location.href = '/boards';
      
    } catch (error) {
      console.error("Error leaving board:", error);
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

    try {
      // Get current board data
      const { data: boardData, error: boardError } = await supabase
        .from("boards")
        .select("members")
        .eq("id", boardId)
        .single();

      if (boardError) {
        console.error("Error fetching board:", boardError);
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
        return;
      }

      // Update local state to reflect the change
      setMembers(prevMembers => 
        prevMembers.filter(member => member.user_id !== memberToRemove.user_id)
      );
      
    } catch (error) {
      console.error("Error removing member:", error);
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
