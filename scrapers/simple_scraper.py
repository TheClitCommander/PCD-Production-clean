#!/usr/bin/env python3
"""
Simple Business Scraper - Alternative approach
Uses requests + BeautifulSoup instead of Selenium for better stability
"""

import os
import json
import time
import sqlite3
import requests
import pandas as pd
from datetime import datetime
from urllib.parse import quote_plus
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class SimpleScraper:
    def __init__(self, db_path="scraper_results.db"):
        self.db_path = db_path
        self.setup_database()
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
        })
    
    def setup_database(self):
        """Initialize SQLite database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS businesses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name TEXT NOT NULL,
                business_type TEXT,
                address TEXT,
                location TEXT,
                phone TEXT,
                website TEXT,
                has_website BOOLEAN,
                rating REAL,
                reviews TEXT,
                maps_url TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                search_session_id TEXT
            )
        ''')
        
        conn.commit()
        conn.close()
        logger.info(f"Database initialized: {self.db_path}")
    
    def create_sample_data(self, business_type, location):
        """Create sample business data for testing"""
        logger.info(f"Creating sample data for {business_type} in {location}")
        
        # Sample businesses based on common Maine plumbers
        sample_businesses = [
            {
                "business_name": "Maine Plumbing & Heating LLC",
                "business_type": business_type,
                "address": "123 Main St, Brunswick, ME 04011",
                "location": location,
                "phone": "(207) 725-1234",
                "website": None,
                "has_website": False,
                "rating": 4.5,
                "reviews": "23",
                "maps_url": "https://maps.google.com/sample1"
            },
            {
                "business_name": "Coastal Plumbing Services",
                "business_type": business_type,
                "address": "456 Bath Rd, Brunswick, ME 04011",
                "location": location,
                "phone": "(207) 725-5678",
                "website": "https://coastalplumbingme.com",
                "has_website": True,
                "rating": 4.2,
                "reviews": "18",
                "maps_url": "https://maps.google.com/sample2"
            },
            {
                "business_name": "Brunswick Drain Cleaning",
                "business_type": business_type,
                "address": "789 Pleasant St, Brunswick, ME 04011",
                "location": location,
                "phone": "(207) 725-9012",
                "website": None,
                "has_website": False,
                "rating": 4.8,
                "reviews": "41",
                "maps_url": "https://maps.google.com/sample3"
            },
            {
                "business_name": "Reliable Plumbing & Repair",
                "business_type": business_type,
                "address": "321 Federal St, Brunswick, ME 04011",
                "location": location,
                "phone": "(207) 725-3456",
                "website": None,
                "has_website": False,
                "rating": 4.1,
                "reviews": "12",
                "maps_url": "https://maps.google.com/sample4"
            },
            {
                "business_name": "Midcoast Mechanical",
                "business_type": business_type,
                "address": "654 Harpswell Rd, Brunswick, ME 04011",
                "location": location,
                "phone": "(207) 725-7890",
                "website": "https://midcoastmechanical.com",
                "has_website": True,
                "rating": 4.6,
                "reviews": "35",
                "maps_url": "https://maps.google.com/sample5"
            },
            {
                "business_name": "Emergency Plumbing Solutions",
                "business_type": business_type,
                "address": "987 Cumberland St, Brunswick, ME 04011",
                "location": location,
                "phone": "(207) 725-2468",
                "website": None,
                "has_website": False,
                "rating": 3.9,
                "reviews": "8",
                "maps_url": "https://maps.google.com/sample6"
            }
        ]
        
        session_id = f"{business_type}_{location}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        saved_count = 0
        for business in sample_businesses:
            try:
                cursor.execute('''
                    INSERT INTO businesses (
                        business_name, business_type, address, location,
                        phone, website, has_website, rating, reviews,
                        maps_url, search_session_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    business['business_name'],
                    business['business_type'],
                    business['address'],
                    business['location'],
                    business['phone'],
                    business['website'],
                    business['has_website'],
                    business['rating'],
                    business['reviews'],
                    business['maps_url'],
                    session_id
                ))
                saved_count += 1
                logger.info(f"✅ Saved: {business['business_name']} | Website: {'Yes' if business['has_website'] else 'No'} | Rating: {business['rating']}")
                
            except Exception as e:
                logger.error(f"Error saving business {business['business_name']}: {e}")
        
        conn.commit()
        conn.close()
        
        logger.info(f"🎯 Sample data created: {saved_count} businesses")
        logger.info(f"📊 Session ID: {session_id}")
        
        return session_id, saved_count
    
    def export_to_excel(self, output_file="leads.xlsx"):
        """Export all data to Excel"""
        try:
            conn = sqlite3.connect(self.db_path)
            
            # Get all businesses
            df_all = pd.read_sql_query("SELECT * FROM businesses ORDER BY scraped_at DESC", conn)
            
            if df_all.empty:
                logger.warning("No data found to export")
                return False
            
            # Create Excel writer
            with pd.ExcelWriter(output_file, engine='openpyxl') as writer:
                
                # Sheet 1: All Leads
                df_export = self._prepare_export_dataframe(df_all)
                df_export.to_excel(writer, sheet_name='All Leads', index=False)
                
                # Sheet 2: Prime Prospects (no website + phone)
                df_prime = df_all[(df_all['has_website'] == 0) & 
                                 (df_all['phone'].notna()) & 
                                 (df_all['phone'] != '')]
                if not df_prime.empty:
                    df_prime_export = self._prepare_export_dataframe(df_prime)
                    df_prime_export.to_excel(writer, sheet_name='Prime Prospects', index=False)
                
                # Sheet 3: High Rated (4.0+)
                df_high_rated = df_all[pd.to_numeric(df_all['rating'], errors='coerce') >= 4.0]
                if not df_high_rated.empty:
                    df_high_rated_export = self._prepare_export_dataframe(df_high_rated)
                    df_high_rated_export.to_excel(writer, sheet_name='High Rated', index=False)
                
                # Sheet 4: Summary
                summary_data = self._generate_summary_stats(df_all)
                summary_df = pd.DataFrame(list(summary_data.items()), columns=['Metric', 'Value'])
                summary_df.to_excel(writer, sheet_name='Summary', index=False)
            
            conn.close()
            logger.info(f"✅ Exported {len(df_all)} leads to {output_file}")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting to Excel: {e}")
            return False
    
    def _add_priority_score(self, df):
        """Add priority score column"""
        def calculate_priority(row):
            score = 0
            
            # High priority: No website
            if row.get('has_website') == 0:
                score += 50
            
            # Rating bonus
            try:
                rating = float(row.get('rating', 0))
                if rating >= 4.5:
                    score += 30
                elif rating >= 4.0:
                    score += 20
                elif rating >= 3.5:
                    score += 10
            except (ValueError, TypeError):
                pass
            
            # Phone bonus
            if row.get('phone') and str(row.get('phone')).strip():
                score += 20
            
            # Reviews bonus
            try:
                reviews = int(row.get('reviews', 0))
                if reviews >= 50:
                    score += 15
                elif reviews >= 20:
                    score += 10
                elif reviews >= 5:
                    score += 5
            except (ValueError, TypeError):
                pass
            
            return score
        
        df['priority_score'] = df.apply(calculate_priority, axis=1)
        
        def priority_label(score):
            if score >= 80:
                return "🔥 Hot Lead"
            elif score >= 60:
                return "⭐ High Priority"
            elif score >= 40:
                return "📈 Medium Priority"
            else:
                return "📋 Low Priority"
        
        df['priority_label'] = df['priority_score'].apply(priority_label)
        return df.sort_values('priority_score', ascending=False)
    
    def _prepare_export_dataframe(self, df):
        """Prepare dataframe for export"""
        export_columns = [
            'business_name', 'priority_label', 'priority_score', 'phone', 
            'address', 'website', 'has_website', 'rating', 'reviews', 
            'business_type', 'location', 'maps_url', 'scraped_at'
        ]
        
        # Add priority score
        df_clean = self._add_priority_score(df.copy())
        
        # Only include columns that exist
        available_columns = [col for col in export_columns if col in df_clean.columns]
        return df_clean[available_columns]
    
    def _generate_summary_stats(self, df):
        """Generate summary statistics"""
        stats = {}
        
        total_businesses = len(df)
        stats['Total Businesses'] = total_businesses
        
        # Website statistics
        no_website = len(df[df['has_website'] == 0])
        stats['Businesses Without Websites'] = f"{no_website} ({no_website/total_businesses*100:.1f}%)"
        
        with_website = len(df[df['has_website'] == 1])
        stats['Businesses With Websites'] = f"{with_website} ({with_website/total_businesses*100:.1f}%)"
        
        # Contact information
        with_phone = len(df[(df['phone'].notna()) & (df['phone'] != '')])
        stats['Businesses With Phone Numbers'] = f"{with_phone} ({with_phone/total_businesses*100:.1f}%)"
        
        # Prime prospects
        prime_prospects = len(df[(df['has_website'] == 0) & 
                               (df['phone'].notna()) & 
                               (df['phone'] != '')])
        stats['Prime Prospects (No Website + Phone)'] = f"{prime_prospects} ({prime_prospects/total_businesses*100:.1f}%)"
        
        # Rating stats
        rated_businesses = df[pd.to_numeric(df['rating'], errors='coerce').notna()]
        if not rated_businesses.empty:
            avg_rating = pd.to_numeric(rated_businesses['rating'], errors='coerce').mean()
            high_rated = len(rated_businesses[pd.to_numeric(rated_businesses['rating'], errors='coerce') >= 4.0])
            stats['Average Rating'] = f"{avg_rating:.1f}"
            stats['High Rated (4.0+)'] = f"{high_rated} ({high_rated/len(rated_businesses)*100:.1f}%)"
        
        return stats

def main():
    """Main function"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Simple Business Scraper")
    parser.add_argument('--business-type', '-t', required=True, help='Business type')
    parser.add_argument('--location', '-l', required=True, help='Location')
    parser.add_argument('--export', action='store_true', help='Export to Excel')
    parser.add_argument('--output', default='leads.xlsx', help='Output file')
    
    args = parser.parse_args()
    
    scraper = SimpleScraper()
    
    if args.export:
        success = scraper.export_to_excel(args.output)
        if success:
            logger.info(f"✅ Export completed: {args.output}")
        else:
            logger.error("❌ Export failed")
    else:
        session_id, count = scraper.create_sample_data(args.business_type, args.location)
        logger.info(f"✅ Created {count} sample businesses")

if __name__ == "__main__":
    main()
