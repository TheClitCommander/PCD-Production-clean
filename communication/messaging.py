#!/usr/bin/env python3
"""
Unified Communication System
---------------------------
Handles all client communications via SMS (Twilio) and Email (SendGrid).
Provides a central system for sending messages, storing conversation history,
and managing client communications.
"""

import os
import csv
import json
import time
from datetime import datetime
import pandas as pd
from twilio.rest import Client
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail, Content, Email

class CommunicationSystem:
    def __init__(self, config_file=None):
        """Initialize the communication system with API credentials"""
        # Default config path
        if config_file is None:
            config_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                     "config.json")
        
        # Load config if exists, otherwise use environment variables
        self.config = {}
        if os.path.exists(config_file):
            with open(config_file, 'r') as f:
                self.config = json.load(f)
        
        # Set up Twilio (SMS)
        self.twilio_client = self._setup_twilio()
        
        # Set up SendGrid (Email)
        self.sendgrid_client = self._setup_sendgrid()
        
        # Message history database
        self.history_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                      "message_history.csv")
        self._ensure_history_file_exists()
    
    def _setup_twilio(self):
        """Set up Twilio client"""
        account_sid = self.config.get('TWILIO_ACCOUNT_SID') or os.environ.get('TWILIO_ACCOUNT_SID')
        auth_token = self.config.get('TWILIO_AUTH_TOKEN') or os.environ.get('TWILIO_AUTH_TOKEN')
        
        if account_sid and auth_token:
            return Client(account_sid, auth_token)
        else:
            print("Warning: Twilio credentials not found. SMS functionality will be simulated.")
            return None
    
    def _setup_sendgrid(self):
        """Set up SendGrid client"""
        api_key = self.config.get('SENDGRID_API_KEY') or os.environ.get('SENDGRID_API_KEY')
        
        if api_key:
            return SendGridAPIClient(api_key)
        else:
            print("Warning: SendGrid API key not found. Email functionality will be simulated.")
            return None
    
    def _ensure_history_file_exists(self):
        """Create the message history file if it doesn't exist"""
        if not os.path.exists(self.history_file):
            os.makedirs(os.path.dirname(self.history_file), exist_ok=True)
            with open(self.history_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'client_id', 'phone', 'email', 'business_name', 
                               'direction', 'channel', 'message', 'status'])
    
    def _normalize_phone(self, phone):
        """Normalize a phone number to E.164 format"""
        if not phone:
            return None
            
        # Remove any non-digit characters
        digits = ''.join(filter(str.isdigit, phone))
        
        # Format for US numbers
        if len(digits) == 10:  # US number without country code
            return f"+1{digits}"
        elif len(digits) == 11 and digits.startswith('1'):  # US with leading 1
            return f"+{digits}"
        else:
            return f"+{digits}"  # Just prepend + for other formats
    
    def send_sms(self, to_phone, message, from_phone=None, client_id=None, business_name=None):
        """Send an SMS using Twilio"""
        # Normalize phone number
        to_phone = self._normalize_phone(to_phone)
        
        # Use default from_phone if not specified
        if not from_phone:
            from_phone = self.config.get('DEFAULT_PHONE') or os.environ.get('TWILIO_PHONE_NUMBER')
        
        # Format as E.164 for Twilio
        from_phone = self._normalize_phone(from_phone)
        
        if not to_phone or not from_phone:
            print("Error: Missing phone number for SMS")
            return {"status": "error", "message": "Missing phone number"}
        
        # Send SMS via Twilio if available
        if self.twilio_client:
            try:
                sms = self.twilio_client.messages.create(
                    body=message,
                    from_=from_phone,
                    to=to_phone
                )
                status = {"status": "sent", "message": "SMS sent via Twilio", "sid": sms.sid}
                print(f"SMS sent to {to_phone}")
            except Exception as e:
                status = {"status": "error", "message": str(e)}
                print(f"Error sending SMS: {e}")
        else:
            # Simulate sending SMS
            print(f"\n--- SIMULATED SMS to {to_phone} ---")
            print(message)
            print("-------------------------------\n")
            status = {"status": "simulated", "message": "SMS simulated (no Twilio credentials)"}
        
        # Log the message
        self._log_message(
            client_id=client_id,
            phone=to_phone,
            email=None,
            business_name=business_name,
            direction="outbound",
            channel="sms",
            message=message,
            status=status["status"]
        )
        
        return status
    
    def send_email(self, to_email, subject, message, from_email=None, from_name=None, 
                 client_id=None, business_name=None, html_content=None):
        """Send an email using SendGrid"""
        # Use default sender if not specified
        if not from_email:
            from_email = self.config.get('DEFAULT_EMAIL') or os.environ.get('SENDGRID_FROM_EMAIL')
        
        if not from_name:
            from_name = self.config.get('DEFAULT_NAME') or "Website Builder"
        
        if not to_email or not from_email:
            print("Error: Missing email address")
            return {"status": "error", "message": "Missing email address"}
        
        # Create email content (HTML or plain text)
        if html_content:
            content = Content("text/html", html_content)
        else:
            content = Content("text/plain", message)
        
        # Send email via SendGrid if available
        if self.sendgrid_client:
            try:
                message = Mail(
                    from_email=Email(from_email, from_name),
                    to_emails=to_email,
                    subject=subject,
                    html_content=content
                )
                response = self.sendgrid_client.send(message)
                status = {
                    "status": "sent" if response.status_code == 202 else "error",
                    "message": f"SendGrid response code: {response.status_code}"
                }
                print(f"Email sent to {to_email}, status: {status['status']}")
            except Exception as e:
                status = {"status": "error", "message": str(e)}
                print(f"Error sending email: {e}")
        else:
            # Simulate sending email
            print(f"\n--- SIMULATED EMAIL to {to_email} ---")
            print(f"Subject: {subject}")
            print(f"From: {from_name} <{from_email}>")
            print("Content:")
            print(html_content if html_content else message)
            print("-------------------------------\n")
            status = {"status": "simulated", "message": "Email simulated (no SendGrid credentials)"}
        
        # Log the message
        self._log_message(
            client_id=client_id,
            phone=None,
            email=to_email,
            business_name=business_name,
            direction="outbound",
            channel="email",
            message=subject + ": " + (html_content or message),
            status=status["status"]
        )
        
        return status
    
    def _log_message(self, direction, channel, message, status, client_id=None, 
                   phone=None, email=None, business_name=None):
        """Log a message to the history database"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        with open(self.history_file, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([
                timestamp, client_id, phone, email, business_name,
                direction, channel, message, status
            ])
    
    def receive_sms(self, from_phone, message, to_phone=None):
        """Process an incoming SMS"""
        # In a web app, this would be called by a webhook
        # For now, we'll just log it and return a simulated response
        
        # Normalize phone numbers
        from_phone = self._normalize_phone(from_phone)
        if to_phone:
            to_phone = self._normalize_phone(to_phone)
        else:
            to_phone = self.config.get('DEFAULT_PHONE') or os.environ.get('TWILIO_PHONE_NUMBER')
            to_phone = self._normalize_phone(to_phone)
        
        # Try to look up client info
        client_info = self._lookup_client_by_phone(from_phone)
        client_id = client_info.get('client_id') if client_info else None
        business_name = client_info.get('business_name') if client_info else None
        
        # Log the incoming message
        self._log_message(
            client_id=client_id,
            phone=from_phone,
            email=None,
            business_name=business_name,
            direction="inbound",
            channel="sms",
            message=message,
            status="received"
        )
        
        print(f"Received SMS from {from_phone}: {message}")
        
        # Return info about the message
        return {
            "status": "received",
            "from": from_phone,
            "to": to_phone,
            "message": message,
            "client_id": client_id,
            "business_name": business_name
        }
    
    def receive_email(self, from_email, subject, message, to_email=None):
        """Process an incoming email"""
        # In a web app, this would be called by a webhook
        # For now, we'll just log it and return a simulated response
        
        if not to_email:
            to_email = self.config.get('DEFAULT_EMAIL') or os.environ.get('SENDGRID_FROM_EMAIL')
        
        # Try to look up client info
        client_info = self._lookup_client_by_email(from_email)
        client_id = client_info.get('client_id') if client_info else None
        business_name = client_info.get('business_name') if client_info else None
        
        # Log the incoming message
        self._log_message(
            client_id=client_id,
            phone=None,
            email=from_email,
            business_name=business_name,
            direction="inbound",
            channel="email",
            message=subject + ": " + message,
            status="received"
        )
        
        print(f"Received email from {from_email}: {subject}")
        
        # Return info about the message
        return {
            "status": "received",
            "from": from_email,
            "to": to_email,
            "subject": subject,
            "message": message,
            "client_id": client_id,
            "business_name": business_name
        }
    
    def _lookup_client_by_phone(self, phone):
        """Look up a client by phone number"""
        # In a real application, this would query a database
        # For now, we'll check the clients directory for matching phone numbers
        
        clients_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                 "data", "clients")
        
        if not os.path.exists(clients_dir):
            return None
        
        for client_folder in os.listdir(clients_dir):
            client_info_file = os.path.join(clients_dir, client_folder, "client_info.json")
            if os.path.exists(client_info_file):
                try:
                    with open(client_info_file, 'r') as f:
                        client_info = json.load(f)
                        client_phone = self._normalize_phone(client_info.get('phone', ''))
                        if client_phone == phone:
                            client_info['client_id'] = client_folder
                            return client_info
                except:
                    pass
        
        return None
    
    def _lookup_client_by_email(self, email):
        """Look up a client by email address"""
        # Similar to phone lookup but for email
        
        clients_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                 "data", "clients")
        
        if not os.path.exists(clients_dir):
            return None
        
        for client_folder in os.listdir(clients_dir):
            client_info_file = os.path.join(clients_dir, client_folder, "client_info.json")
            if os.path.exists(client_info_file):
                try:
                    with open(client_info_file, 'r') as f:
                        client_info = json.load(f)
                        if client_info.get('email', '').lower() == email.lower():
                            client_info['client_id'] = client_folder
                            return client_info
                except:
                    pass
        
        return None
    
    def get_conversation_history(self, client_id=None, phone=None, email=None, 
                              channel=None, limit=50):
        """Get conversation history for a client"""
        if not os.path.exists(self.history_file):
            return []
        
        # Read the history file
        df = pd.read_csv(self.history_file)
        
        # Apply filters
        if client_id:
            df = df[df['client_id'] == client_id]
        if phone:
            phone = self._normalize_phone(phone)
            df = df[df['phone'] == phone]
        if email:
            df = df[df['email'].str.lower() == email.lower()]
        if channel:
            df = df[df['channel'] == channel]
        
        # Sort by timestamp (newest first) and limit
        df = df.sort_values('timestamp', ascending=False).head(limit)
        
        # Convert to list of dictionaries
        history = df.to_dict('records')
        
        return history
    
    def create_email_template(self, template_name, subject, html_content):
        """Save an email template for reuse"""
        templates_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "templates")
        os.makedirs(templates_dir, exist_ok=True)
        
        template = {
            "subject": subject,
            "html_content": html_content,
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
        template_file = os.path.join(templates_dir, f"{template_name}.json")
        with open(template_file, 'w') as f:
            json.dump(template, f, indent=2)
        
        print(f"Created email template: {template_name}")
        return template_file
    
    def send_template_email(self, to_email, template_name, replacements=None, 
                         client_id=None, business_name=None):
        """Send an email using a saved template"""
        if replacements is None:
            replacements = {}
        
        # Load the template
        template_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), 
                                  "templates", f"{template_name}.json")
        
        if not os.path.exists(template_file):
            return {"status": "error", "message": f"Template not found: {template_name}"}
        
        with open(template_file, 'r') as f:
            template = json.load(f)
        
        # Apply replacements
        subject = template["subject"]
        html_content = template["html_content"]
        
        for key, value in replacements.items():
            placeholder = f"{{{{{key}}}}}"
            subject = subject.replace(placeholder, str(value))
            html_content = html_content.replace(placeholder, str(value))
        
        # Send the email
        return self.send_email(
            to_email=to_email,
            subject=subject,
            message="", # Not used when html_content is provided
            html_content=html_content,
            client_id=client_id,
            business_name=business_name
        )

def main():
    """Example usage of the Communication System"""
    comm = CommunicationSystem()
    
    # Example: Send SMS
    # comm.send_sms(
    #     to_phone="555-123-4567",
    #     message="Hello from the Website Builder! Would you like to learn more about our services?",
    #     business_name="Example Business"
    # )
    
    # Example: Send Email
    # comm.send_email(
    #     to_email="client@example.com",
    #     subject="Your New Website Project",
    #     message="We're excited to start working on your website!",
    #     business_name="Example Business"
    # )
    
    # Example: Create Email Template
    welcome_template = """
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0066cc; color: white; padding: 10px 20px; }
            .content { padding: 20px; }
            .button { display: inline-block; background-color: #0066cc; color: white; 
                     padding: 10px 20px; text-decoration: none; border-radius: 5px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to Website Builder!</h1>
            </div>
            <div class="content">
                <p>Hello {{client_name}},</p>
                <p>We're excited to start working on the new website for {{business_name}}.</p>
                <p>Here's what happens next:</p>
                <ol>
                    <li>We'll collect information about your business</li>
                    <li>Our designers will create a mockup</li>
                    <li>You'll review and approve the design</li>
                    <li>We'll launch your new website!</li>
                </ol>
                <p>To get started, please use the button below to access your client portal:</p>
                <p><a href="{{portal_url}}" class="button">Access Client Portal</a></p>
                <p>If you have any questions, feel free to reply to this email or call us.</p>
                <p>Best regards,<br>The Website Builder Team</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    comm.create_email_template(
        template_name="welcome_email",
        subject="Welcome to Website Builder, {{client_name}}!",
        html_content=welcome_template
    )
    
    print("Created welcome email template")

if __name__ == "__main__":
    main()
