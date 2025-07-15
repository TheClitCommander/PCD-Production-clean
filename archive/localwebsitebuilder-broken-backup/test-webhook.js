const fetch = require('node-fetch');

const testWebhook = async () => {
  const payload = {
    firstName: "Samantha",
    lastName: "Blake",
    email: "samantha@visionbiz.io",
    phone: "207-555-3141",
    appointmentType: "Free 30-Min Consultation",
    datetime: "2025-06-03T14:00:00Z",
    timezone: "America/New_York",
    notes: "Interested in web design and SEO.",
    calendarID: 123456789,
    appointmentID: 987654321
  };

  try {
    const response = await fetch('http://localhost:5173/api/appointment-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response data:', data);
  } catch (error) {
    console.error('Error:', error);
  }
};

testWebhook(); 