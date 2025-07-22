# Pleasant Cove Design - Order & Billing Flow

## 🎯 The Complete Flow

### 1. **Lead Generation & Contact**
```
Scrape Business → Create Profile → Generate Demo → Send Outreach
```

### 2. **Customer Interest** 
```
They Reply → View Demo → Express Interest → Move to "Interested" Stage
```

### 3. **Order Building** (NEW)
```
Open Order Builder → Select Package → Add Services → Calculate Total
```

### 4. **Order to Invoice**
```
Finalize Order → Generate Invoice → Send to Client → Track Payment
```

### 5. **Project Kickoff**
```
Payment Received → Create Project → Post to Upwork → Start Work
```

---

## 🛠️ How It Works in Your UI

### **Lead Card Actions**
When you click on a lead in your admin UI, you now have:

1. **"Build Order" Button** - Opens the order builder
2. **"View Orders" Tab** - Shows order history
3. **"Create Invoice" Button** - Converts order to invoice
4. **"Track Payment" Status** - Shows payment status

### **Order Builder Interface**
```
┌─────────────────────────────────────────┐
│  Build Order - Bob's Plumbing           │
├─────────────────────────────────────────┤
│                                         │
│  📦 Packages:                           │
│  ○ Starter ($997)                      │
│  ● Growth ($2,497) ✓                   │
│  ○ Professional ($4,997)               │
│                                         │
│  ➕ Add-ons:                            │
│  [+] SEO Package         $797    [1]   │
│  [+] Logo Design         $797    [0]   │
│  [+] Extra Pages         $297    [2]   │
│                                         │
│  ✏️ Custom Items:                       │
│  [Rush Delivery]         [$500] [Add]  │
│                                         │
│  ─────────────────────────────────────  │
│  Order Total: $4,888                    │
│  [Create Order] [Send Quote]            │
└─────────────────────────────────────────┘
```

---

## 💬 Minerva Commands

### **Creating Orders**
```
You: "Start an order for Bob's Plumbing"
Minerva: "✅ Created order ORD-20250122-BOBS1234"

You: "Add Growth package"
Minerva: "✅ Added Growth Package ($2,497)"

You: "Add SEO and 2 extra pages"
Minerva: "✅ Added SEO Package ($797) and 2x Additional Pages ($594)"
         "New total: $3,888"

You: "Show the order"
Minerva: Shows formatted order summary

You: "Send it to Bob"
Minerva: "✅ Order sent to bob@plumbing.com for approval"
```

### **Converting to Invoice**
```
You: "Bob approved the order, create invoice"
Minerva: "✅ Created invoice INV-20250122-BOBS1234"
         "Total: $3,888"
         "Due: Feb 21, 2025"

You: "Send the invoice"
Minerva: "✅ Invoice sent to bob@plumbing.com"
```

### **Tracking Payment**
```
You: "Did Bob pay?"
Minerva: "Invoice INV-20250122-BOBS1234 is unpaid (3 days old)"

[Stripe webhook fires]
Minerva: "🎉 Bob's Plumbing just paid $3,888 via Stripe!"
         "Receipt sent automatically"
```

---

## 🔄 Database Flow

### **1. Company Profile** (from scraping)
```json
{
  "id": "comp_bobs_plumbing",
  "name": "Bob's Plumbing",
  "email": "bob@plumbing.com",
  "phone": "555-1234",
  "businessType": "plumbing"
}
```

### **2. Order Record** (what they're buying)
```json
{
  "id": "ORD-20250122-BOBS1234",
  "company_id": "comp_bobs_plumbing",
  "status": "approved",
  "package": "growth",
  "addons": ["seo_package", "additional_page", "additional_page"],
  "total": 3888
}
```

### **3. Invoice Record** (billing)
```json
{
  "invoice_id": "INV-20250122-BOBS1234",
  "order_id": "ORD-20250122-BOBS1234",
  "company_id": "comp_bobs_plumbing",
  "total": 3888,
  "status": "sent"
}
```

### **4. Payment Record** (money received)
```json
{
  "payment_id": "PAY-20250122143052",
  "invoice_id": "INV-20250122-BOBS1234",
  "amount": 3888,
  "method": "stripe"
}
```

### **5. Project Record** (work tracking)
```json
{
  "id": "proj_123",
  "company_id": "comp_bobs_plumbing",
  "order_id": "ORD-20250122-BOBS1234",
  "type": "website",
  "status": "in_progress",
  "upwork_job_id": "123456789"
}
```

---

## 🎨 UI Integration Points

### **1. Lead Card Enhancement**
```jsx
// In EntitySummaryCard.tsx
<div className="lead-actions">
  <button onClick={() => openOrderBuilder(company.id)}>
    Build Order
  </button>
  
  {company.currentOrder && (
    <div className="order-status">
      Order: {company.currentOrder.status}
      Total: ${company.currentOrder.total}
    </div>
  )}
  
  {company.invoice && (
    <div className="invoice-status">
      Invoice: {company.invoice.status}
      {company.invoice.status === 'paid' && '✅'}
    </div>
  )}
</div>
```

### **2. Order History Tab**
```jsx
// In company details view
<Tab label="Orders">
  {orders.map(order => (
    <OrderCard 
      order={order}
      onEdit={() => editOrder(order.id)}
      onInvoice={() => createInvoice(order.id)}
    />
  ))}
</Tab>
```

---

## 🚀 Implementation Steps

1. **Add Order Tables** to your database
2. **Install Order Manager** Python backend
3. **Add Order Builder** component to UI
4. **Connect Minerva** commands
5. **Link to Billing** engine
6. **Test End-to-End** with test company

---

## 💡 Key Benefits

1. **Clear Service Selection** - No confusion about what's being ordered
2. **Transparent Pricing** - Client sees exactly what they're paying for
3. **Order History** - Track what each client has purchased
4. **Automated Invoicing** - Order → Invoice with one click
5. **Natural Language** - Minerva handles it conversationally

This completes the loop from lead → order → invoice → payment → project! 