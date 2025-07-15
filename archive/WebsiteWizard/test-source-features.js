// Test script for source-aware features
// Run with: node test-source-features.js

const testData = {
  acuityWebhook: {
    firstName: "John",
    lastName: "Smith",
    email: "john@smithplumbing.com",
    phone: "207-555-0198",
    appointmentType: "Website Consultation",
    datetime: "2025-06-15T14:00:00Z",
    timezone: "America/New_York",
    notes: "Interested in SEO and online booking",
    appointmentID: 12345,
    calendarID: 67890
  },
  
  squarespaceWebhook: {
    formId: 'contact-form',
    submissionId: 'sq-123',
    data: {
      name: 'Maine Electric Co',
      email: 'info@maineelectric.com',
      phone: '207-555-0234',
      message: 'Need help with website redesign',
      service_type: 'electrical'
    }
  }
};

// Test Acuity webhook
console.log('Testing Acuity webhook (should create hot-lead with 1.5x score multiplier):');
fetch('http://localhost:5173/api/appointment-webhook', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testData.acuityWebhook)
})
.then(res => res.json())
.then(data => console.log('Acuity response:', data))
.catch(err => console.error('Acuity error:', err));

// Test Squarespace webhook
setTimeout(() => {
  console.log('\nTesting Squarespace webhook (should create follow-up with 1.2x score multiplier):');
  fetch('http://localhost:5173/api/new-lead', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(testData.squarespaceWebhook)
  })
  .then(res => res.json())
  .then(data => console.log('Squarespace response:', data))
  .catch(err => console.error('Squarespace error:', err));
}, 2000);

console.log('\nExpected results:');
console.log('1. Acuity lead: hot-lead tag, higher score (1.5x multiplier)');
console.log('2. Squarespace lead: follow-up tag, moderate score boost (1.2x)');
console.log('3. Both should show source badges in the UI');
console.log('4. Tags should be visible on lead cards'); 