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

        if (userError || !user) {
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

        setIsAuth(true);
      } catch (err) {
        console.error('Error fetching user:', err);
        setIsAuth(false);
      }
    };

    fetchUser();
  }, []);

  return (
    <>
      <Navbar username={profile?.username} />
      {isAuth ? (
        <AuthenticatedHome username={profile?.username} />
      ) : (
        <GuestLanding loading={isAuth === null} />
      )}
    </>
  );
}

function AuthenticatedHome({ username }) {
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

          {/* Empty state initially */}
          <div className="bg-white border border-gray-200 rounded-xl p-10 text-center animate-fade-in-up">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-blue-50 flex items-center justify-center">
              <Bell className="h-7 w-7 text-blue-600" />
            </div>
            <p className="text-lg font-medium text-gray-900 mb-1">
              No notifications yet
            </p>
            <p className="text-gray-500">
              You'll see updates here when there's activity on your boards and
              workspaces.
            </p>
          </div>
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
