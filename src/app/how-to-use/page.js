'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ChevronRight, Users, Plus, Edit, Trash2, Eye, EyeOff, Settings, Bell, Search, Home, Layout, FolderOpen, CheckCircle, AlertCircle, Info } from 'lucide-react';

export default function HowToUse() {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const sections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <CheckCircle className="h-5 w-5 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Welcome to TrelloClone!</h4>
            <p className="text-blue-800 text-sm">
              This is a project management tool inspired by Trello. You can organize your work using boards, lists, and cards.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">First Steps:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Create an account or sign in to get started</li>
              <li>Create your first workspace to organize your projects</li>
              <li>Add boards to your workspace for different projects</li>
              <li>Create lists and cards to break down your work</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'navigation',
      title: 'Navigation & Interface',
      icon: <Home className="h-5 w-5 text-blue-500" />,
      content: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Search className="h-4 w-4 mr-2" />
                Search Bar
              </h4>
              <p className="text-sm text-gray-700">
                Use the search bar to quickly find your boards and workspaces. Type any part of the name to see matching results.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </h4>
              <p className="text-sm text-gray-700">
                Click the bell icon to go to your home page where you can see all your notifications and recent activity.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Account Menu
              </h4>
              <p className="text-sm text-gray-700">
                Click on your profile to access account settings, edit your profile, create workspaces, and sign out.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center">
                <FolderOpen className="h-4 w-4 mr-2" />
                Workspaces
              </h4>
              <p className="text-sm text-gray-700">
                Workspaces help you organize multiple boards. Each workspace can contain multiple boards for related projects.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'workspaces',
      title: 'Managing Workspaces',
      icon: <FolderOpen className="h-5 w-5 text-purple-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h4 className="font-semibold text-purple-900 mb-2">What are Workspaces?</h4>
            <p className="text-purple-800 text-sm">
              Workspaces are containers for your boards. They help you organize related projects together.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Creating a Workspace:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Click on your profile in the top-right corner</li>
              <li>Select "Create Workspace" from the dropdown menu</li>
              <li>Give your workspace a descriptive name</li>
              <li>Add a description (optional) to help team members understand its purpose</li>
            </ol>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Managing Workspaces:</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>View all your workspaces from the main dashboard</li>
              <li>Click on a workspace to see all its boards</li>
              <li>Add members to collaborate on workspace projects</li>
              <li>Customize workspace settings and permissions</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      id: 'boards',
      title: 'Working with Boards',
      icon: <Layout className="h-5 w-5 text-orange-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h4 className="font-semibold text-orange-900 mb-2">What are Boards?</h4>
            <p className="text-orange-800 text-sm">
              Boards represent your projects. Each board contains lists and cards to organize your work.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Creating a Board:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Go to your workspace or the main boards page</li>
              <li>Click the "Create Board" button</li>
              <li>Choose a board template or start from scratch</li>
              <li>Give your board a name and description</li>
              <li>Select a background color or image</li>
              <li>Set privacy settings (private or public)</li>
            </ol>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Board Features:</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Customization:</h5>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Change background colors or images</li>
                  <li>Add board descriptions</li>
                  <li>Set board visibility</li>
                  <li>Add board members</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Organization:</h5>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Create multiple lists</li>
                  <li>Add cards to lists</li>
                  <li>Move cards between lists</li>
                  <li>Archive completed lists</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'lists-cards',
      title: 'Lists & Cards',
      icon: <Edit className="h-5 w-5 text-green-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h4 className="font-semibold text-green-900 mb-2">Lists and Cards</h4>
            <p className="text-green-800 text-sm">
              Lists help you organize your work into stages, while cards represent individual tasks or items.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Creating Lists:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Open any board</li>
              <li>Click "Add a list" at the right side of the board</li>
              <li>Type a name for your list (e.g., "To Do", "In Progress", "Done")</li>
              <li>Press Enter or click "Add List"</li>
            </ol>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Creating Cards:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Click "Add a card" at the bottom of any list</li>
              <li>Type the card title</li>
              <li>Press Enter to create the card</li>
              <li>Click on the card to add details, due dates, and attachments</li>
            </ol>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Card Management:</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Moving Cards:</h5>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Drag and drop cards between lists</li>
                  <li>Use the move option in the card menu</li>
                  <li>Cards maintain their position within lists</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Card Details:</h5>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Add descriptions and comments</li>
                  <li>Set due dates and reminders</li>
                  <li>Assign cards to team members</li>
                  <li>Add labels and checklists</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'collaboration',
      title: 'Team Collaboration',
      icon: <Users className="h-5 w-5 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h4 className="font-semibold text-indigo-900 mb-2">Working with Teams</h4>
            <p className="text-indigo-800 text-sm">
              Invite team members to collaborate on boards and workspaces. Everyone can see changes in real-time.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Adding Members:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Open a board or workspace</li>
              <li>Click the "Members" button or icon</li>
              <li>Enter email addresses of people you want to invite</li>
              <li>Choose their permission level (viewer, editor, admin)</li>
              <li>Send the invitation</li>
            </ol>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Permission Levels:</h4>
            <div className="space-y-2">
              <div className="flex items-start space-x-3">
                <Eye className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h5 className="font-medium text-gray-900">Viewer</h5>
                  <p className="text-sm text-gray-700">Can see boards and cards but cannot make changes</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Edit className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h5 className="font-medium text-gray-900">Editor</h5>
                  <p className="text-sm text-gray-700">Can create, edit, and move cards and lists</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Settings className="h-4 w-4 text-gray-500 mt-0.5" />
                <div>
                  <h5 className="font-medium text-gray-900">Admin</h5>
                  <p className="text-sm text-gray-700">Can manage members, settings, and delete boards</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'templates',
      title: 'Using Templates',
      icon: <Plus className="h-5 w-5 text-teal-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <h4 className="font-semibold text-teal-900 mb-2">Board Templates</h4>
            <p className="text-teal-800 text-sm">
              Start with pre-built templates to quickly set up common project types and workflows.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Available Templates:</h4>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Project Management:</h5>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Basic Project Board</li>
                  <li>Agile Development</li>
                  <li>Marketing Campaign</li>
                  <li>Event Planning</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h5 className="font-medium text-gray-900">Personal Organization:</h5>
                <ul className="list-disc list-inside text-sm text-gray-700 space-y-1">
                  <li>Personal Tasks</li>
                  <li>Habit Tracker</li>
                  <li>Goal Setting</li>
                  <li>Learning Path</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Using Templates:</h4>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Go to the Templates page from the main navigation</li>
              <li>Browse available templates by category</li>
              <li>Click on a template to preview it</li>
              <li>Click "Use Template" to create a new board</li>
              <li>Customize the template to fit your needs</li>
            </ol>
          </div>
        </div>
      )
    },
    {
      id: 'tips-tricks',
      title: 'Tips & Best Practices',
      icon: <Info className="h-5 w-5 text-yellow-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h4 className="font-semibold text-yellow-900 mb-2">Pro Tips</h4>
            <p className="text-yellow-800 text-sm">
              Make the most of TrelloClone with these expert tips and best practices.
            </p>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Organization Tips:</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>Use descriptive names for boards, lists, and cards</li>
              <li>Add due dates to important cards</li>
              <li>Use labels to categorize cards by priority or type</li>
              <li>Archive completed lists to keep boards clean</li>
              <li>Add descriptions to provide context for team members</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Workflow Best Practices:</h4>
            <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
              <li>Keep lists to 5-7 items maximum for better visibility</li>
              <li>Use consistent naming conventions across boards</li>
              <li>Regularly review and update card statuses</li>
              <li>Use checklists for complex tasks</li>
              <li>Comment on cards to provide updates and context</li>
            </ul>
          </div>
          
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-900">Keyboard Shortcuts:</h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p><kbd className="bg-white px-2 py-1 rounded border">Space</kbd> - Open card details</p>
                  <p><kbd className="bg-white px-2 py-1 rounded border">Enter</kbd> - Create new card</p>
                </div>
                <div>
                  <p><kbd className="bg-white px-2 py-1 rounded border">Esc</kbd> - Close modals</p>
                  <p><kbd className="bg-white px-2 py-1 rounded border">/</kbd> - Focus search</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/"
                className="flex items-center text-gray-600 hover:text-gray-900 transition-colors duration-200"
              >
                <ArrowLeft className="h-5 w-5 mr-2" />
                Back to Home
              </Link>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-2xl font-bold text-gray-900">How to Use TrelloClone</h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Complete User Guide</h2>
            <p className="text-gray-600">
              Learn everything you need to know to get the most out of TrelloClone. 
              Click on any section below to expand and read the detailed instructions.
            </p>
          </div>

          <div className="divide-y divide-gray-200">
            {sections.map((section) => (
              <div key={section.id} className="p-6">
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full flex items-center justify-between text-left hover:bg-gray-50 rounded-lg p-2 -m-2 transition-colors duration-200"
                >
                  <div className="flex items-center space-x-3">
                    {section.icon}
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                  </div>
                  {expandedSections[section.id] ? (
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                
                {expandedSections[section.id] && (
                  <div className="mt-4 pl-8">
                    {section.content}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Info className="h-4 w-4" />
                <span>Need more help? Contact support or check our FAQ section.</span>
              </div>
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 text-sm font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
