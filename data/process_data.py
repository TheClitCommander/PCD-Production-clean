#!/usr/bin/env python3
"""
Data Processor for Business Leads
---------------------------------
This script processes the raw scraped data to:
1. Combine all CSVs into a single master list
2. Remove businesses that already have websites
3. Remove duplicates based on phone numbers
4. Create a clean lead list ready for outreach
"""

import os
import csv
import glob
import pandas as pd

def process_scraped_data():
    """Process all scraped CSV files and create a clean lead list"""
    # Get all CSV files in the data directory
    data_dir = os.path.dirname(os.path.abspath(__file__))
    csv_files = glob.glob(os.path.join(data_dir, "raw_*.csv"))
    
    if not csv_files:
        print("No CSV files found for processing.")
        return
    
    print(f"Found {len(csv_files)} CSV files to process.")
    
    # Combine all CSV files into a single DataFrame
    all_data = []
    for file in csv_files:
        try:
            df = pd.read_csv(file)
            all_data.append(df)
            print(f"Added {len(df)} rows from {os.path.basename(file)}")
        except Exception as e:
            print(f"Error processing {file}: {e}")
    
    if not all_data:
        print("No data could be loaded from the CSV files.")
        return
    
    # Combine all DataFrames
    combined_df = pd.concat(all_data, ignore_index=True)
    print(f"Combined data has {len(combined_df)} rows.")
    
    # Clean the data
    # 1. Remove businesses with websites
    no_website_df = combined_df[combined_df['has_website'] == False]
    print(f"Removed {len(combined_df) - len(no_website_df)} businesses with websites.")
    
    # 2. Remove duplicates based on phone number (keep first occurrence)
    no_website_df['phone'] = no_website_df['phone'].str.replace(r'\D', '', regex=True)  # Remove non-digits
    no_website_df = no_website_df.dropna(subset=['phone'])  # Remove rows with no phone number
    no_website_df = no_website_df[no_website_df['phone'].str.len() > 9]  # Keep only valid phone numbers
    
    # Remove duplicates
    clean_df = no_website_df.drop_duplicates(subset=['phone'], keep='first')
    print(f"Removed {len(no_website_df) - len(clean_df)} duplicate phone numbers.")
    
    # Add lead status column for tracking
    clean_df['status'] = 'New'
    clean_df['notes'] = ''
    
    # Save the clean lead list
    output_file = os.path.join(data_dir, "clean_leads.csv")
    clean_df.to_csv(output_file, index=False)
    print(f"Saved {len(clean_df)} clean leads to {output_file}")
    
    # Create a JSON file for N8N or other automation tools
    json_output = clean_df.to_json(orient='records')
    with open(os.path.join(data_dir, "leads_for_outreach.json"), 'w') as f:
        f.write(json_output)
    print(f"Saved leads as JSON for automation tools.")
    
    return clean_df

if __name__ == "__main__":
    process_scraped_data()
