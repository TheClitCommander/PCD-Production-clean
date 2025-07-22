#!/usr/bin/env python3
"""
Test script for the Outreach System
Demonstrates practice mode with demo database
"""

import os
import sqlite3
from datetime import datetime

def create_test_database():
    """Create a test database with sample leads for outreach testing"""
    db_path = 'test_outreach.db'
    
    # Remove existing test db
    if os.path.exists(db_path):
        os.remove(db_path)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create tables (same schema as scraper)
    cursor.execute('''
        CREATE TABLE businesses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            business_name TEXT NOT NULL,
            business_type TEXT,
            category TEXT,
            address TEXT,
            location TEXT,
            phone TEXT,
            email TEXT,
            website TEXT,
            has_website BOOLEAN,
            rating REAL,
            reviews TEXT,
            years_in_business TEXT,
            maps_url TEXT UNIQUE,
            project_id TEXT,
            scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            search_session_id TEXT,
            outreach_status TEXT DEFAULT 'not_contacted',
            last_contacted TIMESTAMP,
            outreach_count INTEGER DEFAULT 0
        )
    ''')
    
    cursor.execute('''
        CREATE TABLE search_sessions (
            id TEXT PRIMARY KEY,
            business_type TEXT,
            location TEXT,
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            total_businesses INTEGER DEFAULT 0,
            status TEXT DEFAULT 'completed'
        )
    ''')
    
    # Create a test session
    session_id = 'test_restaurants_Brunswick_ME_20250119'
    cursor.execute('''
        INSERT INTO search_sessions (id, business_type, location, total_businesses)
        VALUES (?, ?, ?, ?)
    ''', (session_id, 'restaurants', 'Brunswick, ME', 5))
    
    # Create test businesses - prime prospects for outreach
    test_businesses = [
        # Prime prospects (no website + phone)
        ('The Coastal Kitchen', 'restaurants', '123 Main St, Brunswick, ME', '(207) 555-1111', 
         'coastal@example.com', None, 0, 4.8, '156', session_id),
        
        ('Harbor View Diner', 'restaurants', '456 Harbor Rd, Brunswick, ME', '(207) 555-2222', 
         'harbor@example.com', None, 0, 4.5, '89', session_id),
        
        ('Maine Street Cafe', 'restaurants', '789 Maine St, Brunswick, ME', '(207) 555-3333', 
         'mainecafe@example.com', None, 0, 4.7, '203', session_id),
        
        # Has website (won't be in prime_prospects)
        ('Pizza Palace', 'restaurants', '321 Oak Ave, Brunswick, ME', '(207) 555-4444', 
         'pizza@example.com', 'https://pizzapalace.com', 1, 4.2, '67', session_id),
        
        # No phone (won't be in prime_prospects)
        ('Secret Spot', 'restaurants', '999 Hidden Ln, Brunswick, ME', None, 
         'secret@example.com', None, 0, 4.9, '45', session_id),
    ]
    
    for name, btype, address, phone, email, website, has_website, rating, reviews, session in test_businesses:
        project_id = f"test_{name.replace(' ', '_').lower()}_uuid"
        maps_url = f"https://maps.google.com/test/{name.replace(' ', '_').lower()}"
        
        cursor.execute('''
            INSERT INTO businesses (
                business_name, business_type, address, phone, email, website, has_website,
                rating, reviews, maps_url, project_id, search_session_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ''', (name, btype, address, phone, email, website, has_website, rating, reviews, maps_url, project_id, session))
    
    conn.commit()
    conn.close()
    
    print(f"✅ Created test database: {db_path}")
    print(f"   • 5 test businesses")
    print(f"   • 3 prime prospects (no website + phone)")
    print(f"   • Test emails included for demo")
    
    return db_path

def demonstrate_outreach_commands(db_path):
    """Show example outreach commands"""
    print("\n" + "="*70)
    print("🚀 OUTREACH SYSTEM DEMONSTRATION")
    print("="*70)
    
    print("\n📋 Available Templates (from outreach_config.yaml):")
    print("   • cold_email_v1 - Professional intro email")
    print("   • cold_email_v2 - Casual approach email")
    print("   • sms_intro_v1 - Initial SMS outreach")
    print("   • sms_follow_up_v1 - SMS follow-up")
    
    print("\n🎯 Practice Mode Commands (Dry Run):")
    print(f"\n1️⃣ Preview email campaign to prime prospects:")
    print(f"   python google_maps_scraper.py --outreach --channel email --template cold_email_v1 --segment prime_prospects --db-path {db_path} --dry-run")
    
    print(f"\n2️⃣ Preview SMS campaign with limit:")
    print(f"   python google_maps_scraper.py --outreach --channel sms --template sms_intro_v1 --segment prime_prospects --limit 2 --db-path {db_path} --dry-run")
    
    print(f"\n3️⃣ Preview with custom delay between messages:")
    print(f"   python google_maps_scraper.py --outreach --channel email --template cold_email_v2 --segment no_website --delay 5 --db-path {db_path} --dry-run")
    
    print("\n📊 View Campaign Statistics:")
    print(f"   python google_maps_scraper.py --outreach-stats --db-path {db_path}")
    
    print("\n⚡ Go Live (Remove --dry-run):")
    print("   Just remove the --dry-run flag when ready to send real messages!")
    
    print("\n⚠️  IMPORTANT:")
    print("   • Set environment variables before going live:")
    print("     export SENDGRID_API_KEY=your_key_here")
    print("     export TWILIO_ACCOUNT_SID=your_sid_here")
    print("     export TWILIO_AUTH_TOKEN=your_token_here")
    print("   • Update from_phone in outreach_config.yaml")
    print("   • Test with your own email/phone first!")

def test_outreach_manager():
    """Test the OutreachManager directly"""
    print("\n" + "="*70)
    print("🧪 TESTING OUTREACH MANAGER")
    print("="*70)
    
    try:
        from outreach_manager import OutreachManager
        
        # Create test database
        db_path = create_test_database()
        
        # Initialize manager in dry-run mode
        manager = OutreachManager(
            config_path="outreach_config.yaml",
            db_path=db_path,
            dry_run=True
        )
        
        print("\n📧 Testing Email Template:")
        leads = manager.load_leads("prime_prospects", limit=1)
        if leads:
            lead = leads[0]
            variables = {
                "business_name": lead["business_name"],
                "rating": lead["rating"],
                "reviews": lead["reviews"],
                "location": lead["location"],
                "business_type": lead["business_type"]
            }
            manager.send_email(
                lead.get("email", "test@example.com"),
                "cold_email_v1",
                variables,
                lead["id"]
            )
        
        print("\n📱 Testing SMS Template:")
        if leads:
            lead = leads[0]
            variables = {
                "business_name": lead["business_name"],
                "rating": lead["rating"],
            }
            manager.send_sms(
                lead["phone"],
                "sms_intro_v1",
                variables,
                lead["id"]
            )
        
        print("\n✅ Outreach Manager test complete!")
        
        # Clean up
        os.remove(db_path)
        print("🧹 Test database cleaned up")
        
    except ImportError as e:
        print(f"❌ Could not import OutreachManager: {e}")
        print("💡 Make sure outreach_manager.py is in the current directory")
    except Exception as e:
        print(f"❌ Test failed: {e}")

def main():
    """Run all demonstrations"""
    print("🎉 PLEASANT COVE DESIGN - OUTREACH SYSTEM TEST")
    print("=" * 70)
    
    # Create test database
    db_path = create_test_database()
    
    # Show CLI commands
    demonstrate_outreach_commands(db_path)
    
    # Test the manager directly
    test_outreach_manager()
    
    print("\n" + "="*70)
    print("🚀 READY TO START OUTREACH!")
    print("="*70)
    print("1. Edit templates in outreach_config.yaml")
    print("2. Test with dry-run mode first")
    print("3. Set up your API credentials")
    print("4. Start with a small batch to test response")
    print("5. Scale up gradually")
    print("\n💡 Remember: Always personalize and provide value!")
    print("=" * 70)

if __name__ == "__main__":
    main() 