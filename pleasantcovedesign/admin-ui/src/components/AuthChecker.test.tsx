import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import AuthChecker from './AuthChecker'
import * as authUtils from '../utils/auth'

// Mock the auth utilities
vi.mock('../utils/auth', () => ({
  AuthAPI: {
    devLogin: vi.fn(),
    validateToken: vi.fn(),
  },
  checkAuthStatus: vi.fn(),
  UserManager: {
    getUser: vi.fn(),
  },
}))

describe('AuthChecker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset localStorage
    localStorage.clear()
  })

  it('should render children when authenticated', async () => {
    // Mock successful auth check
    vi.mocked(authUtils.checkAuthStatus).mockReturnValue({
      isAuthenticated: true,
      isAdmin: true,
      user: {
        id: '123',
        email: 'test@example.com',
        role: 'admin',
      }
    })

    render(
      <AuthChecker>
        <div>Protected Content</div>
      </AuthChecker>
    )

    // Should show loading initially
    expect(screen.getByText('Checking authentication...')).toBeInTheDocument()

    // Wait for auth check and should show content
    await waitFor(() => {
      expect(screen.getByText('Protected Content')).toBeInTheDocument()
    })

    // Should show user info
    expect(screen.getByText(/Authenticated as: test@example\.com/)).toBeInTheDocument()
  })

  it('should show error message on authentication failure', async () => {
    // Mock failed auth check
    vi.mocked(authUtils.checkAuthStatus).mockReturnValue({
      isAuthenticated: false,
      isAdmin: false,
      user: null
    })

    render(
      <AuthChecker>
        <div>Protected Content</div>
      </AuthChecker>
    )

    // Wait for auth check
    await waitFor(() => {
      expect(screen.getByText(/Authentication required/)).toBeInTheDocument()
      expect(screen.getByText(/Please refresh the page to try again/)).toBeInTheDocument()
    })

    // Protected content should not be visible
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })

  it('should handle auth check errors gracefully', async () => {
    // Mock auth check to throw error
    vi.mocked(authUtils.checkAuthStatus).mockImplementation(() => {
      throw new Error('Network error')
    })

    render(
      <AuthChecker>
        <div>Protected Content</div>
      </AuthChecker>
    )

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(/Authentication required/)).toBeInTheDocument()
    })

    // Protected content should not be visible
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument()
  })
}) 