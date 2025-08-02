import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './Layout'
import ErrorBoundary from './components/ErrorBoundary'

// Import all the restored components for the full dashboard
import Dashboard from './pages/Dashboard'
import Inbox from './pages/Inbox'
import Leads from './pages/Leads'
import Proposals from './pages/Proposals'
import Clients from './pages/Clients'
import Outreach from './pages/Outreach'
import Team from './pages/Team'
import DemoGallery from './pages/DemoGallery'
import ClientPortal from './pages/ClientPortal'
import Interactions from './pages/Interactions'
import Progress from './pages/Progress'
import Schedule from './pages/Schedule'
import Settings from './pages/Settings'
import ClientProfile from './pages/ClientProfile'
import BookAppointment from './pages/BookAppointment'
import AIChat from './components/AIChat'



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
            <Route path="proposals" element={<Proposals />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientProfile />} />
            <Route path="outreach" element={<Outreach />} />
            <Route path="demos" element={<DemoGallery />} />
            <Route path="team" element={<Team />} />
            <Route path="interactions" element={<Interactions />} />
            <Route path="progress" element={<Progress />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="book-appointment" element={<BookAppointment />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Client Portal - Accessible without main layout */}
          <Route path="/client/:projectToken" element={<ClientPortal />} />
          
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