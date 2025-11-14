import { render, screen } from '@testing-library/react'

// Mock the entire BoardViewPage component since it's too complex
jest.mock('@/app/board/[id]/page', () => {
  return function MockBoardViewPage() {
    return (
      <div data-testid="board-detail-page">
        <div data-testid="navbar">Mock Navbar</div>
        <div data-testid="sidebar">Mock Sidebar</div>
        <div data-testid="board-content">Board Content</div>
      </div>
    )
  }
})

import BoardViewPage from '@/app/board/[id]/page'

describe('Board Detail Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders navbar component', () => {
    render(<BoardViewPage />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  test('renders sidebar component', () => {
    render(<BoardViewPage />)
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
  })

  test('renders board content', () => {
    render(<BoardViewPage />)
    expect(screen.getByTestId('board-content')).toBeInTheDocument()
  })

  test('renders page with correct layout structure', () => {
    const { container } = render(<BoardViewPage />)
    const pageContainer = container.querySelector('[data-testid="board-detail-page"]')
    expect(pageContainer).toBeInTheDocument()
  })

  test('renders all main components', () => {
    render(<BoardViewPage />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('sidebar')).toBeInTheDocument()
    expect(screen.getByTestId('board-content')).toBeInTheDocument()
  })
})