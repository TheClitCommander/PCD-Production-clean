// Authentication utilities for React frontend

interface User {
  id: string;
  email?: string;
  role: 'admin' | 'user';
  permissions?: string[];
}

interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  message?: string;
  error?: string;
}

// Token management
export const TokenManager = {
  // Get token from localStorage
  getToken(): string | null {
    return localStorage.getItem('pleasant_cove_token');
  },

  // Save token to localStorage
  setToken(token: string): void {
    localStorage.setItem('pleasant_cove_token', token);
  },

  // Remove token from localStorage
  removeToken(): void {
    localStorage.removeItem('pleasant_cove_token');
  },

  // Check if token exists
  hasToken(): boolean {
    return !!this.getToken();
  }
};

// User management
export const UserManager = {
  // Get user data from localStorage
  getUser(): User | null {
    const userData = localStorage.getItem('pleasant_cove_user');
    return userData ? JSON.parse(userData) : null;
  },

  // Save user data to localStorage
  setUser(user: User): void {
    localStorage.setItem('pleasant_cove_user', JSON.stringify(user));
  },

  // Remove user data from localStorage
  removeUser(): void {
    localStorage.removeItem('pleasant_cove_user');
  },

  // Check if user is admin
  isAdmin(): boolean {
    const user = this.getUser();
    return user?.role === 'admin';
  }
};

// API helper with authentication
export const AuthAPI = {
  // Development login
  async devLogin(email?: string, role: 'admin' | 'user' = 'admin'): Promise<AuthResponse> {
    try {
      const response = await fetch('http://localhost:8001/api/auth/dev-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, role })
      });

      const result = await response.json();
      
      if (result.success && result.token) {
        TokenManager.setToken(result.token);
        UserManager.setUser(result.user);
      }

      return result;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Failed to connect to authentication server'
      };
    }
  },

  // Validate current token
  async validateToken(): Promise<AuthResponse> {
    const token = TokenManager.getToken();
    if (!token) {
      return { success: false, error: 'No token found' };
    }

    try {
      const response = await fetch('http://localhost:8001/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();
      
      if (result.success && result.user) {
        UserManager.setUser(result.user);
      } else {
        // Token invalid, clear stored data
        this.logout();
      }

      return result;
    } catch (error) {
      console.error('Token validation error:', error);
      this.logout(); // Clear invalid data
      return {
        success: false,
        error: 'Token validation failed'
      };
    }
  },

  // Logout
  logout(): void {
    TokenManager.removeToken();
    UserManager.removeUser();
  },

  // Get authentication headers for API calls
  getAuthHeaders(): Record<string, string> {
    const token = TokenManager.getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }
};

// Enhanced API helper that automatically includes auth headers
export const authenticatedFetch = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const authHeaders = AuthAPI.getAuthHeaders();
  
  const mergedOptions: RequestInit = {
    ...options,
    headers: {
      ...authHeaders,
      ...options.headers,
    }
  };

  const response = await fetch(url, mergedOptions);

  // If unauthorized, try to refresh or logout
  if (response.status === 401) {
    console.warn('Unauthorized request, logging out...');
    AuthAPI.logout();
    // Optionally redirect to login page
    window.location.href = '/login';
  }

  return response;
};

// Check authentication status
export const checkAuthStatus = (): { isAuthenticated: boolean; isAdmin: boolean; user: User | null } => {
  const hasToken = TokenManager.hasToken();
  const user = UserManager.getUser();
  const isAdmin = UserManager.isAdmin();

  return {
    isAuthenticated: hasToken && !!user,
    isAdmin,
    user
  };
};

// Initialize authentication on app start
export const initializeAuth = async (): Promise<boolean> => {
  try {
    const result = await AuthAPI.validateToken();
    return result.success;
  } catch (error) {
    console.error('Auth initialization failed:', error);
    AuthAPI.logout();
    return false;
  }
}; 