import React, { useEffect, useState } from 'react';
import { AuthAPI, checkAuthStatus } from '../utils/auth';

interface AuthCheckerProps {
  children: React.ReactNode;
}

const AuthChecker: React.FC<AuthCheckerProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const initAuth = async () => {
      const { isAuthenticated: currentAuth, user: currentUser } = checkAuthStatus();
      
      if (currentAuth) {
        // Already authenticated
        setIsAuthenticated(true);
        setUser(currentUser);
        setIsLoading(false);
      } else {
        // Try auto-login for development
        try {
          console.log('🔑 Auto-logging in for development...');
          const result = await AuthAPI.devLogin('admin@pleasantcovedesign.com', 'admin');
          
          if (result.success) {
            setIsAuthenticated(true);
            setUser(result.user);
            console.log('✅ Development login successful');
          } else {
            console.error('❌ Development login failed:', result.error);
          }
        } catch (error) {
          console.error('❌ Auto-login error:', error);
        }
        
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Pleasant Cove Design</h2>
            <p className="text-gray-600 mb-6">Authentication failed. Please try refreshing the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              Retry Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* User info bar */}
      <div className="bg-blue-600 text-white px-4 py-2 text-sm">
        <div className="flex justify-between items-center">
          <span>🔑 Authenticated as: {user?.email || user?.id} ({user?.role})</span>
          <button
            onClick={() => {
              AuthAPI.logout();
              window.location.reload();
            }}
            className="text-blue-200 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
      {children}
    </div>
  );
};

export default AuthChecker; 