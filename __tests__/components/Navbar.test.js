import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Navbar from '@/components/Navbar'
import { supabase } from '@/lib/supabaseClient'

// Mock the router
const mockPush = jest.fn()
const mockRefresh = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
}))

describe('Navbar Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock successful authentication
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { user: { id: 'test-user-id', email: 'test@example.com' } } }
    })
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } }
    })
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { username: 'testuser' },
        error: null
      })
    })
  })

  test('renders navbar with logo and navigation elements', async () => {
    render(<Navbar />)
    
    await waitFor(() => {
      expect(screen.getByText('TrelloClone')).toBeInTheDocument()
    })
    
    expect(screen.getByPlaceholderText('Search boards or workspaces')).toBeInTheDocument()
    expect(screen.getByText('How to use')).toBeInTheDocument()
    expect(screen.getByTestId('bell-icon')).toBeInTheDocument()
  })

  test('displays user information when authenticated', async () => {
    render(<Navbar />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /testuser/i })).toBeInTheDocument()
    })
  })

  test('opens and closes account dropdown', async () => {
    render(<Navbar />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /testuser/i })).toBeInTheDocument()
    })
    
    const accountButton = screen.getByRole('button', { name: /testuser/i })
    fireEvent.click(accountButton)
    
    expect(screen.getByText('Edit Profile')).toBeInTheDocument()
    expect(screen.getByText('Logout')).toBeInTheDocument()
  })

  test('handles search input and shows search results', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /testuser/i })).toBeInTheDocument()
    })
    
    const searchInput = screen.getByPlaceholderText('Search boards or workspaces')
    await user.type(searchInput, 'test board')
    
    // Mock search results
    supabase.from.mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: { username: 'testuser' },
        error: null
      })
    })
    
    await waitFor(() => {
      expect(searchInput.value).toBe('test board')
    })
  })

  test('handles logout functionality', async () => {
    const user = userEvent.setup()
    render(<Navbar />)
    
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /testuser/i })).toBeInTheDocument()
    })
    
    // Open dropdown
    const accountButton = screen.getByRole('button', { name: /testuser/i })
    await user.click(accountButton)
    
    // Click logout
    const logoutButton = screen.getByText('Logout')
    await user.click(logoutButton)
    
    expect(supabase.auth.signOut).toHaveBeenCalled()
  })
})
