import React, { useState, useEffect } from 'react'
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
import ProjectWorkspace from './pages/ProjectWorkspace'
import Schedule from './pages/Schedule'
import Settings from './pages/Settings'
import ClientProfile from './pages/ClientProfile'
import BookAppointment from './pages/BookAppointment'
import { LeadScraper } from './pages/LeadScraper'
import AIChat from './components/AIChat'
import Login from './pages/Login'
import api from './api'



const App: React.FC = () => {
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [isChatMinimized, setIsChatMinimized] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Check authentication on app load
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('admin_token');
      
      if (!token) {
        setIsAuthenticated(false);
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/validate', {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        const data = await response.json();
        
        if (data.success) {
          setIsAuthenticated(true);
        } else {
          // Token is invalid, remove it
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Network error - assume authenticated for now if token exists
        setIsAuthenticated(true);
      } finally {
        setAuthLoading(false);
      }
    };

    checkAuth();
  }, []);

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

  // Show loading spinner while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Router>
      </ErrorBoundary>
    );
  }

  // Show main app if authenticated
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
            <Route path="scraper" element={<LeadScraper />} />
            <Route path="proposals" element={<Proposals />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientProfile />} />
            <Route path="outreach" element={<Outreach />} />
            <Route path="demos" element={<DemoGallery />} />
            <Route path="team" element={<Team />} />
            <Route path="interactions" element={<Interactions />} />
            <Route path="workspace" element={<ProjectWorkspace />} />
            <Route path="workspace/:projectToken" element={<ProjectWorkspace />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="book-appointment" element={<BookAppointment />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Client Portal - Accessible without main layout */}
          <Route path="/client/project/:projectToken" element={<ClientPortal />} />
          
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