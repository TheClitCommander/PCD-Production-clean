# Minerva Billing Engine - Setup Guide

## 🚀 Quick Start

### 1. Install Dependencies
```bash
pip install reportlab stripe boto3 flask
```

### 2. Set Environment Variables
```bash
# Pleasant Cove API (your existing backend)
export PLEASANT_COVE_API=http://localhost:3000/api

# Stripe (optional - for automatic payments)
export STRIPE_API_KEY=sk_test_...
export STRIPE_WEBHOOK_SECRET=whsec_...

# AWS S3 (optional - for cloud PDF storage)
export AWS_ACCESS_KEY_ID=...
export AWS_SECRET_ACCESS_KEY=...
export S3_BUCKET=pleasant-cove-receipts

# Email (for sending invoices/receipts)
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USER=your-email@gmail.com
export SMTP_PASS=your-app-password
```

### 3. Start the Billing API
```bash
python minerva_billing_engine.py
# Runs on http://localhost:8007
```

### 4. Test with Minerva Commands
```python
from minerva_billing_commands import MinervaBillingAssistant

assistant = MinervaBillingAssistant()

# Create an invoice
result = assistant.process_command("Create invoice for Bob's Plumbing for Growth package")
print(result)
# ✅ Created invoice INV-20250122-12345678 for Bob's Plumbing
# Total: $2,497.00
# Due: 2025-02-21

# Send it
result = assistant.process_command("Send invoice to Bob's Plumbing")
print(result)
# ✅ Sent invoice INV-20250122-12345678 to Bob's Plumbing (bob@plumbing.com)

# Record payment
result = assistant.process_command("Bob's Plumbing paid")
print(result)
# ✅ Recorded $2,497.00 payment from Bob's Plumbing
# Receipt will be emailed automatically

# Check outstanding
result = assistant.process_command("Who owes money?")
print(result)
# 💰 Outstanding Invoices
# Total: $4,994.00 (2 invoices)
# 
# • Joe's Electric: $997.00
# • Sarah's Restaurant: $3,997.00 (⚠️ 5 days overdue)
```

## 🔗 Integration Points

### With Your Existing System

1. **Company Profiles** - Uses existing scraped business data
   ```python
   GET /api/companies/{company_id}
   GET /api/companies/search?q=plumbing
   ```

2. **Lead Tracking** - Can update lead status on payment
   ```python
   # When invoice paid → Update lead status to "customer"
   ```

3. **CRM Dashboard** - Add billing widget
   ```javascript
   // In your admin UI
   const billingData = await fetch('/api/companies/123/invoices');
   // Display in lead card
   ```

## 📊 Database Schema

The billing engine creates its own `billing.db` with:

- **invoices** - All invoice records linked to company_id
- **payments** - Payment records with amounts and methods
- **receipts** - Generated receipts with PDF URLs

## 🎨 Customization

### Invoice Template
Edit the PDF generation in `generate_invoice_pdf()` to:
- Add your logo
- Change colors/fonts
- Modify layout
- Add terms & conditions

### Email Templates
Modify email bodies in:
- `send_invoice()` - Invoice delivery email
- `send_receipt()` - Receipt delivery email

## 🔄 Webhooks

### Stripe Integration
1. Set up webhook endpoint in Stripe Dashboard
2. Point to: `https://yourdomain.com/api/stripe/webhook`
3. Invoice metadata must include `invoice_id`

### Example Stripe Payment Link
```javascript
// When creating Stripe payment
const paymentIntent = await stripe.paymentIntents.create({
  amount: 249700, // $2,497.00 in cents
  currency: 'usd',
  metadata: {
    invoice_id: 'INV-20250122-12345678',
    company_id: 'comp_123'
  }
});
```

## 📈 Reports & Analytics

### Monthly Revenue
```python
# Get all paid invoices for the month
SELECT SUM(total) FROM invoices 
WHERE status = 'paid' 
AND date_issued LIKE '2025-01-%'
```

### Accounts Receivable
```python
# Built-in endpoint
GET /api/invoices/outstanding
```

### Customer Lifetime Value
```python
# Per company billing history
GET /api/companies/{company_id}/invoices
```

## 🚨 Important Notes

1. **Test Mode First** - Use test Stripe keys and your own email
2. **Backup Database** - Regular backups of billing.db
3. **PDF Storage** - Local /tmp for testing, S3 for production
4. **Email Limits** - Be aware of SMTP sending limits

## 🎯 Next Steps

1. **Connect to Admin UI** - Add billing tab to lead cards
2. **Automate Invoicing** - Trigger on project completion
3. **Payment Portal** - Client self-service page
4. **Recurring Billing** - For monthly maintenance plans
5. **QuickBooks Sync** - Export for accounting

---

*Your billing is now as automated as your lead generation!* 