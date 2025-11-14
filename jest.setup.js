import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  usePathname: jest.fn(() => '/'),
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return ({ children, href, ...props }) => {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    )
  }
})

// Mock Supabase client
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { session: null },
        error: null
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null },
        error: null
      }),
      signOut: jest.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null
      }),
    })),
    rpc: jest.fn().mockResolvedValue({
      data: null,
      error: null
    }),
  },
}))

// Mock Lucide React icons
jest.mock('lucide-react', () => ({
  Search: () => <div data-testid="search-icon">Search</div>,
  Bell: () => <div data-testid="bell-icon">Bell</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
  ChevronRight: () => <div data-testid="chevron-right-icon">ChevronRight</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  HelpCircle: () => <div data-testid="help-circle-icon">HelpCircle</div>,
  Plus: () => <div data-testid="plus-icon">Plus</div>,
  LogOut: () => <div data-testid="log-out-icon">LogOut</div>,
  X: () => <div data-testid="x-icon">X</div>,
  Home: () => <div data-testid="home-icon">Home</div>,
  LayoutDashboard: () => <div data-testid="layout-dashboard-icon">LayoutDashboard</div>,
  Layout: () => <div data-testid="layout-icon">Layout</div>,
  FileText: () => <div data-testid="file-text-icon">FileText</div>,
  Building2: () => <div data-testid="building2-icon">Building2</div>,
  Settings: () => <div data-testid="settings-icon">Settings</div>,
  Users: () => <div data-testid="users-icon">Users</div>,
  CheckSquare: () => <div data-testid="check-square-icon">CheckSquare</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">CheckCircle</div>,
  TrendingUp: () => <div data-testid="trending-up-icon">TrendingUp</div>,
  ArrowRight: () => <div data-testid="arrow-right-icon">ArrowRight</div>,
  ArrowLeft: () => <div data-testid="arrow-left-icon">ArrowLeft</div>,
  Check: () => <div data-testid="check-icon">Check</div>,
  Mail: () => <div data-testid="mail-icon">Mail</div>,
  FolderOpen: () => <div data-testid="folder-open-icon">FolderOpen</div>,
  Trash2: () => <div data-testid="trash2-icon">Trash2</div>,
  Trash: () => <div data-testid="trash-icon">Trash</div>,
  Eye: () => <div data-testid="eye-icon">Eye</div>,
  EyeOff: () => <div data-testid="eye-off-icon">EyeOff</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">AlertCircle</div>,
  Info: () => <div data-testid="info-icon">Info</div>,
  Star: () => <div data-testid="star-icon">Star</div>,
  Edit: () => <div data-testid="edit-icon">Edit</div>,
  ChevronUp: () => <div data-testid="chevron-up-icon">ChevronUp</div>,
  ChevronDown: () => <div data-testid="chevron-down-icon">ChevronDown</div>,
}))

// Global test setup
beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks()
})
