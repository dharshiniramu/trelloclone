import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar from '@/components/Sidebar'

// Mock usePathname
const mockPathname = '/'
jest.mock('next/navigation', () => ({
  usePathname: jest.fn(() => mockPathname),
}))

describe('Sidebar Component', () => {
  test('renders sidebar with navigation items', () => {
    render(<Sidebar />)
    
    expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /boards/i })).toBeInTheDocument()
    expect(screen.getByText('Templates')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /workspace/i })).toBeInTheDocument()
  })

  test('highlights active section based on pathname', () => {
    render(<Sidebar />)
    
    const homeLink = screen.getByRole('link', { name: /home/i })
    expect(homeLink).toHaveClass('bg-blue-50', 'text-blue-700')
  })

  test('expands and collapses templates section', async () => {
    const user = userEvent.setup()
    render(<Sidebar />)
    
    const templatesButton = screen.getByText('Templates')
    await user.click(templatesButton)
    
    // Check if template categories are visible
    expect(screen.getByText('Personal')).toBeInTheDocument()
    expect(screen.getByText('Productivity')).toBeInTheDocument()
    expect(screen.getByText('Product Management')).toBeInTheDocument()
    expect(screen.getByText('Project Management')).toBeInTheDocument()
  })

  test('navigates to correct links', () => {
    render(<Sidebar />)
    
    const homeLink = screen.getByRole('link', { name: /home/i })
    const boardsLink = screen.getByRole('link', { name: /boards/i })
    const workspaceLink = screen.getByRole('link', { name: /workspace/i })
    
    expect(homeLink).toHaveAttribute('href', '/')
    expect(boardsLink).toHaveAttribute('href', '/boards')
    expect(workspaceLink).toHaveAttribute('href', '/workspace')
  })

  test('shows correct icons for each navigation item', () => {
    render(<Sidebar />)
    
    expect(screen.getByTestId('home-icon')).toBeInTheDocument()
    expect(screen.getByTestId('layout-dashboard-icon')).toBeInTheDocument()
    expect(screen.getByTestId('file-text-icon')).toBeInTheDocument()
    expect(screen.getByTestId('building2-icon')).toBeInTheDocument()
  })
})
