#!/usr/bin/env python3
"""
Clean Business Scraper - No fake data generation
This scraper is designed to only return real business data or nothing at all
"""

import os
import json
import time
import sqlite3
import requests
import pandas as pd
from datetime import datetime
import logging
import argparse

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class CleanBusinessScraper:
    def __init__(self, db_path="scraper_results.db"):
        self.db_path = db_path
        self.setup_database()
    
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
                search_session_id TEXT,
                data_source TEXT DEFAULT 'real_scraper_only'
            )
        ''')
        
        conn.commit()
        conn.close()

    def scrape_businesses(self, business_type, location, limit=10):
        """
        Scrape real businesses - no fake data generation
        This method will only return businesses from real APIs or nothing
        """
        logger.info(f"🔍 Searching for {business_type} in {location}")
        logger.warning("🚫 No fake data generation - only real API results")
        
        session_id = f"{business_type}_{location}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        # Try to get real data from Google Places API
        businesses = self._get_real_businesses_from_api(business_type, location, limit)
        
        if not businesses:
            logger.info("❌ No real businesses found - refusing to generate fake data")
            logger.info("💡 To get real data: Set GOOGLE_PLACES_API_KEY environment variable")
            return session_id
        
        # Save only real businesses to database
        self._save_businesses_to_db(businesses, business_type, location, session_id)
        
        logger.info(f"✅ Saved {len(businesses)} REAL businesses")
        return session_id

    def _get_real_businesses_from_api(self, business_type, location, limit):
        """Get real businesses from Google Places API only"""
        api_key = os.getenv('GOOGLE_PLACES_API_KEY')
        
        if not api_key:
            logger.warning("🚫 No Google Places API key found")
            logger.info("💡 Set GOOGLE_PLACES_API_KEY environment variable for real data")
            return []
        
        try:
            # Use Google Places API to get real businesses
            url = "https://maps.googleapis.com/maps/api/place/textsearch/json"
            params = {
                'query': f"{business_type} in {location}",
                'key': api_key,
                'type': 'establishment'
            }
            
            response = requests.get(url, params=params)
            response.raise_for_status()
            data = response.json()
            
            if data['status'] != 'OK':
                logger.error(f"Google Places API error: {data.get('error_message', data['status'])}")
                return []
            
            businesses = []
            for place in data.get('results', [])[:limit]:
                business = self._parse_place_data(place, api_key)
                if business:
                    businesses.append(business)
            
            logger.info(f"🎯 Found {len(businesses)} REAL businesses from Google Places API")
            return businesses
            
        except Exception as e:
            logger.error(f"Error getting real businesses: {e}")
            return []

    def _parse_place_data(self, place, api_key):
        """Parse Google Places API response into business data"""
        try:
            place_id = place.get('place_id')
            
            # Get additional details
            details_url = "https://maps.googleapis.com/maps/api/place/details/json"
            details_params = {
                'place_id': place_id,
                'key': api_key,
                'fields': 'formatted_phone_number,website,business_status'
            }
            
            details_response = requests.get(details_url, params=details_params)
            details_data = details_response.json()
            details = details_data.get('result', {}) if details_response.ok else {}
            
            # Get website and verify if it actually works
            reported_website = details.get('website')
            verified_website, actually_has_website = self._verify_website(reported_website)
            
            business = {
                'business_name': place.get('name'),
                'address': place.get('formatted_address'),
                'phone': details.get('formatted_phone_number'),
                'website': verified_website,
                'has_website': actually_has_website,
                'rating': place.get('rating'),
                'reviews': str(place.get('user_ratings_total', 0)),
                'maps_url': f"https://maps.google.com/maps?place_id={place_id}",
                'data_source': 'google_places_verified_website'
            }
            
            return business
            
        except Exception as e:
            logger.error(f"Error parsing place data: {e}")
            return None

    def _verify_website(self, website_url):
        """Verify if a website actually exists and works - try multiple variations"""
        if not website_url:
            return None, False
            
        # Generate variations of the URL to try
        urls_to_try = self._generate_url_variations(website_url)
        
        for url in urls_to_try:
            try:
                # Try HEAD request first (faster)
                response = requests.head(url, timeout=8, allow_redirects=True, 
                                       headers={'User-Agent': 'Mozilla/5.0 (compatible; WebsiteChecker/1.0)'})
                
                if response.status_code < 400:
                    logger.info(f"✅ Website verified: {url}")
                    return url, True
                elif response.status_code in [405, 406]:  # Method not allowed - try GET
                    get_response = requests.get(url, timeout=8, allow_redirects=True,
                                              headers={'User-Agent': 'Mozilla/5.0 (compatible; WebsiteChecker/1.0)'})
                    if get_response.status_code < 400:
                        logger.info(f"✅ Website verified (via GET): {url}")
                        return url, True
                        
            except requests.exceptions.RequestException as e:
                logger.debug(f"URL failed: {url} - {e}")
                continue
                
        # If all variations failed
        logger.warning(f"❌ All website variations failed for: {website_url}")
        return website_url, False

    def _generate_url_variations(self, original_url):
        """Generate different URL variations to try"""
        variations = []
        
        # Clean the original URL
        if not original_url.startswith(('http://', 'https://')):
            original_url = f"https://{original_url}"
        
        variations.append(original_url)
        
        # Extract domain from URL
        try:
            from urllib.parse import urlparse
            parsed = urlparse(original_url)
            domain = parsed.netloc.lower()
            
            # Try different variations
            base_domain = domain.replace('www.', '')
            
            variations.extend([
                f"https://{base_domain}",
                f"https://www.{base_domain}",
                f"http://{base_domain}",
                f"http://www.{base_domain}",
            ])
            
            # Remove duplicates while preserving order
            seen = set()
            unique_variations = []
            for url in variations:
                if url not in seen:
                    seen.add(url)
                    unique_variations.append(url)
                    
            return unique_variations[:4]  # Limit to 4 attempts
            
        except Exception as e:
            logger.debug(f"Error generating URL variations: {e}")
            return [original_url]

    def _save_businesses_to_db(self, businesses, business_type, location, session_id):
        """Save real businesses to database"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        for business in businesses:
            try:
                cursor.execute('''
                    INSERT INTO businesses (
                        business_name, business_type, address, location, phone, website, 
                        has_website, rating, reviews, maps_url, search_session_id, data_source
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    business['business_name'],
                    business_type,
                    business['address'],
                    location,
                    business['phone'],
                    business['website'],
                    business['has_website'],
                    business['rating'],
                    business['reviews'],
                    business['maps_url'],
                    session_id,
                    business['data_source']
                ))
                
                website_status = "✅ Has Website" if business['has_website'] else "🎯 NO WEBSITE"
                logger.info(f"✅ REAL: {business['business_name']} | {website_status} | Rating: {business['rating']}")
                
            except Exception as e:
                logger.error(f"Error saving business {business.get('business_name', 'Unknown')}: {e}")
        
        conn.commit()
        conn.close()

    def export_to_excel(self, output_filename="leads_export.xlsx"):
        """Export all real businesses to Excel"""
        conn = sqlite3.connect(self.db_path)
        
        query = '''
            SELECT business_name, business_type, address, phone, website, 
                   has_website, rating, reviews, scraped_at, data_source
            FROM businesses 
            WHERE data_source LIKE '%api%' OR data_source LIKE '%verified%'
            ORDER BY rating DESC, business_name
        '''
        
        df = pd.read_sql_query(query, conn)
        conn.close()
        
        if df.empty:
            logger.warning("❌ No real businesses to export")
            return None
        
        df.to_excel(output_filename, index=False)
        logger.info(f"✅ Exported {len(df)} REAL businesses to {output_filename}")
        return output_filename

def main():
    parser = argparse.ArgumentParser(description='Clean Business Scraper - Real data only')
    parser.add_argument('-t', '--type', required=True, help='Business type (e.g., plumbers, electricians)')
    parser.add_argument('-l', '--location', required=True, help='Location (e.g., "Brunswick, ME")')
    parser.add_argument('--limit', type=int, default=10, help='Maximum number of businesses to find')
    parser.add_argument('--export', action='store_true', help='Export results to Excel')
    parser.add_argument('--output', default='leads_export.xlsx', help='Output filename for export')
    
    args = parser.parse_args()
    
    scraper = CleanBusinessScraper()
    
    if args.export:
        filename = scraper.export_to_excel(args.output)
        if filename:
            print(f"✅ Export completed: {filename}")
        else:
            print("❌ No data to export")
    else:
        session_id = scraper.scrape_businesses(args.type, args.location, args.limit)
        print(f"✅ Scraping session: {session_id}")

if __name__ == "__main__":
    main()
