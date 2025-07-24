// Test setup for Jest
import { jest, beforeAll, afterAll, beforeEach } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.ADMIN_TOKEN = 'test-admin-token';
process.env.API_KEY = 'test-api-key';

// Global test setup
beforeAll(() => {
  // Suppress console logs during tests unless debugging
  if (!process.env.DEBUG_TESTS) {
    global.console.log = jest.fn();
    global.console.error = jest.fn();
    global.console.warn = jest.fn();
  }
});

// Clean up after tests
afterAll(() => {
  // Restore console functions
  jest.restoreAllMocks();
});

// Reset mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
}); 