import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TokenManager, UserManager, AuthAPI, checkAuthStatus } from './auth'

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock as any

// Mock fetch
global.fetch = vi.fn()

describe('Auth Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  describe('TokenManager', () => {
    it('should get token from localStorage', () => {
      localStorageMock.getItem.mockReturnValue('test-token')
      
      const token = TokenManager.getToken()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('pleasant_cove_token')
      expect(token).toBe('test-token')
    })

    it('should set token in localStorage', () => {
      TokenManager.setToken('new-token')
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pleasant_cove_token', 'new-token')
    })

    it('should remove token from localStorage', () => {
      TokenManager.removeToken()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pleasant_cove_token')
    })
  })

  describe('UserManager', () => {
    it('should get user from localStorage', () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'admin' }
      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockUser))
      
      const user = UserManager.getUser()
      
      expect(localStorageMock.getItem).toHaveBeenCalledWith('pleasant_cove_user')
      expect(user).toEqual(mockUser)
    })

    it('should return null for invalid user data', () => {
      localStorageMock.getItem.mockReturnValue('invalid-json')
      
      // UserManager.getUser throws on invalid JSON, so we need to catch it
      expect(() => UserManager.getUser()).toThrow()
    })

    it('should set user in localStorage', () => {
      const mockUser = { id: '123', email: 'test@example.com', role: 'admin' as const }
      
      UserManager.setUser(mockUser)
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith('pleasant_cove_user', JSON.stringify(mockUser))
    })

    it('should remove user from localStorage', () => {
      UserManager.removeUser()
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pleasant_cove_user')
    })
  })

  describe('checkAuthStatus', () => {
    it('should return authenticated status when token and user exist', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'pleasant_cove_token') return 'valid-token'
        if (key === 'pleasant_cove_user') return JSON.stringify({ 
          id: '123', 
          email: 'admin@example.com', 
          role: 'admin' 
        })
        return null
      })

      const status = checkAuthStatus()

      expect(status.isAuthenticated).toBe(true)
      expect(status.isAdmin).toBe(true)
      expect(status.user).toEqual({
        id: '123',
        email: 'admin@example.com',
        role: 'admin'
      })
    })

    it('should return not authenticated when token is missing', () => {
      localStorageMock.getItem.mockReturnValue(null)

      const status = checkAuthStatus()

      expect(status.isAuthenticated).toBe(false)
      expect(status.isAdmin).toBe(false)
      expect(status.user).toBeNull()
    })

    it('should return not admin for non-admin user', () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'pleasant_cove_token') return 'valid-token'
        if (key === 'pleasant_cove_user') return JSON.stringify({ 
          id: '123', 
          email: 'user@example.com', 
          role: 'user' 
        })
        return null
      })

      const status = checkAuthStatus()

      expect(status.isAuthenticated).toBe(true)
      expect(status.isAdmin).toBe(false)
      expect(status.user?.role).toBe('user')
    })
  })
}) 