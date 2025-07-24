import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout'

// Import all the restored components for the full dashboard
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import Leads from './pages/Leads'
import Interactions from './pages/Interactions'
import Progress from './pages/Progress'
import Schedule from './pages/Schedule'
import Settings from './pages/Settings'
import ClientProfile from './pages/ClientProfile'
import BookAppointment from './pages/BookAppointment'
import AIChat from './components/AIChat'

// Error boundary component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">Please refresh the page or contact support if the problem persists.</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
            >
              Refresh Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isChatMinimized, setIsChatMinimized] = React.useState(false);

  const handleToggleChat = () => {
    if (isChatOpen) {
      setIsChatMinimized(!isChatMinimized);
    } else {
      setIsChatOpen(true);
      setIsChatMinimized(false);
    }
  };

  const handleCloseChat = () => {
    setIsChatOpen(false);
    setIsChatMinimized(false);
  };

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* All routes wrapped in Layout for full dashboard */}
          <Route path="/" element={<Layout />}>
            {/* Default redirect to Dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* LOCKED IN - Single source of truth messaging system */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="business/1/inbox" element={<Inbox />} />
            <Route path="inbox" element={<Inbox />} />
            <Route path="inbox/:projectToken" element={<Inbox />} />
            <Route path="leads" element={<Leads />} />
            <Route path="leads/:id" element={<ClientProfile />} />
            <Route path="clients/:id" element={<ClientProfile />} />
            <Route path="interactions" element={<Interactions />} />
            <Route path="progress" element={<Progress />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="book-appointment" element={<BookAppointment />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        
        {/* AI Chat Component */}
        {!isChatOpen && (
          <div className="fixed bottom-4 right-4 z-50">
            <button
              onClick={handleToggleChat}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white p-4 rounded-full shadow-lg transition-all transform hover:scale-105 flex items-center gap-2"
            >
              <span className="text-2xl">🤖</span>
              <span className="text-sm font-medium hidden sm:block">AI Assistant</span>
            </button>
          </div>
        )}
        
        {isChatOpen && (
          <AIChat
            isMinimized={isChatMinimized}
            onToggleMinimize={handleToggleChat}
            onClose={handleCloseChat}
          />
        )}
      </Router>
    </ErrorBoundary>
  )
}

export default App 