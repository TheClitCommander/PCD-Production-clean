#!/bin/bash

# Replace this with your actual Railway URL
RAILWAY_URL="https://YOUR-RAILWAY-URL.railway.app"

# Test the webhook
curl -X POST "$RAILWAY_URL/api/new-lead" \
  -H "Content-Type: application/json" \
  -d '{
    "formId": "test-form",
    "submissionId": "test-123",
    "data": {
      "name": "Test Business",
      "email": "test@example.com",
      "phone": "207-555-0123",
      "appointment_date": "2024-01-20",
      "appointment_time": "2:00 PM"
    }
  }' 