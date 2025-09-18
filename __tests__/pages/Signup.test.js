import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Signup from '@/app/signup/page'
import { supabase } from '@/lib/supabaseClient'

// Mock the router
const mockPush = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Signup Page', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders signup form with all required fields', () => {
    render(<Signup />)
    
    expect(screen.getByRole('heading', { name: 'Sign Up' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Username')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Email')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Password')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sign Up' })).toBeInTheDocument()
  })

  test('handles form input changes', async () => {
    const user = userEvent.setup()
    render(<Signup />)
    
    const usernameInput = screen.getByPlaceholderText('Username')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    
    await user.type(usernameInput, 'testuser')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    
    expect(usernameInput.value).toBe('testuser')
    expect(emailInput.value).toBe('test@example.com')
    expect(passwordInput.value).toBe('password123')
  })

  test('shows loading state during signup', async () => {
    const user = userEvent.setup()
    
    // Mock a delayed response
    supabase.auth.signUp.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ data: { user: null }, error: null }), 100))
    )
    
    render(<Signup />)
    
    const usernameInput = screen.getByPlaceholderText('Username')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign Up' })
    
    await user.type(usernameInput, 'testuser')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    expect(screen.getByText('Signing up...')).toBeInTheDocument()
  })

  test('handles successful signup', async () => {
    const user = userEvent.setup()
    
    const mockUser = { id: 'test-user-id', email: 'test@example.com' }
    
    supabase.auth.signUp.mockResolvedValue({
      data: { user: mockUser },
      error: null
    })
    
    supabase.from.mockReturnValue({
      insert: jest.fn().mockResolvedValue({
        data: null,
        error: null
      })
    })
    
    render(<Signup />)
    
    const usernameInput = screen.getByPlaceholderText('Username')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign Up' })
    
    await user.type(usernameInput, 'testuser')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123'
      })
    })
    
    await waitFor(() => {
      expect(supabase.from).toHaveBeenCalledWith('profiles')
    })
    
    await waitFor(() => {
      expect(screen.getByText('Signup successful! Redirecting...')).toBeInTheDocument()
    })
  })

  test('displays error message on signup failure', async () => {
    const user = userEvent.setup()
    
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' }
    })
    
    render(<Signup />)
    
    const usernameInput = screen.getByPlaceholderText('Username')
    const emailInput = screen.getByPlaceholderText('Email')
    const passwordInput = screen.getByPlaceholderText('Password')
    const submitButton = screen.getByRole('button', { name: 'Sign Up' })
    
    await user.type(usernameInput, 'testuser')
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument()
    })
  })
})
