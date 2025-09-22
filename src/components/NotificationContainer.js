export default function NotificationContainer({ notifications }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`max-w-sm p-4 rounded-lg shadow-lg border-l-4 transform transition-all duration-300 ease-in-out ${
            notification.type === 'success'
              ? 'bg-green-50 border-green-400 text-green-800'
              : notification.type === 'error'
              ? 'bg-red-50 border-red-400 text-red-800'
              : 'bg-blue-50 border-blue-400 text-blue-800'
          }`}
        >
          <div className="flex items-start">
            <div className="flex-shrink-0">
              {notification.type === 'success' && (
                <div className="w-5 h-5 text-green-400">✓</div>
              )}
              {notification.type === 'error' && (
                <div className="w-5 h-5 text-red-400">✕</div>
              )}
              {notification.type === 'info' && (
                <div className="w-5 h-5 text-blue-400">ℹ</div>
              )}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium">{notification.message}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

