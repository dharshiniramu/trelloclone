import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HowToUse from '@/app/how-to-use/page'

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

describe('How to Use Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders page header correctly', () => {
    render(<HowToUse />)
    
    // Check main title
    expect(screen.getByText('How to Use TrelloClone')).toBeInTheDocument()
    
    // Check back link
    expect(screen.getByText('Back to Home')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to home/i })).toHaveAttribute('href', '/')
  })

  test('renders all sections with correct titles', () => {
    render(<HowToUse />)
    
    // Check all section titles are present
    expect(screen.getByText('Getting Started')).toBeInTheDocument()
    expect(screen.getByText('Navigation & Interface')).toBeInTheDocument()
    expect(screen.getByText('Managing Workspaces')).toBeInTheDocument()
    expect(screen.getByText('Working with Boards')).toBeInTheDocument()
    expect(screen.getByText('Lists & Cards')).toBeInTheDocument()
    expect(screen.getByText('Team Collaboration')).toBeInTheDocument()
    expect(screen.getByText('Using Templates')).toBeInTheDocument()
    expect(screen.getByText('Tips & Best Practices')).toBeInTheDocument()
  })

  test('sections are collapsed by default', () => {
    render(<HowToUse />)
    
    // Check that content is not visible initially
    expect(screen.queryByText(/Create an account/)).not.toBeInTheDocument()
    expect(screen.queryByText(/The main navigation/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Workspaces are/)).not.toBeInTheDocument()
  })

  test('expands and collapses sections when clicked', async () => {
    const user = userEvent.setup()
    render(<HowToUse />)
    
    // Click on Getting Started section
    const gettingStartedButton = screen.getByText('Getting Started')
    await user.click(gettingStartedButton)
    
    // Check that content is now visible
    await waitFor(() => {
      expect(screen.getByText(/Create an account/)).toBeInTheDocument()
    })
    
    // Click again to collapse
    await user.click(gettingStartedButton)
    
    // Check that content is hidden again
    await waitFor(() => {
      expect(screen.queryByText(/Create an account/)).not.toBeInTheDocument()
    })
  })

  test('renders page with correct layout structure', () => {
    const { container } = render(<HowToUse />)
    
    // Check main container structure
    const mainContainer = container.querySelector('.min-h-screen')
    expect(mainContainer).toBeInTheDocument()
    
    // Check content container
    const contentContainer = container.querySelector('.max-w-4xl')
    expect(contentContainer).toBeInTheDocument()
    
    // Check that sections are rendered (they don't have data-testid, so check for buttons)
    const sectionButtons = container.querySelectorAll('button')
    expect(sectionButtons.length).toBeGreaterThan(0)
  })
})