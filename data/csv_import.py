#!/usr/bin/env python3
"""
CSV Import Tool for Website Business
-----------------------------------
This tool imports CSV files from various sources (PhantomBuster, Google Sheets exports, etc.)
and standardizes them for use in our outreach system.

It specifically:
1. Handles different CSV formats (PhantomBuster, manual exports, etc.)
2. Maps column names to our standard format
3. Filters for businesses without websites
4. Prepares data for SMS outreach
"""

import os
import csv
import pandas as pd
import re
import argparse
from datetime import datetime

class CSVImporter:
    def __init__(self, output_dir=None):
        """Initialize the CSV importer"""
        self.output_dir = output_dir or os.path.join(os.path.dirname(os.path.abspath(__file__)))
        os.makedirs(self.output_dir, exist_ok=True)
        
        # Define standard column names for our system
        self.standard_columns = [
            'business_name', 'business_type', 'address', 'phone', 'website', 
            'has_website', 'maps_url', 'rating', 'reviews', 'location', 'notes'
        ]
        
        # Known CSV formats and their column mappings
        self.format_mappings = {
            'phantombuster': {
                'name': 'business_name',
                'website': 'website',
                'address': 'address',
                'phone': 'phone',
                'type': 'business_type',
                'placeUrl': 'maps_url',
                'rating': 'rating',
                'reviewsCount': 'reviews'
            },
            'google_sheets': {
                'Business Name': 'business_name',
                'Type': 'business_type',
                'Address': 'address',
                'Phone': 'phone',
                'Website': 'website',
                'Google Maps URL': 'maps_url',
                'Rating': 'rating',
                'Reviews': 'reviews'
            },
            'manual': {
                'name': 'business_name',
                'type': 'business_type',
                'address': 'address',
                'phone': 'phone',
                'website': 'website',
                'url': 'maps_url',
                'rating': 'rating',
                'reviews': 'reviews'
            }
        }
    
    def detect_format(self, filepath):
        """Detect the format of the CSV file based on headers"""
        try:
            df = pd.read_csv(filepath, nrows=0)  # Just read headers
            headers = df.columns.tolist()
            
            # Check each known format for matching headers
            for format_name, mapping in self.format_mappings.items():
                # If more than 50% of the headers match this format, use it
                matching_headers = [h for h in headers if h in mapping]
                if len(matching_headers) / len(headers) > 0.5:
                    return format_name
            
            # If no match, assume manual format with custom headers
            return 'manual'
            
        except Exception as e:
            print(f"Error detecting format: {e}")
            return 'manual'  # Default to manual format
    
    def standardize_phone(self, phone):
        """Standardize phone number format"""
        if not phone or pd.isna(phone):
            return ''
            
        # Extract digits only
        digits = re.sub(r'\D', '', str(phone))
        
        # Format US number: (XXX) XXX-XXXX
        if len(digits) == 10:
            return f"({digits[0:3]}) {digits[3:6]}-{digits[6:]}"
        elif len(digits) == 11 and digits[0] == '1':
            return f"({digits[1:4]}) {digits[4:7]}-{digits[7:]}"
        else:
            return phone  # Return original if can't standardize
    
    def has_website(self, website):
        """Determine if a business has a website based on the website field"""
        if not website or pd.isna(website):
            return False
            
        website = str(website).strip().lower()
        
        # Check for empty websites or placeholders
        if website == '' or website == 'nan' or website == 'none' or website == 'n/a':
            return False
            
        # Check for valid website format (basic check)
        return bool(re.match(r'https?://', website))
    
    def import_csv(self, filepath, format_type=None, location=None, business_type=None):
        """Import a CSV file, standardize it, and save as our format"""
        try:
            # Detect format if not specified
            if not format_type:
                format_type = self.detect_format(filepath)
            
            print(f"Importing CSV: {filepath}")
            print(f"Detected format: {format_type}")
            
            # Read the CSV
            df = pd.read_csv(filepath)
            print(f"Found {len(df)} records")
            
            # Map columns to our standard format
            mapping = self.format_mappings.get(format_type, {})
            renamed_columns = {}
            
            for original, standard in mapping.items():
                if original in df.columns:
                    renamed_columns[original] = standard
            
            # Rename columns that match our mapping
            df = df.rename(columns=renamed_columns)
            
            # Create missing standard columns
            for col in self.standard_columns:
                if col not in df.columns:
                    df[col] = ''
            
            # Set location if provided
            if location:
                df['location'] = location
                
            # Set business type if provided
            if business_type:
                df['business_type'] = business_type
            
            # Process phone numbers
            df['phone'] = df['phone'].apply(self.standardize_phone)
            
            # Determine has_website
            df['has_website'] = df['website'].apply(self.has_website)
            
            # Add import date
            df['import_date'] = datetime.now().strftime('%Y-%m-%d')
            
            # Save the full imported data
            basename = os.path.basename(filepath)
            name_without_ext = os.path.splitext(basename)[0]
            full_output = os.path.join(self.output_dir, f"{name_without_ext}_imported.csv")
            df.to_csv(full_output, index=False)
            print(f"Saved all {len(df)} records to {full_output}")
            
            # Create filtered version with only businesses without websites
            no_website_df = df[df['has_website'] == False].copy()
            no_website_output = os.path.join(self.output_dir, f"{name_without_ext}_no_website.csv")
            no_website_df.to_csv(no_website_output, index=False)
            print(f"Saved {len(no_website_df)} businesses without websites to {no_website_output}")
            
            # Return both dataframes
            return {
                'all': df,
                'no_website': no_website_df
            }
            
        except Exception as e:
            print(f"Error importing CSV: {e}")
            return None
    
    def import_from_google_sheets(self, sheet_id, sheet_name=None):
        """Import directly from Google Sheets using the sheet ID"""
        try:
            # Construct the export URL
            if sheet_name:
                url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq?tqx=out:csv&sheet={sheet_name}"
            else:
                url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv"
            
            print(f"Importing from Google Sheets: {url}")
            
            # Read the CSV from URL
            df = pd.read_csv(url)
            print(f"Found {len(df)} records in Google Sheet")
            
            # Save to a temporary file
            temp_file = os.path.join(self.output_dir, f"google_sheet_{sheet_id}.csv")
            df.to_csv(temp_file, index=False)
            
            # Import using our standard CSV import
            return self.import_csv(temp_file, format_type='google_sheets')
            
        except Exception as e:
            print(f"Error importing from Google Sheets: {e}")
            return None
    
    def combine_csv_files(self, input_dir=None, output_file=None):
        """Combine multiple CSV files into a single file"""
        input_dir = input_dir or self.output_dir
        output_file = output_file or os.path.join(self.output_dir, "combined_leads.csv")
        
        try:
            all_dfs = []
            
            # Find all CSV files in the input directory
            csv_files = [f for f in os.listdir(input_dir) if f.endswith('.csv') and 'imported' in f]
            
            if not csv_files:
                print(f"No CSV files found in {input_dir}")
                return None
            
            print(f"Combining {len(csv_files)} CSV files")
            
            # Read each CSV and append to list
            for file in csv_files:
                file_path = os.path.join(input_dir, file)
                df = pd.read_csv(file_path)
                all_dfs.append(df)
                print(f"Added {len(df)} records from {file}")
            
            # Combine all dataframes
            combined_df = pd.concat(all_dfs, ignore_index=True)
            
            # Remove duplicates based on business name and phone
            deduplicated_df = combined_df.drop_duplicates(subset=['business_name', 'phone'], keep='first')
            print(f"Removed {len(combined_df) - len(deduplicated_df)} duplicate records")
            
            # Save the combined file
            deduplicated_df.to_csv(output_file, index=False)
            print(f"Saved {len(deduplicated_df)} records to {output_file}")
            
            # Create a no-website version
            no_website_df = deduplicated_df[deduplicated_df['has_website'] == False].copy()
            no_website_output = os.path.join(os.path.dirname(output_file), 
                                           f"{os.path.splitext(os.path.basename(output_file))[0]}_no_website.csv")
            no_website_df.to_csv(no_website_output, index=False)
            print(f"Saved {len(no_website_df)} businesses without websites to {no_website_output}")
            
            return {
                'all': deduplicated_df,
                'no_website': no_website_df
            }
            
        except Exception as e:
            print(f"Error combining CSV files: {e}")
            return None

def main():
    """Main function for command-line usage"""
    parser = argparse.ArgumentParser(description='Import and process CSV files for website business')
    
    # Command options
    subparsers = parser.add_subparsers(dest='command', help='Command to run')
    
    # Import CSV command
    import_parser = subparsers.add_parser('import', help='Import a CSV file')
    import_parser.add_argument('file', help='Path to CSV file')
    import_parser.add_argument('--format', choices=['phantombuster', 'google_sheets', 'manual'],
                              help='Format of the CSV file')
    import_parser.add_argument('--location', help='Location to assign to all records')
    import_parser.add_argument('--business-type', help='Business type to assign to all records')
    
    # Import from Google Sheets command
    sheets_parser = subparsers.add_parser('sheets', help='Import from Google Sheets')
    sheets_parser.add_argument('sheet_id', help='Google Sheet ID')
    sheets_parser.add_argument('--sheet-name', help='Name of the sheet to import')
    
    # Combine CSVs command
    combine_parser = subparsers.add_parser('combine', help='Combine multiple CSV files')
    combine_parser.add_argument('--input-dir', help='Directory containing CSV files')
    combine_parser.add_argument('--output-file', help='Output file path')
    
    args = parser.parse_args()
    
    importer = CSVImporter()
    
    if args.command == 'import':
        importer.import_csv(args.file, args.format, args.location, args.business_type)
    elif args.command == 'sheets':
        importer.import_from_google_sheets(args.sheet_id, args.sheet_name)
    elif args.command == 'combine':
        importer.combine_csv_files(args.input_dir, args.output_file)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
