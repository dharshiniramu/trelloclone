'use client';
import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Link from 'next/link';
import {
  Plus,
  Users,
  CheckSquare,
  TrendingUp,
  ArrowRight,
  Bell,
  Check,
  X,
  Mail,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function Home() {
  const [isAuth, setIsAuth] = useState(null); // null = loading
  const [profile, setProfile] = useState(null); // user profile

  useEffect(() => {
    const fetchUser = async () => {
      try {
        // 1. Get current authenticated user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        console.log('Home page auth check:', { user: !!user, userError });

        if (userError || !user) {
          console.log('No authenticated user, showing guest landing');
          setIsAuth(false);
          return;
        }

        // 2. Get profile (username) from "profiles" table
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          setProfile(null);
        } else {
          setProfile(profileData);
        }

        console.log('User authenticated, showing authenticated home');
        setIsAuth(true);
      } catch (err) {
        console.error('Error fetching user:', err);
        setIsAuth(false);
      }
    };

    fetchUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, !!session);
      if (event === 'SIGNED_IN' && session) {
        fetchUser();
      } else if (event === 'SIGNED_OUT') {
        setIsAuth(false);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <>
      <Navbar username={profile?.username} />
      {isAuth === null ? (
        <div className="flex h-[calc(100vh-64px)] bg-gray-50 items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      ) : isAuth ? (
        <AuthenticatedHome username={profile?.username} />
      ) : (
        <GuestLanding loading={isAuth === null} />
      )}
    </>
  );
}

function AuthenticatedHome({ username }) {
  const [boardInvitations, setBoardInvitations] = useState([]);
  const [workspaceInvitations, setWorkspaceInvitations] = useState([]);
  const [acceptedBoardInvitations, setAcceptedBoardInvitations] = useState([]);
  const [acceptedWorkspaceInvitations, setAcceptedWorkspaceInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);
  const [tableError, setTableError] = useState(false);

  useEffect(() => {
    const fetchInvitations = async () => {
      setLoading(true);
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) return;

        // Mark notifications as viewed when user visits the page
        localStorage.setItem(`notifications_viewed_${user.id}`, new Date().getTime().toString());

        // Fetch board invitations
        const { data: boardInvitationsData, error: boardInvitationsError } = await supabase
          .from("board_invitations")
          .select(`
            id,
            board_id,
            role,
            created_at,
            invited_by_user_id,
            boards(title)
          `)
          .eq("invited_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        // Fetch workspace invitations
        const { data: workspaceInvitationsData, error: workspaceInvitationsError } = await supabase
          .from("workspace_invitations")
          .select(`
            id,
            workspace_id,
            role,
            created_at,
            invited_by_user_id
          `)
          .eq("invited_user_id", user.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        // Fetch accepted board invitations
        const { data: acceptedBoardInvitationsData, error: acceptedBoardInvitationsError } = await supabase
          .from("board_invitations")
          .select(`
            id,
            board_id,
            role,
            created_at,
            responded_at,
            invited_by_user_id,
            boards(title)
          `)
          .eq("invited_user_id", user.id)
          .eq("status", "accepted")
          .order("responded_at", { ascending: false });

        // Fetch accepted workspace invitations
        const { data: acceptedWorkspaceInvitationsData, error: acceptedWorkspaceInvitationsError } = await supabase
          .from("workspace_invitations")
          .select(`
            id,
            workspace_id,
            role,
            created_at,
            responded_at,
            invited_by_user_id
          `)
          .eq("invited_user_id", user.id)
          .eq("status", "accepted")
          .order("responded_at", { ascending: false });

        // Handle board invitations
        if (boardInvitationsError) {
          console.error("Error fetching board invitations:", boardInvitationsError);
          if (boardInvitationsError.code === '42P01') {
            console.log("board_invitations table doesn't exist yet. Run the setup SQL script.");
          }
          setBoardInvitations([]);
        } else {
          setBoardInvitations(boardInvitationsData || []);
        }

        // Handle workspace invitations
        if (workspaceInvitationsError) {
          console.error("Error fetching workspace invitations:", workspaceInvitationsError);
          if (workspaceInvitationsError.code === '42P01') {
            console.log("workspace_invitations table doesn't exist yet. Run the setup SQL script.");
          }
          setWorkspaceInvitations([]);
        } else {
          // Fetch workspace names for invitations
          let workspaceInvitationsWithNames = workspaceInvitationsData || [];
          if (workspaceInvitationsWithNames.length > 0) {
            try {
              const workspaceIds = workspaceInvitationsWithNames
                .map(inv => inv.workspace_id)
                .filter(id => id !== null);
              
              if (workspaceIds.length > 0) {
                const { data: workspaces, error: workspacesError } = await supabase
                  .from("workspaces")
                  .select("id, name")
                  .in("id", workspaceIds);

                if (!workspacesError && workspaces) {
                  workspaceInvitationsWithNames = workspaceInvitationsWithNames.map(invitation => {
                    const workspace = workspaces.find(w => w.id === invitation.workspace_id);
                    return {
                      ...invitation,
                      workspaces: workspace ? { name: workspace.name } : null
                    };
                  });
                }
              }
            } catch (err) {
              console.error("Error fetching workspace names for invitations:", err);
            }
          }
          setWorkspaceInvitations(workspaceInvitationsWithNames);
        }

        // Handle accepted board invitations
        if (acceptedBoardInvitationsError) {
          console.error("Error fetching accepted board invitations:", acceptedBoardInvitationsError);
          setAcceptedBoardInvitations([]);
        } else {
          setAcceptedBoardInvitations(acceptedBoardInvitationsData || []);
        }

        // Handle accepted workspace invitations
        if (acceptedWorkspaceInvitationsError) {
          console.error("Error fetching accepted workspace invitations:", acceptedWorkspaceInvitationsError);
          setAcceptedWorkspaceInvitations([]);
        } else {
          // Fetch workspace names for accepted invitations
          let acceptedWorkspaceInvitationsWithNames = acceptedWorkspaceInvitationsData || [];
          if (acceptedWorkspaceInvitationsWithNames.length > 0) {
            try {
              const workspaceIds = acceptedWorkspaceInvitationsWithNames
                .map(inv => inv.workspace_id)
                .filter(id => id !== null);
              
              if (workspaceIds.length > 0) {
                const { data: workspaces, error: workspacesError } = await supabase
                  .from("workspaces")
                  .select("id, name")
                  .in("id", workspaceIds);

                if (!workspacesError && workspaces) {
                  acceptedWorkspaceInvitationsWithNames = acceptedWorkspaceInvitationsWithNames.map(invitation => {
                    const workspace = workspaces.find(w => w.id === invitation.workspace_id);
                    return {
                      ...invitation,
                      workspaces: workspace ? { name: workspace.name } : null
                    };
                  });
                }
              }
            } catch (err) {
              console.error("Error fetching workspace names for accepted invitations:", err);
            }
          }
          setAcceptedWorkspaceInvitations(acceptedWorkspaceInvitationsWithNames);
        }

        // Get usernames for all inviters
        const allInvitations = [
          ...(boardInvitationsData || []), 
          ...(workspaceInvitationsData || []),
          ...(acceptedBoardInvitationsData || []),
          ...(acceptedWorkspaceInvitationsData || [])
        ];
        if (allInvitations.length > 0) {
          const inviterIds = [...new Set(allInvitations.map(inv => inv.invited_by_user_id))];
          const { data: profiles, error: profilesError } = await supabase
            .from("profiles")
            .select("id, username")
            .in("id", inviterIds);

          if (!profilesError && profiles) {
            // Add usernames to board invitations
            const boardInvitationsWithUsernames = (boardInvitationsData || []).map(invitation => ({
              ...invitation,
              inviter_username: profiles.find(p => p.id === invitation.invited_by_user_id)?.username || 'Unknown User'
            }));
            setBoardInvitations(boardInvitationsWithUsernames);

            // Add usernames to workspace invitations
            const workspaceInvitationsWithUsernames = (workspaceInvitationsData || []).map(invitation => ({
              ...invitation,
              inviter_username: profiles.find(p => p.id === invitation.invited_by_user_id)?.username || 'Unknown User'
            }));
            setWorkspaceInvitations(workspaceInvitationsWithUsernames);

            // Add usernames to accepted board invitations
            const acceptedBoardInvitationsWithUsernames = (acceptedBoardInvitationsData || []).map(invitation => ({
              ...invitation,
              inviter_username: profiles.find(p => p.id === invitation.invited_by_user_id)?.username || 'Unknown User'
            }));
            setAcceptedBoardInvitations(acceptedBoardInvitationsWithUsernames);

            // Add usernames to accepted workspace invitations
            const acceptedWorkspaceInvitationsWithUsernames = (acceptedWorkspaceInvitationsData || []).map(invitation => ({
              ...invitation,
              inviter_username: profiles.find(p => p.id === invitation.invited_by_user_id)?.username || 'Unknown User'
            }));
            setAcceptedWorkspaceInvitations(acceptedWorkspaceInvitationsWithUsernames);
          }
        }
      } catch (error) {
        console.error("Error fetching invitations:", error);
        setBoardInvitations([]);
        setWorkspaceInvitations([]);
        setAcceptedBoardInvitations([]);
        setAcceptedWorkspaceInvitations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchInvitations();
  }, []);

  const handleInvitationResponse = async (invitationId, action, type) => {
    setProcessing(invitationId);
    try {
      if (action === 'accept') {
        if (type === 'board') {
          // Use the database function to accept board invitation
          const { data, error } = await supabase.rpc('accept_board_invitation', {
            invitation_id: invitationId
          });

          if (error) {
            console.error("Error accepting board invitation:", error);
            alert("Failed to accept invitation. Please try again.");
            return;
          }

          if (data) {
            // Remove the invitation from the list
            setBoardInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            alert("Successfully joined the board!");
          } else {
            alert("Failed to accept invitation. It may have already been processed.");
          }
        } else if (type === 'workspace') {
          // Use the database function to accept workspace invitation
          const { data, error } = await supabase.rpc('accept_workspace_invitation', {
            invitation_id: invitationId
          });

          if (error) {
            console.error("Error accepting workspace invitation:", error);
            alert("Failed to accept invitation. Please try again.");
            return;
          }

          if (data) {
            // Remove the invitation from the list
            setWorkspaceInvitations(prev => prev.filter(inv => inv.id !== invitationId));
            alert("Successfully joined the workspace!");
          } else {
            alert("Failed to accept invitation. It may have already been processed.");
          }
        }
      } else if (action === 'decline') {
        const tableName = type === 'board' ? 'board_invitations' : 'workspace_invitations';
        
        // Update invitation status to declined
        const { error } = await supabase
          .from(tableName)
          .update({ 
            status: 'declined',
            responded_at: new Date().toISOString()
          })
          .eq("id", invitationId);

        if (error) {
          console.error("Error declining invitation:", error);
          alert("Failed to decline invitation. Please try again.");
          return;
        }

        // Remove the invitation from the appropriate list
        if (type === 'board') {
          setBoardInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        } else {
          setWorkspaceInvitations(prev => prev.filter(inv => inv.id !== invitationId));
        }
        alert("Invitation declined.");
      }
    } catch (error) {
      console.error("Error handling invitation:", error);
      alert("An unexpected error occurred. Please try again.");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] bg-gray-50">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center animate-fade-in">
            <Bell className="h-6 w-6 text-blue-600 mr-2" />
            Welcome, {username || 'User'}!
          </h1>

          {loading ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center animate-fade-in-up">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Loading invitations...</p>
            </div>
          ) : tableError ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center animate-fade-in-up">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-yellow-50 flex items-center justify-center">
                <Bell className="h-7 w-7 text-yellow-600" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                Setup Required
              </p>
              <p className="text-gray-500 mb-4">
                The invitation system needs to be set up. Please run the database setup script to enable board invitations.
              </p>
              <div className="text-sm text-gray-400">
                Run the SQL script from setup_board_members_table.sql in your Supabase SQL Editor
              </div>
            </div>
          ) : (boardInvitations.length === 0 && workspaceInvitations.length === 0 && acceptedBoardInvitations.length === 0 && acceptedWorkspaceInvitations.length === 0) ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center animate-fade-in-up">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
                <Bell className="h-7 w-7 text-blue-600" />
              </div>
              <p className="text-lg font-medium text-gray-900 mb-1">
                No notifications yet
              </p>
              <p className="text-gray-500">
                You'll see board and workspace invitations here when there's activity.
              </p>
            </div>
          ) : (
            <div className="space-y-6 animate-fade-in-up">
              {/* Board Invitations */}
              {boardInvitations.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Board Invitations ({boardInvitations.length})
                  </h2>
                  <div className="space-y-4">
                    {boardInvitations.map((invitation) => (
                      <div
                        key={`board-${invitation.id}`}
                        className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <Mail className="h-6 w-6 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                Board Invitation
                              </h3>
                              <p className="text-gray-600 mb-2">
                                <span className="font-medium">{invitation.inviter_username || 'Someone'}</span> invited you to join the board{' '}
                                <span className="font-medium text-blue-600">"{invitation.boards?.title}"</span>
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Role: {invitation.role}</span>
                                <span>•</span>
                                <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleInvitationResponse(invitation.id, 'accept', 'board')}
                              disabled={processing === invitation.id}
                              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              {processing === invitation.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Accept
                            </button>
                            <button
                              onClick={() => handleInvitationResponse(invitation.id, 'decline', 'board')}
                              disabled={processing === invitation.id}
                              className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Workspace Invitations */}
              {workspaceInvitations.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">
                    Workspace Invitations ({workspaceInvitations.length})
                  </h2>
                  <div className="space-y-4">
                    {workspaceInvitations.map((invitation) => (
                      <div
                        key={`workspace-${invitation.id}`}
                        className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <Users className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                Workspace Invitation
                              </h3>
                              <p className="text-gray-600 mb-2">
                                <span className="font-medium">{invitation.inviter_username || 'Someone'}</span> invited you to join the workspace{' '}
                                <span className="font-medium text-green-600">"{invitation.workspaces?.name}"</span>
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Role: {invitation.role}</span>
                                <span>•</span>
                                <span>{new Date(invitation.created_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleInvitationResponse(invitation.id, 'accept', 'workspace')}
                              disabled={processing === invitation.id}
                              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              {processing === invitation.id ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              ) : (
                                <Check className="h-4 w-4 mr-2" />
                              )}
                              Accept
                            </button>
                            <button
                              onClick={() => handleInvitationResponse(invitation.id, 'decline', 'workspace')}
                              disabled={processing === invitation.id}
                              className="flex items-center px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                            >
                              <X className="h-4 w-4 mr-2" />
                              Decline
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Accepted Notifications Section */}
              {(acceptedBoardInvitations.length > 0 || acceptedWorkspaceInvitations.length > 0) && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Check className="h-5 w-5 text-green-600 mr-2" />
                    Accepted Notifications
                  </h2>
                  
                  <div className="space-y-4">
                    {/* Accepted Board Invitations */}
                    {acceptedBoardInvitations.map((invitation) => (
                      <div
                        key={`accepted-board-${invitation.id}`}
                        className="bg-green-50 border border-green-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                Board Invitation Accepted
                              </h3>
                              <p className="text-gray-600 mb-2">
                                You accepted the invitation from <span className="font-medium">{invitation.inviter_username || 'Someone'}</span> to join the board{' '}
                                <span className="font-medium text-green-600">"{invitation.boards?.title}"</span>
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Role: {invitation.role}</span>
                                <span>•</span>
                                <span>Accepted: {new Date(invitation.responded_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Accepted Workspace Invitations */}
                    {acceptedWorkspaceInvitations.map((invitation) => (
                      <div
                        key={`accepted-workspace-${invitation.id}`}
                        className="bg-green-50 border border-green-200 rounded-xl p-6 hover:shadow-md transition-shadow duration-200"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                              <Check className="h-6 w-6 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                Workspace Invitation Accepted
                              </h3>
                              <p className="text-gray-600 mb-2">
                                You accepted the invitation from <span className="font-medium">{invitation.inviter_username || 'Someone'}</span> to join the workspace{' '}
                                <span className="font-medium text-green-600">"{invitation.workspaces?.name}"</span>
                              </p>
                              <div className="flex items-center space-x-4 text-sm text-gray-500">
                                <span>Role: {invitation.role}</span>
                                <span>•</span>
                                <span>Accepted: {new Date(invitation.responded_at).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GuestLanding({ loading }) {
  return (
    <div className="flex min-h-[calc(100vh-64px)] bg-gray-50">
      {/* No sidebar for guests; show marketing content */}
      <div className="flex-1 overflow-auto">
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          {/* Hero Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
            <div className="text-center animate-fade-in-up">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Organize work and life,{' '}
                <span className="text-blue-600">together</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
                TrelloClone helps teams move work forward. Collaborate, manage
                projects, and reach new productivity peaks.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/signup"
                  className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  Get Started - It's Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center px-8 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-lg hover:scale-105"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>

          {/* Features Section */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="text-center mb-16 animate-fade-in">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Everything you need to work together
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                From high-level roadmaps to the specific details, TrelloClone
                helps teams coordinate work and stay aligned.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: '0.1s' }}
              >
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-6">
                  <CheckSquare className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Task Management
                </h3>
                <p className="text-gray-600">
                  Create, organize, and track tasks with ease. Use boards,
                  lists, and cards to visualize your workflow.
                </p>
              </div>

              {/* Feature 2 */}
              <div
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: '0.2s' }}
              >
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-6">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Team Collaboration
                </h3>
                <p className="text-gray-600">
                  Work together seamlessly with real-time updates, comments, and
                  file sharing capabilities.
                </p>
              </div>

              {/* Feature 3 */}
              <div
                className="bg-white rounded-xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200 hover:scale-105 animate-fade-in-up"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-6">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-4">
                  Progress Tracking
                </h3>
                <p className="text-gray-600">
                  Monitor project progress with visual indicators, deadlines,
                  and performance analytics.
                </p>
              </div>
            </div>
          </div>

          {/* CTA Section */}
          <div className="bg-blue-600 py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center animate-fade-in">
              <h2 className="text-3xl font-bold text-white mb-4">
                Ready to get started?
              </h2>
              <p className="text-xl text-blue-100 mb-8">
                Join thousands of teams already using TrelloClone to organize
                their work.
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-lg text-blue-600 bg-white hover:bg-gray-50 transition-all duration-200 hover:shadow-lg hover:scale-105"
              >
                Start your free trial
                <Plus className="ml-2 h-5 w-5" />
              </Link>
            </div>
          </div>

          {/* Footer */}
          <footer className="bg-gray-900 text-white py-12">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid md:grid-cols-4 gap-8">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                      <span className="text-white font-bold text-lg">T</span>
                    </div>
                    <span className="text-xl font-bold">TrelloClone</span>
                  </div>
                  <p className="text-gray-400">
                    The visual work management tool that empowers teams to
                    ideate, plan, manage and celebrate their work together in a
                    collaborative, productive, and organized way.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Product</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <Link
                        href="/features"
                        className="hover:text-white transition-colors"
                      >
                        Features
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/pricing"
                        className="hover:text-white transition-colors"
                      >
                        Pricing
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/templates"
                        className="hover:text-white transition-colors"
                      >
                        Templates
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/integrations"
                        className="hover:text-white transition-colors"
                      >
                        Integrations
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Support</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <Link
                        href="/help"
                        className="hover:text-white transition-colors"
                      >
                        Help Center
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/contact"
                        className="hover:text-white transition-colors"
                      >
                        Contact Us
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/community"
                        className="hover:text-white transition-colors"
                      >
                        Community
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/status"
                        className="hover:text-white transition-colors"
                      >
                        Status
                      </Link>
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-4">Company</h3>
                  <ul className="space-y-2 text-gray-400">
                    <li>
                      <Link
                        href="/about"
                        className="hover:text-white transition-colors"
                      >
                        About
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/careers"
                        className="hover:text-white transition-colors"
                      >
                        Careers
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/blog"
                        className="hover:text-white transition-colors"
                      >
                        Blog
                      </Link>
                    </li>
                    <li>
                      <Link
                        href="/press"
                        className="hover:text-white transition-colors"
                      >
                        Press
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
                <p>&copy; 2024 TrelloClone. All rights reserved.</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}
