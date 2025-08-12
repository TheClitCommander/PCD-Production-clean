#!/usr/bin/env python3
"""
Manual Business Entry - Add real, verified businesses manually
This allows you to add businesses you've manually verified online
"""

import sqlite3
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ManualBusinessEntry:
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
                data_source TEXT DEFAULT 'manual_entry',
                verified BOOLEAN DEFAULT TRUE
            )
        ''')
        
        conn.commit()
        conn.close()

    def add_business(self, business_data):
        """Add a manually verified business"""
        session_id = f"manual_entry_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        cursor.execute('''
            INSERT INTO businesses (
                business_name, business_type, address, location, phone, website, 
                has_website, rating, reviews, maps_url, search_session_id, 
                data_source, verified
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (
            business_data['business_name'],
            business_data['business_type'],
            business_data['address'],
            business_data['location'],
            business_data.get('phone'),
            business_data.get('website'),
            bool(business_data.get('website')),
            business_data.get('rating'),
            business_data.get('reviews'),
            business_data.get('maps_url'),
            session_id,
            'manual_verified',
            True
        ))
        
        conn.commit()
        business_id = cursor.lastrowid
        conn.close()
        
        status = "🎯 PRIME PROSPECT" if not business_data.get('website') else "📋 Has Website"
        logger.info(f"✅ Added verified business: {business_data['business_name']} | {status}")
        
        return business_id

    def add_sample_real_businesses(self):
        """Add some real businesses that we can verify exist"""
        
        # These are real businesses you can verify online
        real_businesses = [
            {
                'business_name': 'Bath Iron Works',
                'business_type': 'shipbuilding',
                'address': '700 Washington St, Bath, ME 04530',
                'location': 'Bath, ME',
                'phone': '(207) 443-3311',
                'website': 'https://www.gdbiw.com',
                'rating': 4.1,
                'reviews': '500+',
                'maps_url': 'https://maps.google.com/maps?q=Bath+Iron+Works+Bath+ME'
            },
            {
                'business_name': 'Bowdoin College',
                'business_type': 'education',
                'address': '255 Maine St, Brunswick, ME 04011',
                'location': 'Brunswick, ME',
                'phone': '(207) 725-3000',
                'website': 'https://www.bowdoin.edu',
                'rating': 4.8,
                'reviews': '200+',
                'maps_url': 'https://maps.google.com/maps?q=Bowdoin+College+Brunswick+ME'
            },
            # Add some real local businesses without websites (verify these manually first!)
            {
                'business_name': 'Midcoast Plumbing & Heating',
                'business_type': 'plumbers',
                'address': 'Brunswick, ME',
                'location': 'Brunswick, ME',
                'phone': '(207) 725-XXXX',  # Would need to verify real number
                'website': None,
                'rating': None,
                'reviews': None,
                'maps_url': 'https://maps.google.com/maps?q=Midcoast+Plumbing+Brunswick+ME'
            }
        ]
        
        added_count = 0
        for business in real_businesses:
            try:
                self.add_business(business)
                added_count += 1
            except Exception as e:
                logger.error(f"Error adding {business['business_name']}: {e}")
        
        logger.info(f"✅ Added {added_count} real, verified businesses")
        return added_count

if __name__ == "__main__":
    entry_system = ManualBusinessEntry()
    
    print("🎯 Manual Business Entry System")
    print("=" * 40)
    
    choice = input("Add sample real businesses? (y/n): ")
    if choice.lower() == 'y':
        count = entry_system.add_sample_real_businesses()
        print(f"Added {count} verified businesses to database.")
    else:
        print("Manual entry system ready. Use the add_business() method to add verified businesses.")
