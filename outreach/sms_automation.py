#!/usr/bin/env python3
"""
SMS Outreach Automation
-----------------------
This script handles SMS outreach to businesses using Twilio.
It reads from the clean leads list and sends personalized messages.
"""

import os
import json
import csv
import time
import random
from twilio.rest import Client
from datetime import datetime
import pandas as pd

class SMSOutreach:
    def __init__(self, account_sid=None, auth_token=None, from_number=None):
        """Initialize with Twilio credentials"""
        # If credentials are not provided, check for environment variables
        self.account_sid = account_sid or os.environ.get('TWILIO_ACCOUNT_SID')
        self.auth_token = auth_token or os.environ.get('TWILIO_AUTH_TOKEN')
        self.from_number = from_number or os.environ.get('TWILIO_PHONE_NUMBER')
        
        # Validate credentials
        if not all([self.account_sid, self.auth_token, self.from_number]):
            print("Warning: Twilio credentials not fully provided. SMS sending will be simulated.")
            self.client = None
        else:
            self.client = Client(self.account_sid, self.auth_token)
            
        # Set up logging
        self.log_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                    "data", "outreach_log.csv")
        if not os.path.exists(self.log_file):
            with open(self.log_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['timestamp', 'phone', 'business_name', 'message', 'status'])
    
    def load_leads(self, leads_file=None):
        """Load the lead list from CSV"""
        if leads_file is None:
            leads_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                      "data", "clean_leads.csv")
        
        if not os.path.exists(leads_file):
            raise FileNotFoundError(f"Leads file not found: {leads_file}")
            
        return pd.read_csv(leads_file)
    
    def send_sms(self, to_number, message):
        """Send an SMS using Twilio or simulate if no credentials"""
        if not to_number:
            return {"status": "error", "message": "No phone number provided"}
            
        # Clean the phone number (remove any non-digit characters)
        to_number = ''.join(filter(str.isdigit, to_number))
        
        # Format as E.164 for US numbers
        if len(to_number) == 10:  # US number without country code
            to_number = f"+1{to_number}"
        elif len(to_number) == 11 and to_number.startswith('1'):  # US with leading 1
            to_number = f"+{to_number}"
        
        if self.client:
            try:
                # Send actual SMS via Twilio
                sms = self.client.messages.create(
                    body=message,
                    from_=self.from_number,
                    to=to_number
                )
                return {"status": "sent", "message": "SMS sent successfully", "sid": sms.sid}
            except Exception as e:
                return {"status": "error", "message": str(e)}
        else:
            # Simulate sending SMS
            print(f"\n--- SIMULATED SMS to {to_number} ---")
            print(message)
            print("-------------------------------\n")
            return {"status": "simulated", "message": "SMS simulated (no Twilio credentials)"}
    
    def log_outreach(self, phone, business_name, message, status):
        """Log the outreach attempt to CSV"""
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        with open(self.log_file, 'a', newline='') as f:
            writer = csv.writer(f)
            writer.writerow([timestamp, phone, business_name, message, status])
    
    def get_message_template(self, business_name, owner_name=None):
        """Generate a personalized message for the business"""
        templates = [
            f"Hey{' ' + owner_name if owner_name else ''}, I noticed {business_name} doesn't have a website. I'm local and can get one built for just $400 with free setup. Want the details? (Reply STOP to opt out)",
            
            f"Hi{' ' + owner_name if owner_name else ''}! I help local Maine businesses like {business_name} get online with professional websites. $400 setup + $50/mo hosting. Interested? (Reply STOP to opt out)",
            
            f"Local web developer here - saw {business_name} doesn't have a website yet. I can build one for $400 total (includes hosting for 1st month). Would this help your business? (Reply STOP to opt out)"
        ]
        
        return random.choice(templates)
    
    def run_campaign(self, test_mode=True, limit=None, delay_seconds=60):
        """Run the SMS outreach campaign"""
        leads_df = self.load_leads()
        
        # Filter to only new leads (not previously contacted)
        new_leads = leads_df[leads_df['status'] == 'New']
        
        if limit:
            new_leads = new_leads.head(limit)
            
        print(f"Starting campaign with {len(new_leads)} leads")
        print(f"{'TEST MODE' if test_mode else 'LIVE MODE'} - {'Limited to ' + str(limit) + ' messages' if limit else 'No limit'}")
        
        if test_mode and not limit:
            limit = 1  # In test mode, default to just 1 message if no limit specified
            new_leads = new_leads.head(limit)
            
        for index, lead in new_leads.iterrows():
            business_name = lead['business_name']
            phone = lead['phone']
            
            # Generate personalized message
            message = self.get_message_template(business_name)
            
            # Send the message
            print(f"Sending to {business_name} at {phone}...")
            result = self.send_sms(phone, message)
            
            # Log the attempt
            self.log_outreach(phone, business_name, message, result['status'])
            
            # Update the lead status in the DataFrame
            leads_df.at[index, 'status'] = 'Contacted'
            
            # Add a delay between messages to avoid spam detection
            if index < len(new_leads) - 1 and not test_mode:
                time.sleep(delay_seconds)
        
        # Save the updated lead status back to CSV
        leads_df.to_csv(os.path.join(os.path.dirname(os.path.dirname(__file__)), 
                                     "data", "clean_leads.csv"), index=False)
        
        print(f"Campaign completed. {len(new_leads)} messages sent.")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Run SMS outreach campaign')
    parser.add_argument('--test', action='store_true', help='Run in test mode (simulation)')
    parser.add_argument('--limit', type=int, help='Limit number of messages')
    parser.add_argument('--delay', type=int, default=60, help='Delay between messages in seconds')
    args = parser.parse_args()
    
    outreach = SMSOutreach()
    outreach.run_campaign(test_mode=args.test, limit=args.limit, delay_seconds=args.delay)

if __name__ == "__main__":
    main()
