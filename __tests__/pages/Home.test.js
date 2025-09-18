import { render, screen, waitFor } from '@testing-library/react'
import Home from '@/app/page'
import { supabase } from '@/lib/supabaseClient'

// Mock the router
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: jest.fn(() => '/'),
}))

describe('Home Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders loading state initially', () => {
    // Mock loading state
    supabase.auth.getUser.mockImplementation(() => 
      new Promise(() => {}) // Never resolves, keeping loading state
    )
    
    render(<Home />)
    
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  test('renders guest landing page when not authenticated', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })
    
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
    
    // Mock the from method to prevent any database calls
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: null
      }),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    })
    
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText(/Organize work and life/)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByText('Get Started - It\'s Free')).toBeInTheDocument()
    expect(screen.getByText('Sign In')).toBeInTheDocument()
  })

  test('renders authenticated home when user is logged in', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' }
    const mockProfile = { username: 'testuser' }
    
    // Mock the Home component's useEffect calls
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
    
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null
      }),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    })
    
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
    
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText(/Welcome/)).toBeInTheDocument()
    }, { timeout: 3000 })
  })

  test('displays feature sections in guest landing', async () => {
    supabase.auth.getUser.mockResolvedValue({
      data: { user: null },
      error: null
    })
    
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
    
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText('Everything you need to work together')).toBeInTheDocument()
    })
    
    expect(screen.getByText('Task Management')).toBeInTheDocument()
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument()
    expect(screen.getByText('Progress Tracking')).toBeInTheDocument()
  })

  test('shows no notifications message when authenticated with no invitations', async () => {
    const mockUser = { id: 'test-user-id', email: 'test@example.com' }
    const mockProfile = { username: 'testuser' }
    
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
    
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: mockProfile,
        error: null
      }),
      order: jest.fn().mockResolvedValue({
        data: [],
        error: null
      })
    })
    
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
    
    render(<Home />)
    
    await waitFor(() => {
      expect(screen.getByText(/No notifications/)).toBeInTheDocument()
    }, { timeout: 3000 })
    
    expect(screen.getByText('You\'ll see board and workspace invitations here when there\'s activity.')).toBeInTheDocument()
  })
})
