import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkspacePage from '@/app/workspace/page'
import { supabase } from '@/lib/supabaseClient'

// Mock the router
const mockPush = jest.fn()
const mockRefresh = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: mockRefresh,
  }),
  usePathname: jest.fn(() => '/workspace'),
}))

// Mock the components
jest.mock('@/components/Navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Mock Navbar</div>
  }
})

jest.mock('@/components/Sidebar', () => {
  return function MockSidebar() {
    return <div data-testid="sidebar">Mock Sidebar</div>
  }
})

const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
}

const mockWorkspaces = [
  { id: 'workspace-1', name: 'My Workspace', user_id: 'test-user-id', userRole: 'owner' },
  { id: 'workspace-2', name: 'Team Workspace', user_id: 'other-user-id', userRole: 'member' },
]

describe('Workspace Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful authentication
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock empty workspaces initially
    supabase.from.mockImplementation((table) => {
      if (table === 'workspaces') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }
      }
      if (table === 'workspace_invitations') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: [],
            error: null
          })
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }
    })
  })

  test('renders page with navbar and sidebar', async () => {
    await act(async () => {
      render(<WorkspacePage />)
    })

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  test('renders page title and buttons', async () => {
    await act(async () => {
      render(<WorkspacePage />)
    })

    await waitFor(() => {
      expect(screen.getByText('Workspaces')).toBeInTheDocument()
    })

    expect(screen.getByText('Create workspace')).toBeInTheDocument()
    expect(screen.getByText('Invite members to workspace')).toBeInTheDocument()
  })

  test('shows empty state when no workspaces', async () => {
    await act(async () => {
      render(<WorkspacePage />)
    })

    await waitFor(() => {
      expect(screen.getByText('No workspaces found. Create one or wait for an invitation!')).toBeInTheDocument()
    })
  })

  test('opens create workspace modal when button is clicked', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(<WorkspacePage />)
    })

    await waitFor(() => {
      expect(screen.getByText('Create workspace')).toBeInTheDocument()
    })

    const createButtons = screen.getAllByText('Create workspace')
    await user.click(createButtons[0]) // Click the first button (main page button)

    await waitFor(() => {
      expect(screen.getByText('Workspace name')).toBeInTheDocument()
    })
  })

  test('renders page with correct layout structure', async () => {
    const { container } = await act(async () => {
      return render(<WorkspacePage />)
    })

    // Check main layout structure
    const mainContainer = container.querySelector('.flex.h-\\[calc\\(100vh-64px\\)\\]')
    expect(mainContainer).toBeInTheDocument()

    const mainElement = container.querySelector('main.flex-1')
    expect(mainElement).toBeInTheDocument()
  })
})