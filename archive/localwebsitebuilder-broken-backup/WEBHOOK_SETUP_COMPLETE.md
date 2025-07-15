# ✅ Webhook Setup Complete!

## Your Webhook URLs (Ready to Copy/Paste)

### Squarespace Forms Webhook:
```
https://pleasantcovedesign-production.up.railway.app/api/new-lead
```

### Acuity Scheduling Webhook:
```
https://pleasantcovedesign-production.up.railway.app/api/appointment-webhook
```

## What We Fixed

1. ✅ **Server Binding**: Updated server to listen on `0.0.0.0` instead of localhost
2. ✅ **Authentication**: Webhook routes are public (no auth required)
3. ✅ **Source Tracking**: Leads are tagged by source (Acuity, Squarespace, etc.)
4. ✅ **Duplicate Prevention**: Smart matching by email, phone, and name

## Test Your Webhooks

### Test Squarespace Webhook:
```bash
curl -X POST https://pleasantcovedesign-production.up.railway.app/api/new-lead \
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
```

### Test Acuity Webhook:
```bash
curl -X POST https://pleasantcovedesign-production.up.railway.app/api/appointment-webhook \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com",
    "phone": "207-555-0199",
    "appointmentType": "Website Consultation",
    "datetime": "2024-01-25T14:00:00Z",
    "appointmentID": 12345
  }'
```

## Setting Up in Squarespace

1. Go to your Squarespace form
2. Click **Storage & Email** → **Use External Service**
3. Enter webhook URL: `https://pleasantcovedesign-production.up.railway.app/api/new-lead`
4. Method: **POST**
5. Content Type: **JSON**

## Setting Up in Acuity

1. Go to **Integrations** → **API & Webhooks**
2. Add webhook URL: `https://pleasantcovedesign-production.up.railway.app/api/appointment-webhook`
3. Select events: **appointment.scheduled**, **appointment.rescheduled**, **appointment.canceled**

## Monitoring

- Railway deployment will auto-update in ~2-3 minutes
- Check your admin dashboard at: https://pleasantcovedesign-production.up.railway.app/?token=pleasantcove2024admin
- New leads will appear in the Pipeline view with source badges 