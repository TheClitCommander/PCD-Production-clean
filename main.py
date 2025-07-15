#!/usr/bin/env python3
"""
Local Website Business Automation
---------------------------------
Main application entry point that ties together all components of the system.
"""

import os
import sys
import argparse
from datetime import datetime

def print_header():
    """Print the application header"""
    print("\n" + "=" * 80)
    print("LOCAL WEBSITE BUSINESS AUTOMATION SYSTEM")
    print("For Midcoast Maine Small Businesses")
    print("=" * 80 + "\n")

def validate_environment():
    """Check that the environment is properly set up"""
    required_dirs = ['scrapers', 'data', 'outreach', 'templates', 'fulfillment']
    missing_dirs = [d for d in required_dirs if not os.path.isdir(d)]
    
    if missing_dirs:
        print("ERROR: Missing required directories:", ', '.join(missing_dirs))
        print("Please run this script from the project root directory.")
        return False
    
    return True

def check_dependencies():
    """Check if required Python packages are installed"""
    try:
        import selenium
        import pandas
        import twilio
        return True
    except ImportError as e:
        print(f"ERROR: Missing required dependency: {e}")
        print("Please install required dependencies with: pip install -r requirements.txt")
        return False

def run_scraper():
    """Run the Google Maps scraper"""
    print("\n🔍 RUNNING BUSINESS SCRAPER")
    print("---------------------------")
    print("This will search Google Maps for businesses in Midcoast Maine without websites.")
    
    # Ask for confirmation
    confirm = input("This may take some time. Continue? (y/n): ").lower()
    if confirm != 'y':
        return
    
    try:
        from scrapers.google_maps_scraper import main as scraper_main
        scraper_main()
    except Exception as e:
        print(f"ERROR running scraper: {e}")

def process_data():
    """Process the scraped data"""
    print("\n📊 PROCESSING BUSINESS DATA")
    print("---------------------------")
    print("This will process scraped data to identify businesses without websites.")
    
    try:
        from data.process_data import process_scraped_data
        results = process_scraped_data()
        
        if results is not None and len(results) > 0:
            print(f"\n✅ Successfully processed data and found {len(results)} leads without websites!")
        else:
            print("\n⚠️ No leads were found. You may need to run the scraper first.")
    except Exception as e:
        print(f"ERROR processing data: {e}")

def run_outreach(test=True, limit=None):
    """Run the SMS outreach campaign"""
    print("\n📱 SMS OUTREACH AUTOMATION")
    print("---------------------------")
    
    if test:
        print("Running in TEST MODE - no actual SMS will be sent.")
    else:
        print("Running in LIVE MODE - actual SMS messages will be sent!")
        
    if limit:
        print(f"Limited to {limit} messages.")
    
    # Get confirmation for live mode
    if not test:
        confirm = input("Are you sure you want to send real SMS messages? (y/n): ").lower()
        if confirm != 'y':
            print("Switching to test mode.")
            test = True
    
    try:
        from outreach.sms_automation import SMSOutreach
        outreach = SMSOutreach()
        outreach.run_campaign(test_mode=test, limit=limit)
    except Exception as e:
        print(f"ERROR running outreach: {e}")

def setup_client(business_name=None):
    """Set up a new client"""
    print("\n👤 CLIENT SETUP")
    print("---------------------------")
    print("This will create a new client folder and generate necessary files.")
    
    if not business_name:
        business_name = input("Enter business name: ")
    
    contact_info = {
        "contact_name": input("Enter contact name: "),
        "phone": input("Enter phone number: "),
        "email": input("Enter email address: "),
        "business_type": input("Enter business type (e.g., Plumbing, Electrical): "),
        "location": input("Enter location (e.g., Brunswick, Maine): "),
        "notes": input("Enter any notes about this client: ")
    }
    
    try:
        from fulfillment.website_builder import WebsiteFulfillment
        fulfillment = WebsiteFulfillment()
        client_id, client_folder = fulfillment.create_client_folder(business_name, contact_info)
        
        print(f"\n✅ Client folder created: {client_folder}")
        
        # Generate Fiverr instructions
        instructions_file = fulfillment.generate_fiverr_instructions(client_id)
        print(f"✅ Generated Fiverr instructions: {instructions_file}")
        
        return client_id
    except Exception as e:
        print(f"ERROR setting up client: {e}")
        return None

def generate_client_form():
    """Generate the client information form"""
    try:
        from fulfillment.website_builder import WebsiteFulfillment
        fulfillment = WebsiteFulfillment()
        form_file = fulfillment.generate_client_form()
        print(f"\n✅ Client information form created: {form_file}")
    except Exception as e:
        print(f"ERROR generating client form: {e}")

def main():
    """Main application entry point"""
    parser = argparse.ArgumentParser(description="Local Website Business Automation System")
    parser.add_argument('--scrape', action='store_true', help='Run the Google Maps scraper')
    parser.add_argument('--process', action='store_true', help='Process scraped data')
    parser.add_argument('--outreach', action='store_true', help='Run SMS outreach')
    parser.add_argument('--test', action='store_true', help='Run in test mode (for outreach)')
    parser.add_argument('--limit', type=int, help='Limit number of messages (for outreach)')
    parser.add_argument('--client', action='store_true', help='Set up a new client')
    parser.add_argument('--form', action='store_true', help='Generate client information form')
    parser.add_argument('--all', action='store_true', help='Run the entire pipeline')
    
    args = parser.parse_args()
    
    print_header()
    
    if not validate_environment() or not check_dependencies():
        sys.exit(1)
    
    if args.all:
        run_scraper()
        process_data()
        run_outreach(test=True, limit=3)  # Test mode for safety
        generate_client_form()
        return
    
    if args.scrape:
        run_scraper()
    
    if args.process:
        process_data()
    
    if args.outreach:
        run_outreach(test=args.test, limit=args.limit)
    
    if args.client:
        setup_client()
    
    if args.form:
        generate_client_form()
    
    # If no arguments provided, show menu
    if not any([args.scrape, args.process, args.outreach, args.client, args.form, args.all]):
        show_menu()

def show_menu():
    """Show interactive menu"""
    while True:
        print("\n📋 MAIN MENU")
        print("---------------------------")
        print("1. Run Google Maps Scraper")
        print("2. Process Scraped Data")
        print("3. Run SMS Outreach (Test Mode)")
        print("4. Run SMS Outreach (Live Mode)")
        print("5. Set Up New Client")
        print("6. Generate Client Information Form")
        print("7. Exit")
        
        choice = input("\nEnter your choice (1-7): ")
        
        if choice == '1':
            run_scraper()
        elif choice == '2':
            process_data()
        elif choice == '3':
            limit = input("Enter limit (leave blank for no limit): ")
            limit = int(limit) if limit.isdigit() else None
            run_outreach(test=True, limit=limit)
        elif choice == '4':
            limit = input("Enter limit (leave blank for no limit): ")
            limit = int(limit) if limit.isdigit() else None
            run_outreach(test=False, limit=limit)
        elif choice == '5':
            business_name = input("Enter business name: ")
            setup_client(business_name)
        elif choice == '6':
            generate_client_form()
        elif choice == '7':
            print("Exiting. Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()
