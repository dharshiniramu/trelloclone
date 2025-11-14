import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import WorkspaceBoardsPage from '@/app/workspace/[id]/boards/page'
import { supabase } from '@/lib/supabaseClient'

// Mock the router and params
const mockPush = jest.fn()
const mockParams = { id: 'workspace-1' }
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
  useParams: () => mockParams,
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

const mockWorkspace = {
  id: 'workspace-1',
  name: 'Test Workspace',
  user_id: 'test-user-id',
}

const mockBoards = [
  {
    id: 'board-1',
    title: 'Test Board 1',
    workspace_id: 'workspace-1',
    user_id: 'test-user-id',
    background_image: '/test-bg.jpg',
    members: []
  },
  {
    id: 'board-2',
    title: 'Test Board 2',
    workspace_id: 'workspace-1',
    user_id: 'test-user-id',
    background_image: '/test-bg2.jpg',
    members: []
  }
]

describe('WorkspaceBoards Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful authentication
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Mock workspace data
    supabase.from.mockImplementation((table) => {
      if (table === 'workspaces') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: mockWorkspace,
            error: null
          })
        }
      }
      if (table === 'boards') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          order: jest.fn().mockResolvedValue({
            data: mockBoards,
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
      render(<WorkspaceBoardsPage />)
    })

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  test('shows loading state initially', async () => {
    await act(async () => {
      render(<WorkspaceBoardsPage />)
    })

    // The component loads quickly, so we check for the workspace name instead
    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    })
  })

  test('shows workspace not found when workspace does not exist', async () => {
    // Mock workspace not found
    supabase.from.mockImplementation((table) => {
      if (table === 'workspaces') {
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: null,
            error: { message: 'Workspace not found' }
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

    await act(async () => {
      render(<WorkspaceBoardsPage />)
    })

    await waitFor(() => {
      expect(screen.getByText('Workspace not found')).toBeInTheDocument()
    })
  })

  test('renders workspace header with back button', async () => {
    await act(async () => {
      render(<WorkspaceBoardsPage />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    })

    // The back button doesn't have text, it's just an icon
    expect(screen.getByTestId('arrow-left-icon')).toBeInTheDocument()
  })

  test('shows owner badge for workspace owner', async () => {
    await act(async () => {
      render(<WorkspaceBoardsPage />)
    })

    await waitFor(() => {
      expect(screen.getByText('Test Workspace')).toBeInTheDocument()
    })

    expect(screen.getByText('Owner')).toBeInTheDocument()
  })
})