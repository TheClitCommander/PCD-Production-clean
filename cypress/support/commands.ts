/// <reference types="cypress" />

// Custom Cypress commands

// Login command for testing authenticated routes
Cypress.Commands.add('login', (email = 'admin@pleasantcovedesign.com', role = 'admin') => {
  const user = { id: '1', email, role }
  const token = 'test-jwt-token-' + Date.now()
  
  // Set auth data in localStorage
  window.localStorage.setItem('pleasant_cove_token', token)
  window.localStorage.setItem('pleasant_cove_user', JSON.stringify(user))
})

// Logout command
Cypress.Commands.add('logout', () => {
  window.localStorage.removeItem('pleasant_cove_token')
  window.localStorage.removeItem('pleasant_cove_user')
})

// Command to create a test lead
Cypress.Commands.add('createTestLead', (leadData = {}) => {
  const defaultLead = {
    businessName: 'Test Business ' + Date.now(),
    phone: '2073805680',
    email: 'test@example.com',
    address: '123 Test St',
    ...leadData
  }
  
  return cy.request('POST', 'http://localhost:3000/api/companies', defaultLead)
})

// Declare custom commands for TypeScript
declare global {
  namespace Cypress {
    interface Chainable {
      login(email?: string, role?: string): Chainable<void>
      logout(): Chainable<void>
      createTestLead(leadData?: Partial<{
        businessName: string
        phone: string
        email: string
        address: string
      }>): Chainable<Response<any>>
    }
  }
}

// Required for TypeScript
export {} 