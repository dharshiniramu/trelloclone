import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TemplatesPage from '@/app/templates/page'

// Mock the router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    refresh: jest.fn(),
  }),
  useSearchParams: () => ({
    get: jest.fn().mockReturnValue(null)
  }),
}))

// Mock Next.js Link component
jest.mock('next/link', () => {
  return function MockLink({ children, href }) {
    return <a href={href}>{children}</a>
  }
})

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

jest.mock('@/components/CreateBoardFromTemplateModal', () => {
  return function MockCreateBoardFromTemplateModal({ template, onClose, onCreated }) {
    return (
      <div data-testid="create-board-modal">
        <div>Create Board Modal</div>
        <div>Template: {template?.title}</div>
        <button onClick={onClose}>Close</button>
        <button onClick={() => onCreated({ id: 'test-board-id' })}>Create Board</button>
      </div>
    )
  }
})

describe('Templates Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders page with navbar and sidebar', async () => {
    await act(async () => {
      render(<TemplatesPage />)
    })

    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    // Templates page has its own sidebar, not the mocked one
    expect(screen.getByText('Templates')).toBeInTheDocument()
  })

  test('renders templates sidebar with categories', async () => {
    await act(async () => {
      render(<TemplatesPage />)
    })

    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Productivity')).toBeInTheDocument()
    expect(screen.getByText('Product Management')).toBeInTheDocument()
    expect(screen.getByText('Project Management')).toBeInTheDocument()
  })

  test('renders personal templates by default', async () => {
    await act(async () => {
      render(<TemplatesPage />)
    })

    expect(screen.getByText('Personal Task Tracker')).toBeInTheDocument()
    expect(screen.getByText('Home Management')).toBeInTheDocument()
    expect(screen.getByText('Learning Goals')).toBeInTheDocument()
    expect(screen.getByText('Health & Fitness')).toBeInTheDocument()
  })

  test('opens create board modal when template is clicked', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(<TemplatesPage />)
    })

    const templateCard = screen.getByText('Personal Task Tracker').closest('div')
    await user.click(templateCard)

    await waitFor(() => {
      expect(screen.getByTestId('create-board-modal')).toBeInTheDocument()
      expect(screen.getByText('Template: Personal Task Tracker')).toBeInTheDocument()
    })
  })

  test('navigates to board when board is created', async () => {
    const user = userEvent.setup()

    await act(async () => {
      render(<TemplatesPage />)
    })

    // Open modal
    const templateCard = screen.getByText('Personal Task Tracker').closest('div')
    await user.click(templateCard)

    await waitFor(() => {
      expect(screen.getByTestId('create-board-modal')).toBeInTheDocument()
    })

    // Create board
    const modalCreateButton = screen.getByTestId('create-board-modal').querySelector('button:last-child')
    await user.click(modalCreateButton)

    expect(mockPush).toHaveBeenCalledWith('/board/test-board-id')
  })
})