'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  Home, 
  Building2, 
  Bell,
  Settings,
} from 'lucide-react';

export default function Sidebar() {
  const pathname = usePathname();
  const [activeSection, setActiveSection] = useState('home');
  const [expandedSection, setExpandedSection] = useState(null);

  // Set active section based on current pathname
  useEffect(() => {
    if (pathname === '/') {
      setActiveSection('home');
    } else if (pathname === '/boards') {
      setActiveSection('boards');
    } else if (pathname === '/workspace') {
      setActiveSection('workspace');
    } else if (pathname.startsWith('/templates')) {
      setActiveSection('templates');
    }
  }, [pathname]);

  const handleSectionClick = (section) => {
    setActiveSection(section);
    if (section === 'templates') {
      setExpandedSection(expandedSection === 'templates' ? null : 'templates');
    }
  };

  const templateCategories = [
    { key: 'personal', label: 'Personal' },
    { key: 'productivity', label: 'Productivity' },
    { key: 'product_management', label: 'Product Management' },
    { key: 'project_management', label: 'Project Management' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      <div className="p-4" />

      <div className="flex-1 overflow-y-auto">
        <nav className="p-4 space-y-2">
          {/* Home */}
          <Link
            href="/"
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === 'home' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
            }`}
            onClick={() => handleSectionClick('home')}
          >
            <Home className="h-5 w-5" />
            <span>Home</span>
            <div className="ml-auto flex items-center space-x-2">
              <Bell className="h-4 w-4 text-gray-400" />
            </div>
          </Link>

          {/* Boards */}
          <Link
            href="/boards"
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === 'boards' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
            }`}
            onClick={() => handleSectionClick('boards')}
          >
            <LayoutDashboard className="h-5 w-5" />
            <span>Boards</span>
          </Link>

          {/* Templates - categories only */}
          <button
            onClick={() => handleSectionClick('templates')}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === 'templates' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
            }`}
          >
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5" />
              <span>Templates</span>
            </div>
            <svg className={`h-4 w-4 transition-transform duration-200 ${expandedSection === 'templates' ? 'rotate-90' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 6l4 4 4-4 1.5 1.5L10 13 4.5 7.5 6 6z" clipRule="evenodd"/></svg>
          </button>
          
          {/* Template dropdown with smooth animation */}
          <div className={`overflow-hidden transition-all duration-300 ease-in-out ${
            expandedSection === 'templates' ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
          }`}>
            <div className="ml-6 mt-2 space-y-1">
              {templateCategories.map(cat => (
                <Link 
                  key={cat.key} 
                  href={`/templates?category=${cat.key}`} 
                  className="block px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 hover:text-blue-600 rounded-md transition-all duration-200 hover:shadow-sm"
                  onClick={(e) => {
                    // Prevent the sidebar from changing when clicking template categories
                    e.stopPropagation();
                    // Keep templates section expanded and active
                    setActiveSection('templates');
                    setExpandedSection('templates');
                  }}
                >
                  {cat.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Workspace */}
          <Link
            href="/workspace"
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeSection === 'workspace' ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' : 'text-gray-700 hover:bg-gray-50 hover:shadow-sm'
            }`}
            onClick={() => handleSectionClick('workspace')}
          >
            <Building2 className="h-5 w-5" />
            <span>Workspace</span>
          </Link>
        </nav>
      </div>

      
    </div>
  );
} 