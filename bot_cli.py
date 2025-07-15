#!/usr/bin/env python3
"""
CLI wrapper for WebsiteWizard bot integration
This connects the Node.js server to the existing Python bot logic
"""

import sys
import json
import argparse
import os
import pandas as pd
from datetime import datetime

# Add the project root to the Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the necessary modules from your existing codebase
try:
    from scrapers.google_maps_scraper import scrape_business_info
except ImportError:
    scrape_business_info = None

try:
    from data.process_data import process_scraped_data
except ImportError:
    process_scraped_data = None

try:
    from outreach.sms_automation import SMSOutreach
except ImportError:
    SMSOutreach = None

try:
    from data.csv_import import CSVImporter
except ImportError:
    CSVImporter = None


def enrich_lead(args):
    """Enrich a single lead with additional data"""
    try:
        # For now, we'll simulate enrichment since your main.py doesn't have a direct enrich function
        # In a real implementation, this would call your Google Maps scraper for a single business
        
        enrichment_data = {
            "address": "To be enriched",
            "city": "Portland",
            "state": "ME",
            "website": None,  # This is what we're checking for
            "businessType": args.business_type if hasattr(args, 'business_type') else "general",
            "businessHours": "Mon-Fri 9-5",  # Mock data
            "reviews": {
                "count": 0,
                "rating": 0
            },
            "socialMedia": {},
            "employeeCount": 5  # Mock estimate
        }
        
        # If you have a Google Maps scraper function, use it here
        if scrape_business_info and args.name:
            # This would need to be adapted to your actual scraper interface
            # scraped_data = scrape_business_info(args.name, args.phone)
            # enrichment_data.update(scraped_data)
            pass
        
        # Check if business likely has no website (your key criteria)
        if not enrichment_data.get("website"):
            enrichment_data["tags"] = ["no-website", "potential-lead"]
            enrichment_data["score"] = 85  # High score for businesses without websites
        
        print(json.dumps(enrichment_data))
        
    except Exception as e:
        error_response = {
            "error": str(e),
            "status": "failed"
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)


def launch_outreach(args):
    """Launch outreach campaign for multiple leads"""
    try:
        leads = json.loads(args.leads)
        
        if not SMSOutreach:
            # If SMS module not available, return mock success
            result = {
                "success": True,
                "processed": len(leads),
                "sent": 0,
                "message": "SMS module not configured"
            }
            print(json.dumps(result))
            return
        
        # Initialize SMS outreach
        sms = SMSOutreach()
        
        # Convert leads to DataFrame format that your SMS system expects
        leads_df = pd.DataFrame(leads)
        
        # Add required fields if missing
        if 'status' not in leads_df.columns:
            leads_df['status'] = 'New'
        if 'business_name' not in leads_df.columns and 'name' in leads_df.columns:
            leads_df['business_name'] = leads_df['name']
        
        # Save to temporary CSV (your SMS system reads from CSV)
        temp_file = os.path.join(os.path.dirname(__file__), 'data', 'temp_outreach_leads.csv')
        os.makedirs(os.path.dirname(temp_file), exist_ok=True)
        leads_df.to_csv(temp_file, index=False)
        
        # Run campaign in test mode (set test_mode=False for production)
        # Limit to the number of leads provided
        sms.run_campaign(test_mode=True, limit=len(leads))
        
        result = {
            "success": True,
            "processed": len(leads),
            "sent": len(leads),
            "mode": "test"
        }
        
        print(json.dumps(result))
        
    except Exception as e:
        error_response = {
            "error": str(e),
            "status": "failed",
            "processed": 0
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)


def import_sheets(args):
    """Import leads from Google Sheets or CSV"""
    try:
        # For now, return mock data since Google Sheets integration isn't in main.py
        # In production, this would connect to your actual Google Sheets API
        
        mock_leads = [
            {
                "name": "Demo Auto Repair",
                "email": "",  # Many won't have emails
                "phone": "207-555-0001",
                "address": "123 Main St",
                "city": "Brunswick",
                "state": "ME",
                "businessType": "auto_repair",
                "has_website": False
            },
            {
                "name": "Test Plumbing Services",
                "email": "contact@testplumbing.com",
                "phone": "207-555-0002",
                "address": "456 Oak Ave",
                "city": "Bath",
                "state": "ME",
                "businessType": "plumbing",
                "has_website": False
            }
        ]
        
        # If you have CSV import functionality, use it
        if CSVImporter and hasattr(args, 'csv_file'):
            importer = CSVImporter()
            # This would need adaptation to your actual CSV importer
            # leads_df = importer.import_file(args.csv_file)
            # mock_leads = leads_df.to_dict('records')
            pass
        
        print(json.dumps(mock_leads))
        
    except Exception as e:
        error_response = {
            "error": str(e),
            "status": "failed",
            "leads": []
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)


def process_leads(args):
    """Process and clean lead data"""
    try:
        if process_scraped_data:
            # Run your data processing function
            results = process_scraped_data()
            
            if results is not None and len(results) > 0:
                # Convert DataFrame to JSON
                leads_json = results.to_dict('records')
                response = {
                    "success": True,
                    "processed": len(leads_json),
                    "leads": leads_json[:10]  # Return first 10 for preview
                }
            else:
                response = {
                    "success": False,
                    "processed": 0,
                    "message": "No leads found to process"
                }
        else:
            response = {
                "success": False,
                "message": "Data processing module not available"
            }
            
        print(json.dumps(response))
        
    except Exception as e:
        error_response = {
            "error": str(e),
            "status": "failed"
        }
        print(json.dumps(error_response), file=sys.stderr)
        sys.exit(1)


def main():
    parser = argparse.ArgumentParser(description='WebsiteWizard Bot CLI')
    subparsers = parser.add_subparsers(dest='command', help='Commands')
    
    # Enrich command
    enrich_parser = subparsers.add_parser('enrich', help='Enrich a lead')
    enrich_parser.add_argument('--name', required=True, help='Business name')
    enrich_parser.add_argument('--phone', required=True, help='Phone number')
    enrich_parser.add_argument('--email', default='', help='Email address')
    enrich_parser.add_argument('--business-type', default='general', help='Type of business')
    
    # Outreach command
    outreach_parser = subparsers.add_parser('outreach', help='Launch outreach')
    outreach_parser.add_argument('--leads', required=True, help='JSON array of leads')
    
    # Import command
    import_parser = subparsers.add_parser('import-sheets', help='Import from Google Sheets')
    import_parser.add_argument('--sheet-id', required=True, help='Google Sheet ID')
    import_parser.add_argument('--csv-file', help='Alternative: Import from CSV file')
    
    # Process command (additional functionality)
    process_parser = subparsers.add_parser('process', help='Process scraped data')
    
    args = parser.parse_args()
    
    if args.command == 'enrich':
        enrich_lead(args)
    elif args.command == 'outreach':
        launch_outreach(args)
    elif args.command == 'import-sheets':
        import_sheets(args)
    elif args.command == 'process':
        process_leads(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    main() 