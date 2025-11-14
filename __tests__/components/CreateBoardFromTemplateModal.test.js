import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CreateBoardFromTemplateModal from '@/components/CreateBoardFromTemplateModal'
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

describe('CreateBoardFromTemplateModal Component', () => {
  const mockTemplate = {
    id: 'template-1',
    title: 'Project Management Template',
    img: 'https://example.com/template.jpg',
    description: 'A template for project management'
  }

  const mockOnClose = jest.fn()
  const mockOnCreated = jest.fn()

  const mockUser = {
    id: 'user-1',
    email: 'test@example.com',
    username: 'testuser'
  }

  const mockWorkspaces = [
    { id: 'workspace-1', name: 'My Workspace', user_id: 'user-1' },
    { id: 'workspace-2', name: 'Team Workspace', user_id: 'user-1' }
  ]

  const mockWorkspaceMembers = [
    { id: 'member-1', email: 'member1@example.com', username: 'member1' },
    { id: 'member-2', email: 'member2@example.com', username: 'member2' }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful authentication
    supabase.auth.getUser.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })

    // Create a mock chain for supabase queries
    const createMockChain = (finalData, finalError = null) => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: finalData,
        error: finalError
      }),
      order: jest.fn().mockResolvedValue({
        data: Array.isArray(finalData) ? finalData : [finalData],
        error: finalError
      })
    })

    // Mock workspaces query - return empty array initially
    supabase.from.mockImplementation((table) => {
      if (table === 'workspaces') {
        return createMockChain([])
      }
      if (table === 'workspace_invitations') {
        return createMockChain([])
      }
      if (table === 'profiles') {
        return createMockChain([])
      }
      if (table === 'boards') {
        return createMockChain(null)
      }
      return createMockChain(null)
    })
  })

  test('renders modal with template information', async () => {
    render(
      <CreateBoardFromTemplateModal
        template={mockTemplate}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Create Board from Template')).toBeInTheDocument()
    })

    expect(screen.getByText('Project Management Template')).toBeInTheDocument()
    expect(screen.getByText('Template')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Project Management Template')).toBeInTheDocument()
  })

  test('allows editing board title', async () => {
    const user = userEvent.setup()
    render(
      <CreateBoardFromTemplateModal
        template={mockTemplate}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Project Management Template')).toBeInTheDocument()
    })

    const titleInput = screen.getByDisplayValue('Project Management Template')
    await user.clear(titleInput)
    await user.type(titleInput, 'My New Board')

    expect(titleInput.value).toBe('My New Board')
  })

  test('shows create board button as disabled when title is empty', async () => {
    const user = userEvent.setup()
    render(
      <CreateBoardFromTemplateModal
        template={mockTemplate}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Create Board')).toBeInTheDocument()
    })

    // Clear the title input to make it empty
    const titleInput = screen.getByDisplayValue('Project Management Template')
    await user.clear(titleInput)

    const createButton = screen.getByRole('button', { name: /create board/i })
    expect(createButton).toBeDisabled()
  })

  test('handles cancel button click', async () => {
    const user = userEvent.setup()
    render(
      <CreateBoardFromTemplateModal
        template={mockTemplate}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    await waitFor(() => {
      expect(screen.getByText('Cancel')).toBeInTheDocument()
    })

    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  test('successfully creates board with template data', async () => {
    const user = userEvent.setup()
    
    // Mock successful board creation
    supabase.from.mockImplementation((table) => {
      if (table === 'boards') {
        return {
          select: jest.fn().mockReturnThis(),
          insert: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'board-1',
              title: 'Test Board',
              workspace_id: null,
              background_image: mockTemplate.img,
              user_id: mockUser.id,
              members: []
            },
            error: null
          })
        }
      }
      return {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: [],
          error: null
        })
      }
    })

    render(
      <CreateBoardFromTemplateModal
        template={mockTemplate}
        onClose={mockOnClose}
        onCreated={mockOnCreated}
      />
    )

    await waitFor(() => {
      expect(screen.getByDisplayValue('Project Management Template')).toBeInTheDocument()
    })

    const titleInput = screen.getByDisplayValue('Project Management Template')
    await user.clear(titleInput)
    await user.type(titleInput, 'Test Board')

    const createButton = screen.getByRole('button', { name: /create board/i })
    await user.click(createButton)

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalledWith({
        id: 'board-1',
        title: 'Test Board',
        workspace_id: null,
        background_image: mockTemplate.img,
        user_id: mockUser.id,
        members: []
      })
    })

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })
})
