import { render, screen } from '@testing-library/react'
import NotificationContainer from '@/components/NotificationContainer'

describe('NotificationContainer Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders empty container when no notifications provided', () => {
    const { container } = render(<NotificationContainer notifications={[]} />)
    
    // Check that container is rendered
    const notificationContainer = container.firstChild
    expect(notificationContainer).toBeInTheDocument()
    expect(notificationContainer).toHaveClass('fixed', 'top-4', 'right-4', 'z-50', 'space-y-2')
    
    // Check that no notifications are rendered
    expect(screen.queryByText(/notification/i)).not.toBeInTheDocument()
  })

  test('renders single success notification', () => {
    const notifications = [
      {
        id: '1',
        type: 'success',
        message: 'Operation completed successfully!'
      }
    ]

    render(<NotificationContainer notifications={notifications} />)
    
    // Check that notification is rendered
    expect(screen.getByText('Operation completed successfully!')).toBeInTheDocument()
    
    // Check success icon
    expect(screen.getByText('✓')).toBeInTheDocument()
  })

  test('renders single error notification', () => {
    const notifications = [
      {
        id: '1',
        type: 'error',
        message: 'Something went wrong!'
      }
    ]

    render(<NotificationContainer notifications={notifications} />)
    
    // Check that notification is rendered
    expect(screen.getByText('Something went wrong!')).toBeInTheDocument()
    
    // Check error icon
    expect(screen.getByText('✕')).toBeInTheDocument()
  })

  test('renders multiple notifications', () => {
    const notifications = [
      {
        id: '1',
        type: 'success',
        message: 'First notification'
      },
      {
        id: '2',
        type: 'error',
        message: 'Second notification'
      },
      {
        id: '3',
        type: 'info',
        message: 'Third notification'
      }
    ]

    render(<NotificationContainer notifications={notifications} />)
    
    // Check that all notifications are rendered
    expect(screen.getByText('First notification')).toBeInTheDocument()
    expect(screen.getByText('Second notification')).toBeInTheDocument()
    expect(screen.getByText('Third notification')).toBeInTheDocument()
    
    // Check that all icons are rendered
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('✕')).toBeInTheDocument()
    expect(screen.getByText('ℹ')).toBeInTheDocument()
  })

  test('applies correct CSS classes for different notification types', () => {
    const notifications = [
      {
        id: '1',
        type: 'success',
        message: 'Success message'
      },
      {
        id: '2',
        type: 'error',
        message: 'Error message'
      },
      {
        id: '3',
        type: 'info',
        message: 'Info message'
      }
    ]

    const { container } = render(<NotificationContainer notifications={notifications} />)
    
    // Check success notification classes
    const successNotification = container.querySelector('.bg-green-50')
    expect(successNotification).toBeInTheDocument()
    expect(successNotification).toHaveClass('border-green-400', 'text-green-800')
    
    // Check error notification classes
    const errorNotification = container.querySelector('.bg-red-50')
    expect(errorNotification).toBeInTheDocument()
    expect(errorNotification).toHaveClass('border-red-400', 'text-red-800')
    
    // Check info notification classes
    const infoNotification = container.querySelector('.bg-blue-50')
    expect(infoNotification).toBeInTheDocument()
    expect(infoNotification).toHaveClass('border-blue-400', 'text-blue-800')
  })
})