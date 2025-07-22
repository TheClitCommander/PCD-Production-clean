const axios = require('axios');

// Test Zoom integration
async function testZoomConnection() {
  console.log('🔍 Testing Zoom integration...\n');
  
  try {
    // Test creating a meeting
    const response = await axios.post('http://localhost:3000/api/book-appointment', {
      appointmentDate: '2024-01-20',
      appointmentTime: '14:00',
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
      phone: '555-123-4567',
      services: 'Website Consultation',
      projectDescription: 'Test meeting creation',
      meetingType: 'zoom'
    });

    if (response.data && response.data.success) {
      console.log('✅ Zoom meeting created successfully!');
      console.log('Meeting details:', {
        meetingLink: response.data.meetingLink,
        meetingId: response.data.meetingId,
        meetingPassword: response.data.meetingPassword
      });
    } else {
      console.log('❌ Failed to create meeting:', response.data);
    }
  } catch (error) {
    console.error('❌ Error testing Zoom:', error.response?.data || error.message);
  }
}

// Run the test
testZoomConnection();
