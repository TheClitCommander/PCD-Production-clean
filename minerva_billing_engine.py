"""
Minerva Billing Engine - Integrated with Scraped Business Profiles
Handles invoicing, payments, and receipts for Pleasant Cove Design
"""

import os
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import requests
from dataclasses import dataclass, asdict
import sqlite3
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib.units import inch
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
import stripe
from flask import Flask, request, jsonify, send_file
import boto3

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
PLEASANT_COVE_API = os.getenv('PLEASANT_COVE_API', 'http://localhost:3000/api')
STRIPE_API_KEY = os.getenv('STRIPE_API_KEY', '')
STRIPE_WEBHOOK_SECRET = os.getenv('STRIPE_WEBHOOK_SECRET', '')
AWS_ACCESS_KEY = os.getenv('AWS_ACCESS_KEY_ID', '')
AWS_SECRET_KEY = os.getenv('AWS_SECRET_ACCESS_KEY', '')
S3_BUCKET = os.getenv('S3_BUCKET', 'pleasant-cove-receipts')
SMTP_HOST = os.getenv('SMTP_HOST', 'smtp.gmail.com')
SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
SMTP_USER = os.getenv('SMTP_USER', '')
SMTP_PASS = os.getenv('SMTP_PASS', '')

# Initialize Stripe
if STRIPE_API_KEY:
    stripe.api_key = STRIPE_API_KEY

@dataclass
class Invoice:
    invoice_id: str
    company_id: str  # Links to scraped business profile
    company_name: str
    company_email: str
    date_issued: str
    due_date: str
    line_items: List[Dict]
    subtotal: float
    tax_rate: float
    tax_amount: float
    total: float
    status: str  # draft, sent, paid, overdue
    notes: Optional[str] = None
    payment_terms: str = "Net 30"

@dataclass
class Payment:
    payment_id: str
    invoice_id: str
    amount: float
    date_received: str
    method: str  # stripe, paypal, bank_transfer, check
    transaction_id: Optional[str] = None
    notes: Optional[str] = None

@dataclass
class Receipt:
    receipt_id: str
    payment_id: str
    invoice_id: str
    date_issued: str
    pdf_url: str
    email_sent: bool = False

class BillingEngine:
    def __init__(self, db_path="billing.db"):
        self.db_path = db_path
        self.init_database()
        self.s3_client = None
        if AWS_ACCESS_KEY and AWS_SECRET_KEY:
            self.s3_client = boto3.client(
                's3',
                aws_access_key_id=AWS_ACCESS_KEY,
                aws_secret_access_key=AWS_SECRET_KEY
            )
        logger.info("💰 Billing Engine initialized")

    def init_database(self):
        """Initialize billing database tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Invoices table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS invoices (
                invoice_id TEXT PRIMARY KEY,
                company_id TEXT NOT NULL,
                company_name TEXT NOT NULL,
                company_email TEXT NOT NULL,
                date_issued TEXT NOT NULL,
                due_date TEXT NOT NULL,
                line_items TEXT NOT NULL,
                subtotal REAL NOT NULL,
                tax_rate REAL NOT NULL,
                tax_amount REAL NOT NULL,
                total REAL NOT NULL,
                status TEXT NOT NULL,
                notes TEXT,
                payment_terms TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Payments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                payment_id TEXT PRIMARY KEY,
                invoice_id TEXT NOT NULL,
                amount REAL NOT NULL,
                date_received TEXT NOT NULL,
                method TEXT NOT NULL,
                transaction_id TEXT,
                notes TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
            )
        ''')
        
        # Receipts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS receipts (
                receipt_id TEXT PRIMARY KEY,
                payment_id TEXT NOT NULL,
                invoice_id TEXT NOT NULL,
                date_issued TEXT NOT NULL,
                pdf_url TEXT NOT NULL,
                email_sent BOOLEAN DEFAULT 0,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (payment_id) REFERENCES payments(payment_id),
                FOREIGN KEY (invoice_id) REFERENCES invoices(invoice_id)
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info("✅ Billing database initialized")

    def get_company_profile(self, company_id: str) -> Optional[Dict]:
        """Fetch company profile from Pleasant Cove backend"""
        try:
            response = requests.get(f"{PLEASANT_COVE_API}/companies/{company_id}")
            if response.status_code == 200:
                return response.json()
            else:
                logger.error(f"Failed to fetch company {company_id}: {response.status_code}")
                return None
        except Exception as e:
            logger.error(f"Error fetching company profile: {e}")
            return None

    def create_invoice(self, company_id: str, service_package: str, custom_items: List[Dict] = None) -> Invoice:
        """Create invoice for a company based on their scraped profile"""
        # Fetch company profile
        company = self.get_company_profile(company_id)
        if not company:
            raise ValueError(f"Company {company_id} not found")
        
        # Generate invoice ID
        invoice_id = f"INV-{datetime.now().strftime('%Y%m%d')}-{company_id[:8]}"
        
        # Prepare line items based on package
        line_items = []
        
        # Package pricing (from your menu)
        packages = {
            "starter": {"name": "Starter Package", "price": 997},
            "growth": {"name": "Growth Package", "price": 2497},
            "professional": {"name": "Professional Package", "price": 4997}
        }
        
        if service_package in packages:
            line_items.append({
                "description": packages[service_package]["name"],
                "quantity": 1,
                "unit_price": packages[service_package]["price"],
                "total": packages[service_package]["price"]
            })
        
        # Add custom items if provided
        if custom_items:
            line_items.extend(custom_items)
        
        # Calculate totals
        subtotal = sum(item["total"] for item in line_items)
        tax_rate = 0.0  # Adjust based on location
        tax_amount = subtotal * tax_rate
        total = subtotal + tax_amount
        
        # Create invoice
        invoice = Invoice(
            invoice_id=invoice_id,
            company_id=company_id,
            company_name=company.get("name", "Unknown"),
            company_email=company.get("email", ""),
            date_issued=datetime.now().isoformat(),
            due_date=(datetime.now() + timedelta(days=30)).isoformat(),
            line_items=line_items,
            subtotal=subtotal,
            tax_rate=tax_rate,
            tax_amount=tax_amount,
            total=total,
            status="draft"
        )
        
        # Save to database
        self._save_invoice(invoice)
        
        logger.info(f"📄 Created invoice {invoice_id} for {company.get('name')} - Total: ${total}")
        return invoice

    def _save_invoice(self, invoice: Invoice):
        """Save invoice to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO invoices (
                invoice_id, company_id, company_name, company_email,
                date_issued, due_date, line_items, subtotal,
                tax_rate, tax_amount, total, status, notes, payment_terms
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            invoice.invoice_id, invoice.company_id, invoice.company_name,
            invoice.company_email, invoice.date_issued, invoice.due_date,
            json.dumps(invoice.line_items), invoice.subtotal,
            invoice.tax_rate, invoice.tax_amount, invoice.total,
            invoice.status, invoice.notes, invoice.payment_terms
        ))
        
        conn.commit()
        conn.close()

    def generate_invoice_pdf(self, invoice_id: str) -> str:
        """Generate PDF for invoice"""
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            raise ValueError(f"Invoice {invoice_id} not found")
        
        # Create PDF
        pdf_path = f"/tmp/{invoice_id}.pdf"
        c = canvas.Canvas(pdf_path, pagesize=letter)
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 24)
        c.drawString(1*inch, height - 1*inch, "INVOICE")
        
        # Company info
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1*inch, height - 1.5*inch, "Pleasant Cove Design")
        c.setFont("Helvetica", 10)
        c.drawString(1*inch, height - 1.7*inch, "123 Main Street")
        c.drawString(1*inch, height - 1.85*inch, "Portland, ME 04101")
        c.drawString(1*inch, height - 2*inch, "(207) 555-0123")
        
        # Invoice details
        c.setFont("Helvetica", 10)
        c.drawString(5*inch, height - 1.5*inch, f"Invoice #: {invoice['invoice_id']}")
        c.drawString(5*inch, height - 1.7*inch, f"Date: {invoice['date_issued'][:10]}")
        c.drawString(5*inch, height - 1.85*inch, f"Due: {invoice['due_date'][:10]}")
        
        # Bill to
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1*inch, height - 2.5*inch, "Bill To:")
        c.setFont("Helvetica", 10)
        c.drawString(1*inch, height - 2.7*inch, invoice['company_name'])
        c.drawString(1*inch, height - 2.85*inch, invoice['company_email'])
        
        # Line items
        y_position = height - 3.5*inch
        c.setFont("Helvetica-Bold", 10)
        c.drawString(1*inch, y_position, "Description")
        c.drawString(5*inch, y_position, "Qty")
        c.drawString(6*inch, y_position, "Price")
        c.drawString(7*inch, y_position, "Total")
        
        c.line(1*inch, y_position - 5, 7.5*inch, y_position - 5)
        y_position -= 20
        
        c.setFont("Helvetica", 10)
        for item in json.loads(invoice['line_items']):
            c.drawString(1*inch, y_position, item['description'])
            c.drawString(5*inch, y_position, str(item['quantity']))
            c.drawString(6*inch, y_position, f"${item['unit_price']:,.2f}")
            c.drawString(7*inch, y_position, f"${item['total']:,.2f}")
            y_position -= 20
        
        # Totals
        c.line(6.5*inch, y_position + 5, 7.5*inch, y_position + 5)
        y_position -= 20
        
        c.drawString(6*inch, y_position, "Subtotal:")
        c.drawString(7*inch, y_position, f"${invoice['subtotal']:,.2f}")
        y_position -= 20
        
        if invoice['tax_amount'] > 0:
            c.drawString(6*inch, y_position, f"Tax ({invoice['tax_rate']*100}%):")
            c.drawString(7*inch, y_position, f"${invoice['tax_amount']:,.2f}")
            y_position -= 20
        
        c.setFont("Helvetica-Bold", 12)
        c.drawString(6*inch, y_position, "Total:")
        c.drawString(7*inch, y_position, f"${invoice['total']:,.2f}")
        
        # Payment terms
        y_position -= 40
        c.setFont("Helvetica", 10)
        c.drawString(1*inch, y_position, f"Payment Terms: {invoice['payment_terms']}")
        
        # Footer
        c.setFont("Helvetica", 8)
        c.drawString(1*inch, 1*inch, "Thank you for your business!")
        
        c.save()
        
        # Upload to S3 if configured
        if self.s3_client:
            try:
                self.s3_client.upload_file(
                    pdf_path,
                    S3_BUCKET,
                    f"invoices/{invoice_id}.pdf"
                )
                pdf_url = f"https://{S3_BUCKET}.s3.amazonaws.com/invoices/{invoice_id}.pdf"
                logger.info(f"📤 Uploaded invoice to S3: {pdf_url}")
                return pdf_url
            except Exception as e:
                logger.error(f"Failed to upload to S3: {e}")
        
        return pdf_path

    def send_invoice(self, invoice_id: str) -> bool:
        """Send invoice to client via email"""
        invoice = self.get_invoice(invoice_id)
        if not invoice:
            return False
        
        # Generate PDF
        pdf_path = self.generate_invoice_pdf(invoice_id)
        
        # Send email
        if SMTP_USER and SMTP_PASS:
            try:
                msg = MIMEMultipart()
                msg['From'] = SMTP_USER
                msg['To'] = invoice['company_email']
                msg['Subject'] = f"Invoice {invoice['invoice_id']} from Pleasant Cove Design"
                
                body = f"""
                Hi {invoice['company_name']},
                
                Please find attached your invoice for web design services.
                
                Invoice #: {invoice['invoice_id']}
                Amount Due: ${invoice['total']:,.2f}
                Due Date: {invoice['due_date'][:10]}
                
                You can pay online at: https://pleasantcovedesign.com/pay/{invoice['invoice_id']}
                
                Thank you for your business!
                
                Best regards,
                Pleasant Cove Design Team
                """
                
                msg.attach(MIMEText(body, 'plain'))
                
                # Attach PDF
                with open(pdf_path, 'rb') as f:
                    attach = MIMEApplication(f.read(), _subtype="pdf")
                    attach.add_header('Content-Disposition', 'attachment', filename=f"{invoice_id}.pdf")
                    msg.attach(attach)
                
                # Send
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
                server.quit()
                
                # Update status
                self._update_invoice_status(invoice_id, "sent")
                
                logger.info(f"📧 Sent invoice {invoice_id} to {invoice['company_email']}")
                return True
                
            except Exception as e:
                logger.error(f"Failed to send invoice email: {e}")
                return False
        
        return False

    def record_payment(self, invoice_id: str, amount: float, method: str, 
                      transaction_id: str = None, notes: str = None) -> Payment:
        """Record a payment against an invoice"""
        # Generate payment ID
        payment_id = f"PAY-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        payment = Payment(
            payment_id=payment_id,
            invoice_id=invoice_id,
            amount=amount,
            date_received=datetime.now().isoformat(),
            method=method,
            transaction_id=transaction_id,
            notes=notes
        )
        
        # Save to database
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO payments (
                payment_id, invoice_id, amount, date_received,
                method, transaction_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ''', (
            payment.payment_id, payment.invoice_id, payment.amount,
            payment.date_received, payment.method, payment.transaction_id,
            payment.notes
        ))
        
        conn.commit()
        conn.close()
        
        # Check if invoice is fully paid
        invoice = self.get_invoice(invoice_id)
        if invoice:
            total_paid = self.get_total_paid(invoice_id)
            if total_paid >= invoice['total']:
                self._update_invoice_status(invoice_id, "paid")
                # Generate receipt
                self.generate_receipt(payment_id)
        
        logger.info(f"💵 Recorded payment {payment_id} for invoice {invoice_id} - ${amount}")
        return payment

    def generate_receipt(self, payment_id: str) -> Receipt:
        """Generate receipt for a payment"""
        payment = self.get_payment(payment_id)
        if not payment:
            raise ValueError(f"Payment {payment_id} not found")
        
        invoice = self.get_invoice(payment['invoice_id'])
        if not invoice:
            raise ValueError(f"Invoice {payment['invoice_id']} not found")
        
        # Generate receipt ID
        receipt_id = f"REC-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        
        # Create PDF
        pdf_path = f"/tmp/{receipt_id}.pdf"
        c = canvas.Canvas(pdf_path, pagesize=letter)
        width, height = letter
        
        # Header
        c.setFont("Helvetica-Bold", 24)
        c.drawString(1*inch, height - 1*inch, "RECEIPT")
        
        # Company info
        c.setFont("Helvetica-Bold", 14)
        c.drawString(1*inch, height - 1.5*inch, "Pleasant Cove Design")
        c.setFont("Helvetica", 10)
        c.drawString(1*inch, height - 1.7*inch, "123 Main Street")
        c.drawString(1*inch, height - 1.85*inch, "Portland, ME 04101")
        c.drawString(1*inch, height - 2*inch, "(207) 555-0123")
        
        # Receipt details
        c.drawString(5*inch, height - 1.5*inch, f"Receipt #: {receipt_id}")
        c.drawString(5*inch, height - 1.7*inch, f"Date: {datetime.now().strftime('%Y-%m-%d')}")
        c.drawString(5*inch, height - 1.85*inch, f"Invoice #: {payment['invoice_id']}")
        
        # Payment details
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1*inch, height - 2.5*inch, "Payment Received From:")
        c.setFont("Helvetica", 10)
        c.drawString(1*inch, height - 2.7*inch, invoice['company_name'])
        
        # Payment info
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1*inch, height - 3.5*inch, "Payment Details:")
        c.setFont("Helvetica", 10)
        c.drawString(1*inch, height - 3.7*inch, f"Amount: ${payment['amount']:,.2f}")
        c.drawString(1*inch, height - 3.85*inch, f"Method: {payment['method']}")
        c.drawString(1*inch, height - 4*inch, f"Date: {payment['date_received'][:10]}")
        
        if payment['transaction_id']:
            c.drawString(1*inch, height - 4.15*inch, f"Transaction ID: {payment['transaction_id']}")
        
        # Footer
        c.setFont("Helvetica-Bold", 12)
        c.drawString(1*inch, height - 5*inch, "Thank you for your payment!")
        
        c.save()
        
        # Upload to S3
        pdf_url = pdf_path
        if self.s3_client:
            try:
                self.s3_client.upload_file(
                    pdf_path,
                    S3_BUCKET,
                    f"receipts/{receipt_id}.pdf"
                )
                pdf_url = f"https://{S3_BUCKET}.s3.amazonaws.com/receipts/{receipt_id}.pdf"
                logger.info(f"📤 Uploaded receipt to S3: {pdf_url}")
            except Exception as e:
                logger.error(f"Failed to upload receipt to S3: {e}")
        
        # Save receipt record
        receipt = Receipt(
            receipt_id=receipt_id,
            payment_id=payment_id,
            invoice_id=payment['invoice_id'],
            date_issued=datetime.now().isoformat(),
            pdf_url=pdf_url
        )
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO receipts (
                receipt_id, payment_id, invoice_id, date_issued, pdf_url
            ) VALUES (?, ?, ?, ?, ?)
        ''', (
            receipt.receipt_id, receipt.payment_id, receipt.invoice_id,
            receipt.date_issued, receipt.pdf_url
        ))
        
        conn.commit()
        conn.close()
        
        # Send receipt email
        self.send_receipt(receipt_id)
        
        logger.info(f"🧾 Generated receipt {receipt_id} for payment {payment_id}")
        return receipt

    def send_receipt(self, receipt_id: str) -> bool:
        """Send receipt to client via email"""
        receipt = self.get_receipt(receipt_id)
        if not receipt:
            return False
        
        payment = self.get_payment(receipt['payment_id'])
        invoice = self.get_invoice(receipt['invoice_id'])
        
        if not payment or not invoice:
            return False
        
        if SMTP_USER and SMTP_PASS:
            try:
                msg = MIMEMultipart()
                msg['From'] = SMTP_USER
                msg['To'] = invoice['company_email']
                msg['Subject'] = f"Payment Receipt - Pleasant Cove Design"
                
                body = f"""
                Hi {invoice['company_name']},
                
                Thank you for your payment!
                
                Receipt #: {receipt['receipt_id']}
                Amount Paid: ${payment['amount']:,.2f}
                Invoice #: {invoice['invoice_id']}
                
                Your receipt is attached for your records.
                
                Best regards,
                Pleasant Cove Design Team
                """
                
                msg.attach(MIMEText(body, 'plain'))
                
                # TODO: Attach PDF from S3 or local path
                
                server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.send_message(msg)
                server.quit()
                
                # Mark as sent
                conn = sqlite3.connect(self.db_path)
                cursor = conn.cursor()
                cursor.execute(
                    "UPDATE receipts SET email_sent = 1 WHERE receipt_id = ?",
                    (receipt_id,)
                )
                conn.commit()
                conn.close()
                
                logger.info(f"📧 Sent receipt {receipt_id} to {invoice['company_email']}")
                return True
                
            except Exception as e:
                logger.error(f"Failed to send receipt email: {e}")
                return False
        
        return False

    def get_invoice(self, invoice_id: str) -> Optional[Dict]:
        """Get invoice by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM invoices WHERE invoice_id = ?", (invoice_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None

    def get_payment(self, payment_id: str) -> Optional[Dict]:
        """Get payment by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM payments WHERE payment_id = ?", (payment_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None

    def get_receipt(self, receipt_id: str) -> Optional[Dict]:
        """Get receipt by ID"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("SELECT * FROM receipts WHERE receipt_id = ?", (receipt_id,))
        row = cursor.fetchone()
        conn.close()
        
        return dict(row) if row else None

    def get_total_paid(self, invoice_id: str) -> float:
        """Get total amount paid for an invoice"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT SUM(amount) FROM payments WHERE invoice_id = ?",
            (invoice_id,)
        )
        result = cursor.fetchone()[0]
        conn.close()
        
        return result or 0.0

    def _update_invoice_status(self, invoice_id: str, status: str):
        """Update invoice status"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute(
            "UPDATE invoices SET status = ? WHERE invoice_id = ?",
            (status, invoice_id)
        )
        conn.commit()
        conn.close()

    def get_outstanding_invoices(self) -> List[Dict]:
        """Get all unpaid invoices"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT i.*, 
                   COALESCE(SUM(p.amount), 0) as total_paid,
                   i.total - COALESCE(SUM(p.amount), 0) as balance_due
            FROM invoices i
            LEFT JOIN payments p ON i.invoice_id = p.invoice_id
            WHERE i.status != 'paid'
            GROUP BY i.invoice_id
            HAVING balance_due > 0
        """)
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]

    def get_company_invoices(self, company_id: str) -> List[Dict]:
        """Get all invoices for a specific company"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT i.*, 
                   COALESCE(SUM(p.amount), 0) as total_paid,
                   i.total - COALESCE(SUM(p.amount), 0) as balance_due
            FROM invoices i
            LEFT JOIN payments p ON i.invoice_id = p.invoice_id
            WHERE i.company_id = ?
            GROUP BY i.invoice_id
            ORDER BY i.date_issued DESC
        """, (company_id,))
        
        rows = cursor.fetchall()
        conn.close()
        
        return [dict(row) for row in rows]

    def handle_stripe_webhook(self, payload: Dict, signature: str) -> bool:
        """Handle Stripe webhook for automatic payment recording"""
        if not STRIPE_WEBHOOK_SECRET:
            logger.warning("Stripe webhook secret not configured")
            return False
        
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, STRIPE_WEBHOOK_SECRET
            )
            
            if event['type'] == 'payment_intent.succeeded':
                payment_intent = event['data']['object']
                
                # Extract invoice ID from metadata
                invoice_id = payment_intent.get('metadata', {}).get('invoice_id')
                if invoice_id:
                    self.record_payment(
                        invoice_id=invoice_id,
                        amount=payment_intent['amount'] / 100,  # Convert cents to dollars
                        method='stripe',
                        transaction_id=payment_intent['id']
                    )
                    logger.info(f"✅ Recorded Stripe payment for invoice {invoice_id}")
                    return True
            
        except Exception as e:
            logger.error(f"Stripe webhook error: {e}")
            return False
        
        return False

# Flask API for billing service
app = Flask(__name__)
billing_engine = BillingEngine()

@app.route('/api/invoices', methods=['POST'])
def create_invoice():
    """Create a new invoice"""
    data = request.json
    try:
        invoice = billing_engine.create_invoice(
            company_id=data['company_id'],
            service_package=data.get('service_package'),
            custom_items=data.get('custom_items', [])
        )
        return jsonify(asdict(invoice)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/invoices/<invoice_id>', methods=['GET'])
def get_invoice(invoice_id):
    """Get invoice details"""
    invoice = billing_engine.get_invoice(invoice_id)
    if invoice:
        return jsonify(invoice)
    return jsonify({'error': 'Invoice not found'}), 404

@app.route('/api/invoices/<invoice_id>/send', methods=['POST'])
def send_invoice(invoice_id):
    """Send invoice to client"""
    if billing_engine.send_invoice(invoice_id):
        return jsonify({'message': 'Invoice sent successfully'})
    return jsonify({'error': 'Failed to send invoice'}), 500

@app.route('/api/payments', methods=['POST'])
def record_payment():
    """Record a payment"""
    data = request.json
    try:
        payment = billing_engine.record_payment(
            invoice_id=data['invoice_id'],
            amount=data['amount'],
            method=data['method'],
            transaction_id=data.get('transaction_id'),
            notes=data.get('notes')
        )
        return jsonify(asdict(payment)), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/companies/<company_id>/invoices', methods=['GET'])
def get_company_invoices(company_id):
    """Get all invoices for a company"""
    invoices = billing_engine.get_company_invoices(company_id)
    return jsonify(invoices)

@app.route('/api/invoices/outstanding', methods=['GET'])
def get_outstanding_invoices():
    """Get all outstanding invoices"""
    invoices = billing_engine.get_outstanding_invoices()
    return jsonify(invoices)

@app.route('/api/stripe/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhooks"""
    payload = request.get_data(as_text=True)
    sig_header = request.headers.get('Stripe-Signature')
    
    if billing_engine.handle_stripe_webhook(payload, sig_header):
        return '', 200
    return '', 400

if __name__ == "__main__":
    logger.info("🚀 Starting Billing Engine API on port 8007")
    logger.info("📊 Dashboard: http://localhost:8007")
    app.run(host='0.0.0.0', port=8007, debug=True) 