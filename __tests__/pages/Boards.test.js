import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Boards from '@/app/boards/page'

// Mock the router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
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

// Mock Supabase
jest.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user', email: 'test@example.com' } },
        error: null
      })
    },
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    order: jest.fn().mockResolvedValue({ data: [], error: null }),
    single: jest.fn().mockResolvedValue({ data: null, error: null })
  }
}))

describe('Boards Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders page with navbar and sidebar', async () => {
    await act(async () => {
      render(<Boards />)
    })

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  test('renders page header', async () => {
    await act(async () => {
      render(<Boards />)
    })

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Boards' })).toBeInTheDocument()
    })
  })

  test('renders refresh button', async () => {
    await act(async () => {
      render(<Boards />)
    })

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })
  })

  test('renders invite members button', async () => {
    await act(async () => {
      render(<Boards />)
    })

    await waitFor(() => {
      expect(screen.getByText('Invite Members')).toBeInTheDocument()
    })
  })

  test('renders create board button', async () => {
    await act(async () => {
      render(<Boards />)
    })

    await waitFor(() => {
      const createButtons = screen.getAllByText('Create board')
      expect(createButtons).toHaveLength(2) // Header button and empty state button
    })
  })

  test('shows empty state when no boards', async () => {
    await act(async () => {
      render(<Boards />)
    })

    await waitFor(() => {
      expect(screen.getByText('No boards created so far')).toBeInTheDocument()
      expect(screen.getByText(/Create your first board to start organizing tasks/)).toBeInTheDocument()
    })
  })

  test('handles refresh button click', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(<Boards />)
    })

    await waitFor(() => {
      expect(screen.getByText('Refresh')).toBeInTheDocument()
    })

    const refreshButton = screen.getByText('Refresh')
    await user.click(refreshButton)

    // Should not throw any errors
    expect(refreshButton).toBeInTheDocument()
  })

  test('handles invite members button click', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(<Boards />)
    })

    await waitFor(() => {
      expect(screen.getByText('Invite Members')).toBeInTheDocument()
    })

    const inviteButton = screen.getByText('Invite Members')
    await user.click(inviteButton)

    // Should not throw any errors
    expect(inviteButton).toBeInTheDocument()
  })

  test('handles create board button click', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(<Boards />)
    })

    await waitFor(() => {
      const createButtons = screen.getAllByText('Create board')
      expect(createButtons).toHaveLength(2)
    })

    // Click the first create board button (header button)
    const createButtons = screen.getAllByText('Create board')
    await user.click(createButtons[0])

    // Should not throw any errors
    expect(createButtons[0]).toBeInTheDocument()
  })

  test('renders page with correct layout structure', async () => {
    const { container } = await act(async () => {
      return render(<Boards />)
    })

    // Check main layout structure
    const mainContainer = container.querySelector('.flex.h-\\[calc\\(100vh-64px\\)\\]')
    expect(mainContainer).toBeInTheDocument()

    const mainElement = container.querySelector('main.flex-1')
    expect(mainElement).toBeInTheDocument()

    const contentContainer = container.querySelector('.max-w-7xl')
    expect(contentContainer).toBeInTheDocument()
  })
})