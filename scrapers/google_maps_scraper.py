#!/usr/bin/env python3
"""
Google Maps Business Scraper
----------------------------
This script scrapes business information from Google Maps for specific areas in Midcoast Maine.
It collects business names, phone numbers, addresses, ratings, reviews, years in business (if available),
and checks if they have websites. It saves ALL businesses, whether they have a website or not.
"""

import os
import csv
import time
import json
import uuid
import random
import re
import logging
import sqlite3
import argparse
import threading
import time
from datetime import datetime
from functools import wraps
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock

# Optional imports for enhanced export functionality
try:
    import pandas as pd
    import openpyxl
    EXCEL_EXPORT_AVAILABLE = True
except ImportError:
    EXCEL_EXPORT_AVAILABLE = False

try:
    import phonenumbers
    from phonenumbers import NumberParseException
    PHONE_VALIDATION_AVAILABLE = True
except ImportError:
    PHONE_VALIDATION_AVAILABLE = False
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException

# Try to import validation module
try:
    import sys
    sys.path.append('..')
    from validation import PhoneValidator, LeadEnricher
    from email_validator import EmailValidator, EmailEnricher
    VALIDATION_AVAILABLE = True
except ImportError:
    VALIDATION_AVAILABLE = False

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scraper.log'),
        logging.StreamHandler()  # Also show in console
    ]
)
logger = logging.getLogger(__name__)

# Warn if phone validation library is not available
if not PHONE_VALIDATION_AVAILABLE:
    logger.warning("phonenumbers library not available. Phone validation will be basic.")

class TokenBucketRateLimiter:
    """Token bucket rate limiter for controlling request frequency"""
    
    def __init__(self, tokens_per_second=2.0, max_tokens=10):
        self.tokens_per_second = tokens_per_second
        self.max_tokens = max_tokens
        self.tokens = max_tokens
        self.last_update = time.time()
        self.lock = Lock()
    
    def acquire(self, tokens=1):
        """Acquire tokens, blocking if necessary"""
        with self.lock:
            now = time.time()
            # Add tokens based on time elapsed
            elapsed = now - self.last_update
            self.tokens = min(self.max_tokens, self.tokens + elapsed * self.tokens_per_second)
            self.last_update = now
            
            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            else:
                # Calculate wait time
                wait_time = (tokens - self.tokens) / self.tokens_per_second
                logger.debug(f"Rate limiter: waiting {wait_time:.2f}s for {tokens} tokens")
                time.sleep(wait_time)
                self.tokens = 0  # All tokens consumed after wait
                return True

def retry_with_backoff(max_retries=3, base_delay=1.0, backoff_factor=2.0, exceptions=(Exception,)):
    """Decorator to retry functions with exponential backoff"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except exceptions as e:
                    if attempt == max_retries - 1:  # Last attempt
                        logger.error(f"Function {func.__name__} failed after {max_retries} attempts: {e}")
                        raise
                    
                    delay = base_delay * (backoff_factor ** attempt)
                    logger.warning(f"Attempt {attempt + 1} failed for {func.__name__}: {e}. Retrying in {delay:.1f}s...")
                    time.sleep(delay)
                    
            return None
        return wrapper
    return decorator

class GoogleMapsScraper:
    def __init__(self, headless=True, db_path="scraper_results.db", force_refresh=False, 
                 max_workers=3, rate_limit=2.0):
        self.setup_driver(headless)
        self.db_path = db_path
        self.force_refresh = force_refresh
        self.max_workers = max_workers
        self.rate_limiter = TokenBucketRateLimiter(tokens_per_second=rate_limit, max_tokens=rate_limit*5)
        self.setup_database()
        self.results = []  # Keep for backward compatibility, but we'll phase this out
        self.resume_mode = False
        self.resume_session_id = None
        self.skipped_count = 0
        self.new_count = 0
        self.db_lock = Lock()  # For thread-safe database operations
        
    def setup_driver(self, headless):
        """Configure and initialize the Chrome WebDriver"""
        options = Options()
        
        # Enhanced stability flags for macOS
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--disable-background-timer-throttling")
        options.add_argument("--disable-backgrounding-occluded-windows")
        options.add_argument("--disable-renderer-backgrounding")
        options.add_argument("--disable-features=TranslateUI")
        options.add_argument("--disable-ipc-flooding-protection")
        options.add_argument("--disable-background-networking")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-infobars")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-default-apps")
        options.add_argument("--disable-sync")
        options.add_argument("--disable-translate")
        options.add_argument("--hide-scrollbars")
        options.add_argument("--metrics-recording-only")
        options.add_argument("--mute-audio")
        options.add_argument("--no-first-run")
        options.add_argument("--safebrowsing-disable-auto-update")
        options.add_argument("--disable-web-security")
        options.add_argument("--allow-running-insecure-content")
        options.add_argument("--disable-logging")
        options.add_argument("--disable-gpu-logging")
        options.add_argument("--log-level=3")  # Suppress INFO, WARNING, ERROR
        options.add_argument("--silent")
        
        # Memory and performance optimizations
        options.add_argument("--memory-pressure-off")
        options.add_argument("--max_old_space_size=4096")
        options.add_argument("--aggressive-cache-discard")
        
        # Window settings
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--start-maximized")
        
        # Headless configuration
        if headless:
            options.add_argument("--headless=new")
            options.add_argument("--disable-gpu")
        
        # User agent
        options.add_argument(
            "user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        )
        
        # Additional prefs to reduce memory usage and crashes
        prefs = {
            "profile.default_content_setting_values": {
                "notifications": 2,
                "media_stream": 2,
            },
            "profile.default_content_settings.popups": 0,
            "profile.managed_default_content_settings.images": 2,  # Block images for speed
            "profile.content_settings.exceptions.automatic_downloads.*.setting": 2,
        }
        options.add_experimental_option("prefs", prefs)
        
        # Prevent automation detection
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)
        
        # Try multiple driver initialization strategies
        driver = None
        
        # Strategy 1: Try undetected-chromedriver with retries
        for attempt in range(3):
            try:
                import undetected_chromedriver as uc
                logger.info(f"Attempt {attempt + 1}: Trying undetected-chromedriver...")
                
                driver = uc.Chrome(
                    options=options, 
                    headless=headless,
                    version_main=None,  # Auto-detect Chrome version
                    driver_executable_path=None  # Auto-find chromedriver
                )
                logger.info("✅ Successfully initialized undetected-chromedriver")
                break
                
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} with undetected-chromedriver failed: {e}")
                if attempt == 2:  # Last attempt
                    logger.warning("All undetected-chromedriver attempts failed, falling back to standard WebDriver")
        
        # Strategy 2: Fall back to standard Chrome WebDriver
        if driver is None:
            try:
                logger.info("Trying standard Chrome WebDriver...")
                
                # Try to use ChromeDriverManager for automatic driver management
                try:
                    from webdriver_manager.chrome import ChromeDriverManager
                    from selenium.webdriver.chrome.service import Service
                    
                    service = Service(ChromeDriverManager().install())
                    driver = webdriver.Chrome(service=service, options=options)
                    logger.info("✅ Successfully initialized Chrome WebDriver with ChromeDriverManager")
                    
                except ImportError:
                    # Fallback to system chromedriver
                    logger.info("ChromeDriverManager not available, using system chromedriver...")
                    driver = webdriver.Chrome(options=options)
                    logger.info("✅ Successfully initialized Chrome WebDriver with system chromedriver")
                    
            except Exception as e:
                logger.error(f"Failed to initialize Chrome WebDriver: {e}")
                logger.error("Please ensure Chrome and chromedriver are properly installed")
                raise
        
        # Final check and setup
        if driver is None:
            raise Exception("Failed to initialize any WebDriver")
        
        self.driver = driver
        self.wait = WebDriverWait(self.driver, 15)  # Increased timeout
        
        # Execute additional stability scripts
        try:
            self.driver.execute_cdp_cmd('Page.addScriptToEvaluateOnNewDocument', {
                "source": """
                    Object.defineProperty(navigator, 'webdriver', {
                        get: () => undefined,
                    });
                """
            })
        except Exception:
            pass  # CDP commands might not be available in all setups
    
    def setup_database(self):
        """Initialize SQLite database with required tables"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        # Create businesses table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS businesses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                business_name TEXT NOT NULL,
                business_type TEXT,
                category TEXT,
                address TEXT,
                location TEXT,
                phone TEXT,
                website TEXT,
                has_website BOOLEAN,
                rating REAL,
                reviews TEXT,
                years_in_business TEXT,
                maps_url TEXT UNIQUE,
                project_id TEXT,
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                search_session_id TEXT,
                phone_valid BOOLEAN DEFAULT NULL,
                phone_formatted TEXT,
                phone_carrier TEXT,
                phone_country TEXT,
                phone_line_type TEXT,
                phone_error TEXT,
                email_format_valid BOOLEAN DEFAULT NULL,
                email_discovered TEXT,
                validation_date TIMESTAMP,
                email_valid BOOLEAN DEFAULT NULL,
                email_confidence_score REAL,
                email_type TEXT,
                email_risk_score REAL,
                email_mx_valid BOOLEAN DEFAULT NULL,
                email_is_disposable BOOLEAN DEFAULT NULL,
                email_discovery_source TEXT,
                email_discovery_confidence REAL,
                email_enrichment_date TIMESTAMP
            )
        ''')
        
        # Create search sessions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS search_sessions (
                id TEXT PRIMARY KEY,
                business_type TEXT,
                location TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                total_businesses INTEGER DEFAULT 0,
                status TEXT DEFAULT 'running'
            )
        ''')
        
        # Create scrape metadata table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS scrape_metadata (
                key TEXT PRIMARY KEY,
                value TEXT,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        conn.commit()
        conn.close()
        
        logger.info(f"Database initialized: {self.db_path}")
    
    @retry_with_backoff(max_retries=3, exceptions=(TimeoutException, StaleElementReferenceException, NoSuchElementException))
    def _safe_get(self, url):
        """Safely navigate to URL with retry"""
        return self.driver.get(url)
    
    @retry_with_backoff(max_retries=3, exceptions=(TimeoutException, StaleElementReferenceException))
    def _safe_click(self, element):
        """Safely click element with retry"""
        return element.click()
    
    @retry_with_backoff(max_retries=3, exceptions=(TimeoutException, NoSuchElementException))
    def _safe_find_element(self, by, value):
        """Safely find element with retry"""
        return self.driver.find_element(by, value)
    
    @retry_with_backoff(max_retries=3, exceptions=(TimeoutException, NoSuchElementException))
    def _safe_find_elements(self, by, value):
        """Safely find elements with retry"""
        return self.driver.find_elements(by, value)
    
    def _normalize_phone(self, phone_str, region='US'):
        """Normalize and validate phone number"""
        if not phone_str or not phone_str.strip():
            return None
            
        phone_str = phone_str.strip()
        
        if PHONE_VALIDATION_AVAILABLE:
            try:
                # Parse the phone number
                parsed = phonenumbers.parse(phone_str, region)
                
                # Check if it's valid
                if phonenumbers.is_valid_number(parsed):
                    # Format as national format (prettier for display)
                    formatted = phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.NATIONAL)
                    logger.debug(f"Normalized phone: {phone_str} -> {formatted}")
                    return formatted
                else:
                    logger.debug(f"Invalid phone number: {phone_str}")
                    return None
                    
            except NumberParseException as e:
                logger.debug(f"Could not parse phone {phone_str}: {e}")
                return None
        else:
            # Basic validation without phonenumbers library
            # Remove common formatting
            cleaned = re.sub(r'[^\d+]', '', phone_str)
            
            # Basic US phone validation (10-11 digits)
            if re.match(r'^\+?1?[2-9]\d{2}[2-9]\d{2}\d{4}$', cleaned):
                # Format as (XXX) XXX-XXXX
                if cleaned.startswith('+1'):
                    cleaned = cleaned[2:]
                elif cleaned.startswith('1'):
                    cleaned = cleaned[1:]
                    
                if len(cleaned) == 10:
                    formatted = f"({cleaned[:3]}) {cleaned[3:6]}-{cleaned[6:]}"
                    logger.debug(f"Basic normalized phone: {phone_str} -> {formatted}")
                    return formatted
            
            logger.debug(f"Could not normalize phone: {phone_str}")
            return None
    
    def _process_single_business_threaded(self, business_url_data, business_type, location, session_id):
        """Process a single business in a separate thread with its own WebDriver"""
        business_index = business_url_data["index"]
        maps_url = business_url_data["maps_url"]
        
        # Acquire rate limit token
        self.rate_limiter.acquire()
        
        # Create thread-local driver
        thread_driver = None
        try:
            thread_driver = self._create_thread_driver()
            thread_wait = WebDriverWait(thread_driver, 10)
            
            # Navigate to business page
            logger.debug(f"Processing business {business_index + 1}: {maps_url}")
            thread_driver.get(maps_url)
            
            # Wait for page to load
            try:
                thread_wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "h1, [data-item-id='address']")))
            except TimeoutException:
                logger.warning(f"Business page didn't load: {maps_url}")
                return None
            
            # Extract business information using thread-local driver
            name = self._get_text_if_exists_with_driver(thread_driver, "h1")
            address = self._get_text_if_exists_with_driver(thread_driver, "button[data-item-id='address']")
            raw_phone = self._get_text_if_exists_with_driver(thread_driver, "button[data-item-id^='phone']")
            phone = self._normalize_phone(raw_phone) if raw_phone else None
            website = self._get_href_if_exists_with_driver(thread_driver, "a[data-item-id^='authority']")
            business_type_text = self._get_text_if_exists_with_driver(thread_driver, "button[data-item-id^='category']")
            
            # Log phone validation results
            if raw_phone and not phone:
                logger.warning(f"Invalid phone number rejected: {raw_phone}")
            elif raw_phone and phone != raw_phone:
                logger.info(f"Phone normalized: {raw_phone} -> {phone}")
            
            # Extract rating and reviews
            rating = ""
            reviews = ""
            years_in_business = ""
            
            # Try to extract rating
            try:
                rating_element = thread_driver.find_element(By.CSS_SELECTOR, "div[jsaction*='pane'] span[role='img']")
                rating_text = rating_element.get_attribute("aria-label")
                if rating_text:
                    rating_match = re.search(r'([\d.]+)', rating_text)
                    rating = rating_match.group(1) if rating_match else ""
            except (NoSuchElementException, StaleElementReferenceException):
                pass
            
            # Try to extract review count
            try:
                reviews_element = thread_driver.find_element(By.CSS_SELECTOR, "button[jsaction*='pane.reviews']")
                reviews_text = reviews_element.text
                if reviews_text:
                    reviews_match = re.search(r'(\d+)', reviews_text)
                    reviews = reviews_match.group(1) if reviews_match else ""
            except (NoSuchElementException, StaleElementReferenceException):
                pass
            
            # Check if business already exists (deduplication)
            if maps_url and self._business_exists(maps_url) and not self.force_refresh:
                logger.info(f"Skipping duplicate business: {name} (already in database)")
                with self.db_lock:
                    self.skipped_count += 1
                return None
            
            # Save business if we have a name
            if name:
                pid = str(uuid.uuid4())
                
                new_business = {
                    "business_name": name,
                    "business_type": business_type,
                    "category": business_type_text,
                    "address": address,
                    "location": location,
                    "phone": phone,
                    "website": website,
                    "has_website": bool(website),
                    "maps_url": maps_url,
                    "rating": rating,
                    "reviews": reviews,
                    "years_in_business": years_in_business,
                    "project_id": pid,
                    "scraped_date": datetime.now().strftime("%Y-%m-%d")
                }
                new_business["search_query"] = f"{business_type} in {location}"
                
                # Save to database
                db_id = self._save_business_to_db(new_business, session_id)
                if not db_id:
                    logger.error(f"Failed to save business to database: {name}")
                    return None
                
                with self.db_lock:
                    self.new_count += 1
                
                # Save full JSON profile and other files (thread-safe)
                self._save_profile(new_business)
                self._update_index({
                    "profile_id": pid,
                    "business_name": new_business["business_name"],
                    "location": new_business["location"],
                    "business_type": new_business["business_type"],
                    "has_website": new_business["has_website"],
                    "phone": new_business["phone"],
                    "maps_url": new_business["maps_url"],
                    "scraped_date": new_business["scraped_date"]
                })
                self._init_conversation(pid)
                
                # Keep for CSV export (backward compatibility) - thread-safe
                with self.db_lock:
                    self.results.append(new_business)
                    
                logger.info(f"Scraped: {name} | Website: {'Yes' if website else 'No'} | Rating: {rating}")
                
                return new_business
            
        except Exception as e:
            logger.error(f"Error processing business {business_index}: {e}")
            return None
        finally:
            # Clean up thread driver
            if thread_driver:
                try:
                    thread_driver.quit()
                except:
                    pass

    def _create_thread_driver(self):
        """Create a WebDriver instance for use in a thread with same stability configs"""
        options = Options()
        
        # Use same enhanced stability flags as main driver
        options.add_argument("--headless=new")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-software-rasterizer")
        options.add_argument("--disable-background-timer-throttling")
        options.add_argument("--disable-backgrounding-occluded-windows")
        options.add_argument("--disable-renderer-backgrounding")
        options.add_argument("--disable-features=TranslateUI")
        options.add_argument("--disable-ipc-flooding-protection")
        options.add_argument("--disable-background-networking")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("--disable-infobars")
        options.add_argument("--disable-extensions")
        options.add_argument("--disable-default-apps")
        options.add_argument("--disable-sync")
        options.add_argument("--disable-translate")
        options.add_argument("--hide-scrollbars")
        options.add_argument("--metrics-recording-only")
        options.add_argument("--mute-audio")
        options.add_argument("--no-first-run")
        options.add_argument("--safebrowsing-disable-auto-update")
        options.add_argument("--disable-web-security")
        options.add_argument("--allow-running-insecure-content")
        options.add_argument("--disable-logging")
        options.add_argument("--disable-gpu-logging")
        options.add_argument("--log-level=3")
        options.add_argument("--silent")
        options.add_argument("--memory-pressure-off")
        options.add_argument("--max_old_space_size=4096")
        options.add_argument("--aggressive-cache-discard")
        options.add_argument("--window-size=1920,1080")
        
        options.add_argument(
            "user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36"
        )
        
        # Same prefs as main driver
        prefs = {
            "profile.default_content_setting_values": {
                "notifications": 2,
                "media_stream": 2,
            },
            "profile.default_content_settings.popups": 0,
            "profile.managed_default_content_settings.images": 2,
            "profile.content_settings.exceptions.automatic_downloads.*.setting": 2,
        }
        options.add_experimental_option("prefs", prefs)
        options.add_experimental_option("excludeSwitches", ["enable-automation"])
        options.add_experimental_option('useAutomationExtension', False)

        # Try same initialization strategies as main driver
        try:
            import undetected_chromedriver as uc
            return uc.Chrome(
                options=options, 
                headless=True,
                version_main=None,
                driver_executable_path=None
            )
        except Exception:
            try:
                from webdriver_manager.chrome import ChromeDriverManager
                from selenium.webdriver.chrome.service import Service
                
                service = Service(ChromeDriverManager().install())
                return webdriver.Chrome(service=service, options=options)
            except ImportError:
                return webdriver.Chrome(options=options)

    def _save_business_to_db(self, business_data, search_session_id):
        """Save a single business to the database (thread-safe)"""
        with self.db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cursor.execute('''
                    INSERT OR REPLACE INTO businesses (
                        business_name, business_type, category, address, location,
                        phone, website, has_website, rating, reviews, years_in_business,
                        maps_url, project_id, search_session_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    business_data['business_name'],
                    business_data['business_type'],
                    business_data['category'],
                    business_data['address'],
                    business_data['location'],
                    business_data['phone'],
                    business_data['website'],
                    business_data['has_website'],
                    business_data['rating'],
                    business_data['reviews'],
                    business_data['years_in_business'],
                    business_data['maps_url'],
                    business_data['project_id'],
                    search_session_id
                ))
                
                conn.commit()
                logger.debug(f"Saved business to database: {business_data['business_name']}")
                return cursor.lastrowid
                
            except sqlite3.Error as e:
                logger.error(f"Database error saving business: {e}")
                return None
            finally:
                conn.close()
    
    def _business_exists(self, maps_url):
        """Check if a business already exists in the database (thread-safe)"""
        with self.db_lock:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()
            
            try:
                cursor.execute('SELECT id FROM businesses WHERE maps_url = ?', (maps_url,))
                result = cursor.fetchone()
                return result is not None
            finally:
                conn.close()
    
    def _create_search_session(self, business_type, location):
        """Create a new search session and return its ID"""
        session_id = f"{business_type}_{location}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT INTO search_sessions (id, business_type, location)
                VALUES (?, ?, ?)
            ''', (session_id, business_type, location))
            
            conn.commit()
            logger.info(f"Created search session: {session_id}")
            return session_id
            
        except sqlite3.Error as e:
            logger.error(f"Database error creating search session: {e}")
            return None
        finally:
            conn.close()
    
    def _complete_search_session(self, session_id, total_businesses):
        """Mark a search session as completed"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE search_sessions 
                SET completed_at = CURRENT_TIMESTAMP, 
                    total_businesses = ?, 
                    status = 'completed'
                WHERE id = ?
            ''', (total_businesses, session_id))
            
            conn.commit()
            logger.info(f"Completed search session {session_id}: {total_businesses} businesses")
            
        except sqlite3.Error as e:
            logger.error(f"Database error completing search session: {e}")
        finally:
            conn.close()
    
    def _log_session_stats(self, session_id):
        """Log session statistics"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT COUNT(*) FROM businesses 
                WHERE search_session_id = ?
            ''', (session_id,))
            
            total_saved = cursor.fetchone()[0]
            
            logger.info(f"📊 Session Statistics:")
            logger.info(f"   • New businesses saved: {self.new_count}")
            logger.info(f"   • Duplicates skipped: {self.skipped_count}")
            logger.info(f"   • Total in database for session: {total_saved}")
            
        except sqlite3.Error as e:
            logger.error(f"Error getting session stats: {e}")
        finally:
            conn.close()
    
    def _save_checkpoint(self, session_id, business_index, total_businesses):
        """Save current progress for resuming later"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                INSERT OR REPLACE INTO scrape_metadata (key, value)
                VALUES (?, ?)
            ''', (f'checkpoint_{session_id}', f'{business_index}/{total_businesses}'))
            
            conn.commit()
            logger.debug(f"Checkpoint saved: {business_index}/{total_businesses}")
            
        except sqlite3.Error as e:
            logger.error(f"Database error saving checkpoint: {e}")
        finally:
            conn.close()
    
    def _get_checkpoint(self, session_id):
        """Get the last checkpoint for a session"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT value FROM scrape_metadata 
                WHERE key = ?
            ''', (f'checkpoint_{session_id}',))
            
            result = cursor.fetchone()
            if result:
                business_index, total_businesses = result[0].split('/')
                return int(business_index), int(total_businesses)
            return None, None
            
        except (sqlite3.Error, ValueError) as e:
            logger.error(f"Error getting checkpoint: {e}")
            return None, None
        finally:
            conn.close()
    
    def _clear_checkpoint(self, session_id):
        """Clear checkpoint after successful completion"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                DELETE FROM scrape_metadata 
                WHERE key = ?
            ''', (f'checkpoint_{session_id}',))
            
            conn.commit()
            logger.debug(f"Checkpoint cleared for session: {session_id}")
            
        except sqlite3.Error as e:
            logger.error(f"Error clearing checkpoint: {e}")
        finally:
            conn.close()
    
    def get_incomplete_sessions(self):
        """Get list of incomplete search sessions that can be resumed"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                SELECT id, business_type, location, started_at 
                FROM search_sessions 
                WHERE status = 'running'
                ORDER BY started_at DESC
            ''')
            
            sessions = cursor.fetchall()
            incomplete_sessions = []
            
            for session_id, business_type, location, started_at in sessions:
                # Check if there's a checkpoint
                checkpoint_idx, total_businesses = self._get_checkpoint(session_id)
                if checkpoint_idx is not None:
                    incomplete_sessions.append({
                        'session_id': session_id,
                        'business_type': business_type,
                        'location': location,
                        'started_at': started_at,
                        'progress': f"{checkpoint_idx}/{total_businesses}",
                        'completion_percent': round((checkpoint_idx / total_businesses) * 100, 1) if total_businesses > 0 else 0
                    })
            
            return incomplete_sessions
            
        except sqlite3.Error as e:
            logger.error(f"Error getting incomplete sessions: {e}")
            return []
        finally:
            conn.close()
    
    def enable_resume_mode(self, session_id):
        """Enable resume mode for a specific session"""
        self.resume_mode = True
        self.resume_session_id = session_id
        logger.info(f"Resume mode enabled for session: {session_id}")
    
    def export_to_csv(self, output_file="leads_export.csv", session_id=None, filter_criteria=None):
        """Export leads to CSV format with optional filtering"""
        conn = sqlite3.connect(self.db_path)
        
        # Build query based on filters
        query = "SELECT * FROM businesses"
        params = []
        
        where_clauses = []
        if session_id:
            where_clauses.append("search_session_id = ?")
            params.append(session_id)
            
        if filter_criteria:
            if filter_criteria == "no-website":
                where_clauses.append("has_website = 0")
            elif filter_criteria == "with-website":
                where_clauses.append("has_website = 1")
            elif filter_criteria == "high-rated":
                where_clauses.append("CAST(rating AS REAL) >= 4.0")
            elif filter_criteria == "with-phone":
                where_clauses.append("phone IS NOT NULL AND phone != ''")
        
        if where_clauses:
            query += " WHERE " + " AND ".join(where_clauses)
        
        query += " ORDER BY scraped_at DESC"
        
        try:
            df = pd.read_sql_query(query, conn, params=params)
            
            if df.empty:
                logger.warning("No data found matching the criteria")
                return False
            
            # Clean up and reorder columns for better presentation
            export_columns = [
                'business_name', 'phone', 'address', 'website', 'has_website',
                'rating', 'reviews', 'business_type', 'category', 'location',
                'years_in_business', 'maps_url', 'scraped_at'
            ]
            
            # Only include columns that exist
            available_columns = [col for col in export_columns if col in df.columns]
            df_export = df[available_columns]
            
            # Add a priority score
            df_export = self._add_priority_score(df_export)
            
            df_export.to_csv(output_file, index=False)
            logger.info(f"✅ Exported {len(df_export)} leads to {output_file}")
            
            return True
            
        except Exception as e:
            logger.error(f"Error exporting to CSV: {e}")
            return False
        finally:
            conn.close()
    
    def export_to_excel(self, output_file="leads_export.xlsx", session_id=None, filter_criteria=None):
        """Export leads to Excel format with multiple sheets and formatting"""
        if not EXCEL_EXPORT_AVAILABLE:
            logger.error("❌ Excel export requires pandas and openpyxl. Install with: pip install pandas openpyxl")
            return False
        
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Main query for all businesses
            query = "SELECT * FROM businesses"
            params = []
            
            where_clauses = []
            if session_id:
                where_clauses.append("search_session_id = ?")
                params.append(session_id)
                
            if filter_criteria:
                if filter_criteria == "no-website":
                    where_clauses.append("has_website = 0")
                elif filter_criteria == "with-website":
                    where_clauses.append("has_website = 1")
                elif filter_criteria == "high-rated":
                    where_clauses.append("CAST(rating AS REAL) >= 4.0")
                elif filter_criteria == "with-phone":
                    where_clauses.append("phone IS NOT NULL AND phone != ''")
            
            if where_clauses:
                query += " WHERE " + " AND ".join(where_clauses)
            
            query += " ORDER BY scraped_at DESC"
            
            df_all = pd.read_sql_query(query, conn, params=params)
            
            if df_all.empty:
                logger.warning("No data found matching the criteria")
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
                
                # Sheet 4: Summary Statistics
                summary_data = self._generate_summary_stats(df_all)
                summary_df = pd.DataFrame(list(summary_data.items()), columns=['Metric', 'Value'])
                summary_df.to_excel(writer, sheet_name='Summary', index=False)
                
                # Format the sheets
                self._format_excel_sheets(writer, [df_export, df_prime_export if not df_prime.empty else None, 
                                                  df_high_rated_export if not df_high_rated.empty else None])
            
            logger.info(f"✅ Exported {len(df_all)} leads to {output_file} with multiple sheets")
            return True
            
        except Exception as e:
            logger.error(f"Error exporting to Excel: {e}")
            return False
        finally:
            conn.close()
    
    def _add_priority_score(self, df):
        """Add a priority score column based on business criteria"""
        def calculate_priority(row):
            score = 0
            
            # High priority: No website
            if row.get('has_website') == 0:
                score += 50
            
            # Medium priority: High rating
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
            
            # Bonus: Has phone number
            if row.get('phone') and str(row.get('phone')).strip():
                score += 20
            
            # Bonus: Has reviews (shows engagement)
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
        
        # Add priority label
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
        """Prepare dataframe for export with clean column order and formatting"""
        export_columns = [
            'business_name', 'priority_label', 'priority_score', 'phone', 
            'address', 'website', 'has_website', 'rating', 'reviews', 
            'business_type', 'category', 'location', 'years_in_business', 
            'maps_url', 'scraped_at'
        ]
        
        # Add priority score
        df_clean = self._add_priority_score(df.copy())
        
        # Only include columns that exist
        available_columns = [col for col in export_columns if col in df_clean.columns]
        return df_clean[available_columns]
    
    def _generate_summary_stats(self, df):
        """Generate summary statistics for the export"""
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
        
        # Rating statistics
        rated_businesses = df[pd.to_numeric(df['rating'], errors='coerce').notna()]
        if not rated_businesses.empty:
            avg_rating = pd.to_numeric(rated_businesses['rating'], errors='coerce').mean()
            high_rated = len(rated_businesses[pd.to_numeric(rated_businesses['rating'], errors='coerce') >= 4.0])
            stats['Average Rating'] = f"{avg_rating:.1f}"
            stats['High Rated (4.0+)'] = f"{high_rated} ({high_rated/len(rated_businesses)*100:.1f}%)"
        
        # Prime prospects (no website + phone)
        prime_prospects = len(df[(df['has_website'] == 0) & 
                               (df['phone'].notna()) & 
                               (df['phone'] != '')])
        stats['Prime Prospects (No Website + Phone)'] = f"{prime_prospects} ({prime_prospects/total_businesses*100:.1f}%)"
        
        # Session information
        sessions = df['search_session_id'].nunique()
        stats['Number of Scraping Sessions'] = sessions
        
        latest_session = df['scraped_at'].max()
        stats['Latest Scraping Session'] = latest_session
        
        return stats
    
    def _format_excel_sheets(self, writer, dataframes):
        """Apply formatting to Excel sheets"""
        try:
            for sheet_name in writer.sheets:
                worksheet = writer.sheets[sheet_name]
                
                # Auto-adjust column widths
                for column in worksheet.columns:
                    max_length = 0
                    column_letter = column[0].column_letter
                    
                    for cell in column:
                        try:
                            if len(str(cell.value)) > max_length:
                                max_length = len(str(cell.value))
                        except:
                            pass
                    
                    adjusted_width = min(max_length + 2, 50)
                    worksheet.column_dimensions[column_letter].width = adjusted_width
                
                # Format header row
                if worksheet.max_row > 0:
                    for cell in worksheet[1]:
                        cell.font = openpyxl.styles.Font(bold=True)
                        cell.fill = openpyxl.styles.PatternFill(start_color="CCCCCC", 
                                                              end_color="CCCCCC", 
                                                              fill_type="solid")
        except Exception as e:
            logger.debug(f"Error formatting Excel sheets: {e}")
    
    def show_dashboard(self):
        """Display a comprehensive dashboard of lead generation statistics"""
        conn = sqlite3.connect(self.db_path)
        
        try:
            # Get overall statistics
            cursor = conn.cursor()
            
            # Total businesses
            cursor.execute("SELECT COUNT(*) FROM businesses")
            total_businesses = cursor.fetchone()[0]
            
            if total_businesses == 0:
                logger.info("📊 No leads found in database. Run some scraping sessions first!")
                return
            
            print("\n" + "="*60)
            print("📊 LEAD GENERATION DASHBOARD")
            print("="*60)
            
            # Basic statistics
            cursor.execute("SELECT COUNT(*) FROM businesses WHERE has_website = 0")
            no_website = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM businesses WHERE has_website = 1")
            with_website = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM businesses WHERE phone IS NOT NULL AND phone != ''")
            with_phone = cursor.fetchone()[0]
            
            cursor.execute("SELECT COUNT(*) FROM businesses WHERE has_website = 0 AND phone IS NOT NULL AND phone != ''")
            prime_prospects = cursor.fetchone()[0]
            
            print(f"🎯 Total Businesses: {total_businesses}")
            print(f"📞 With Phone Numbers: {with_phone} ({with_phone/total_businesses*100:.1f}%)")
            print(f"🌐 Without Websites: {no_website} ({no_website/total_businesses*100:.1f}%) ← YOUR PRIME TARGETS")
            print(f"⭐ With Websites: {with_website} ({with_website/total_businesses*100:.1f}%)")
            print(f"🔥 Prime Prospects (No Website + Phone): {prime_prospects} ({prime_prospects/total_businesses*100:.1f}%)")
            
            # Rating statistics
            cursor.execute("SELECT AVG(CAST(rating AS REAL)) FROM businesses WHERE rating IS NOT NULL AND rating != ''")
            avg_rating_result = cursor.fetchone()[0]
            if avg_rating_result:
                avg_rating = avg_rating_result
                cursor.execute("SELECT COUNT(*) FROM businesses WHERE CAST(rating AS REAL) >= 4.0")
                high_rated = cursor.fetchone()[0]
                print(f"⭐ Average Rating: {avg_rating:.1f}")
                print(f"🌟 High Rated (4.0+): {high_rated} ({high_rated/total_businesses*100:.1f}%)")
            
            # Session information
            cursor.execute("SELECT COUNT(DISTINCT search_session_id) FROM businesses")
            sessions = cursor.fetchone()[0]
            
            cursor.execute("SELECT search_session_id, COUNT(*) as count FROM businesses GROUP BY search_session_id ORDER BY MAX(scraped_at) DESC LIMIT 1")
            latest_session = cursor.fetchone()
            
            print(f"📅 Total Scraping Sessions: {sessions}")
            if latest_session:
                print(f"🕒 Latest Session: {latest_session[0]} ({latest_session[1]} businesses)")
            
            print("\n" + "-"*60)
            print("💡 TOP OPPORTUNITIES")
            print("-"*60)
            
            # Show top prospects
            cursor.execute("""
                SELECT business_name, phone, rating, reviews, address
                FROM businesses 
                WHERE has_website = 0 AND phone IS NOT NULL AND phone != ''
                ORDER BY CAST(rating AS REAL) DESC, CAST(reviews AS INTEGER) DESC
                LIMIT 5
            """)
            
            top_prospects = cursor.fetchall()
            for i, (name, phone, rating, reviews, address) in enumerate(top_prospects, 1):
                rating_display = f"{rating}⭐" if rating else "No rating"
                reviews_display = f"({reviews} reviews)" if reviews else "(No reviews)"
                
                print(f"{i}. {name}")
                print(f"   📞 {phone} | {rating_display} {reviews_display}")
                print(f"   📍 {address}")
                print()
            
            print("-"*60)
            print("📈 BUSINESS TYPE BREAKDOWN")
            print("-"*60)
            
            # Business type breakdown
            cursor.execute("""
                SELECT business_type, COUNT(*) as count,
                       SUM(CASE WHEN has_website = 0 THEN 1 ELSE 0 END) as no_website_count
                FROM businesses 
                GROUP BY business_type 
                ORDER BY count DESC
                LIMIT 10
            """)
            
            type_breakdown = cursor.fetchall()
            for business_type, count, no_website_count in type_breakdown:
                print(f"• {business_type}: {count} total, {no_website_count} without websites")
            
            print("\n" + "-"*60)
            print("🗓️ RECENT ACTIVITY")
            print("-"*60)
            
            # Recent sessions
            cursor.execute("""
                SELECT s.id, s.business_type, s.location, s.total_businesses, s.started_at
                FROM search_sessions s
                ORDER BY s.started_at DESC
                LIMIT 5
            """)
            
            recent_sessions = cursor.fetchall()
            for session_id, btype, location, total, started_at in recent_sessions:
                session_short = session_id.split('_')[-1] if '_' in session_id else session_id
                print(f"• {started_at}: {btype} in {location} ({total} businesses) - {session_short}")
            
            print("\n" + "="*60)
            print("💼 NEXT STEPS")
            print("="*60)
            print("1. Export prime prospects: --export --format excel --filter no-website")
            print("2. Review and prioritize leads in Excel")
            print("3. Start manual outreach to test messaging")
            print("4. Build outreach automation once messaging is proven")
            print("="*60 + "\n")
            
        except Exception as e:
            logger.error(f"Error generating dashboard: {e}")
        finally:
            conn.close()
     
    def list_sessions_detailed(self):
         """Show detailed information about all scraping sessions"""
         conn = sqlite3.connect(self.db_path)
         
         try:
             cursor = conn.cursor()
             
             # Get all sessions with statistics
             cursor.execute("""
                 SELECT s.id, s.business_type, s.location, s.started_at, s.completed_at, 
                        s.total_businesses, s.status,
                        COUNT(b.id) as actual_businesses,
                        SUM(CASE WHEN b.has_website = 0 THEN 1 ELSE 0 END) as no_website_count,
                        SUM(CASE WHEN b.phone IS NOT NULL AND b.phone != '' THEN 1 ELSE 0 END) as phone_count
                 FROM search_sessions s
                 LEFT JOIN businesses b ON s.id = b.search_session_id
                 GROUP BY s.id
                 ORDER BY s.started_at DESC
             """)
             
             sessions = cursor.fetchall()
             
             if not sessions:
                 logger.info("📋 No scraping sessions found.")
                 return
             
             print("\n" + "="*80)
             print("📋 SCRAPING SESSIONS OVERVIEW")
             print("="*80)
             
             for session_data in sessions:
                 (session_id, btype, location, started, completed, planned_total, 
                  status, actual_total, no_website, phone_count) = session_data
                 
                 status_icon = "✅" if status == "completed" else "🔄" if status == "running" else "❌"
                 
                 print(f"\n{status_icon} {session_id}")
                 print(f"   📍 {btype} in {location}")
                 print(f"   🕒 Started: {started}")
                 if completed:
                     print(f"   ✅ Completed: {completed}")
                 print(f"   📊 Businesses: {actual_total} collected")
                 if no_website:
                     print(f"   🎯 Prime Prospects: {no_website} without websites")
                 if phone_count:
                     print(f"   📞 Contactable: {phone_count} with phone numbers")
                 
                 # Check for incomplete sessions
                 if status == "running":
                     incomplete_sessions = self.get_incomplete_sessions()
                     for inc_session in incomplete_sessions:
                         if inc_session['session_id'] == session_id:
                             print(f"   ⚠️  Progress: {inc_session['progress']} ({inc_session['completion_percent']}%)")
                             print(f"   💡 Resume with: --resume {session_id}")
                             break
             
             print("\n" + "="*80 + "\n")
             
         except Exception as e:
             logger.error(f"Error listing sessions: {e}")
         finally:
             conn.close()
         
    def search_businesses(self, business_type, location):
        """Search for businesses of a specific type in a given location"""
        query = f"{business_type} in {location}"
        logger.info(f"Searching for: {query}")
        
        # Create search session
        session_id = self._create_search_session(business_type, location)
        if not session_id:
            logger.error("Failed to create search session")
            return
        
        self._safe_get("https://www.google.com/maps")
        # Page loads are handled by wait.until below
        
        # Enter search query
        try:
            search_box = self.wait.until(EC.presence_of_element_located((By.ID, "searchboxinput")))
            search_box.clear()
            search_box.send_keys(query)
            search_box.send_keys(Keys.ENTER)
            
            # Wait for results to load
            wait = WebDriverWait(self.driver, 10)
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='article']")))
            
            # Scroll to load more results
            self._scroll_results()
            
            # Extract business data
            total_businesses = self._extract_business_data(business_type, location, session_id)
            
            # Log session statistics
            self._log_session_stats(session_id)
            
            # Complete the search session
            self._complete_search_session(session_id, total_businesses)
            
            # Clear checkpoint after successful completion
            self._clear_checkpoint(session_id)
            
        except Exception as e:
            logger.error(f"Error during search: {e}")
            # Try to recover by restarting driver
            logger.info("🔄 Attempting to recover from error...")
            try:
                self.driver.quit()
            except:
                pass
            
            try:
                # Reinitialize driver and try once more
                self.setup_driver(headless=True)
                logger.info("✅ Driver recovered, attempting search again...")
                
                # Retry the search one more time
                self._safe_get("https://www.google.com/maps")
                search_box = self.wait.until(EC.presence_of_element_located((By.ID, "searchboxinput")))
                search_box.clear()
                search_box.send_keys(query)
                search_box.send_keys(Keys.ENTER)
                
                wait = WebDriverWait(self.driver, 10)
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='article']")))
                
                self._scroll_results()
                total_businesses = self._extract_business_data(business_type, location, session_id)
                self._log_session_stats(session_id)
                self._complete_search_session(session_id, total_businesses)
                self._clear_checkpoint(session_id)
                
            except Exception as recovery_error:
                logger.error(f"❌ Recovery attempt failed: {recovery_error}")
                # Mark session as failed
                try:
                    conn = sqlite3.connect(self.db_path)
                    cursor = conn.cursor()
                    cursor.execute('''
                        UPDATE search_sessions 
                        SET status = 'failed', completed_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (session_id,))
                    conn.commit()
                    conn.close()
                except:
                    pass
        
    def _scroll_results(self):
        """Scroll through the results panel to load more businesses"""
        try:
            results_panel = self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "div[role='feed']"))) 
            
            # Count initial results
            initial_results = len(self._safe_find_elements(By.CSS_SELECTOR, "div[role='article']"))
            logger.info(f"Initial result count: {initial_results}")
            
            # Scroll several times to load more results
            scroll_count = 0
            max_scrolls = 10  # Increase this for more results
            last_count = initial_results
            
            while scroll_count < max_scrolls:
                # Get current count before scrolling
                current_results = len(self._safe_find_elements(By.CSS_SELECTOR, "div[role='article']"))
                
                # Scroll down
                self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", results_panel)
                
                # Wait for new content to load instead of fixed sleep
                wait = WebDriverWait(self.driver, 3)
                try:
                    # Wait for either new results or stable state
                    wait.until(lambda driver: len(driver.find_elements(By.CSS_SELECTOR, "div[role='article']")) != current_results)
                except TimeoutException:
                    # If no new content loads, continue anyway
                    logger.debug("No new content loaded after scrolling")
                    pass
                
                # Count results after scrolling
                new_results = len(self._safe_find_elements(By.CSS_SELECTOR, "div[role='article']"))
                logger.info(f"After scroll {scroll_count+1}: {new_results} results")
                
                # If no new results after 2 consecutive scrolls, break
                if new_results == last_count:
                    scroll_count += 1
                else:
                    scroll_count = 0  # Reset if we found new results
                    
                last_count = new_results
                
        except (TimeoutException, NoSuchElementException) as e:
            logger.error(f"Error while scrolling: {e}")
    
    def _extract_business_data(self, business_type, location, session_id):
        """Extract business information from the results panel using concurrent processing"""
        start_time = time.time()
        
        try:
            # First capture the listing URLs to avoid stale element references
            business_elements = self._safe_find_elements(By.CSS_SELECTOR, "div[role='article']")
            logger.info(f"Found {len(business_elements)} business listings")
            
            # Get the Google Maps URLs for each business first
            business_urls = []
            for i, element in enumerate(business_elements):
                try:
                    # Get the clickable area that contains the link
                    clickable = element.find_element(By.CSS_SELECTOR, "a[href^='https://www.google.com/maps/place']") 
                    maps_url = clickable.get_attribute("href")
                    business_urls.append({
                        "index": i,
                        "maps_url": maps_url
                    })
                except Exception as e:
                    logger.warning(f"Could not get URL for business {i}: {e}")
            
            logger.info(f"Successfully extracted {len(business_urls)} Google Maps URLs")
            
            if not business_urls:
                logger.warning("No business URLs found to process")
                return 0
            
            # Process businesses concurrently
            logger.info(f"🚀 Starting concurrent processing with {self.max_workers} workers")
            processed_count = 0
            
            with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
                # Submit all business processing tasks
                future_to_business = {
                    executor.submit(
                        self._process_single_business_threaded, 
                        business_url, business_type, location, session_id
                    ): business_url for business_url in business_urls
                }
                
                # Process completed tasks as they finish
                for future in as_completed(future_to_business):
                    business_url = future_to_business[future]
                    try:
                        result = future.result()
                        if result:
                            processed_count += 1
                            
                        # Save checkpoint for progress tracking
                        self._save_checkpoint(session_id, processed_count, len(business_urls))
                        
                        # Log progress
                        if processed_count % 5 == 0 or processed_count == len(business_urls):
                            elapsed = time.time() - start_time
                            rate = processed_count / elapsed if elapsed > 0 else 0
                            logger.info(f"📊 Progress: {processed_count}/{len(business_urls)} ({processed_count/len(business_urls)*100:.1f}%) | Rate: {rate:.1f} businesses/sec")
                            
                    except Exception as e:
                        logger.error(f"Error processing business {business_url['index']}: {e}")
                        continue
            
            # Final statistics
            elapsed = time.time() - start_time
            avg_rate = processed_count / elapsed if elapsed > 0 else 0
            
            logger.info(f"🎯 Concurrent processing completed:")
            logger.info(f"   • Processed: {processed_count}/{len(business_urls)} businesses")
            logger.info(f"   • Time: {elapsed:.1f} seconds")
            logger.info(f"   • Average rate: {avg_rate:.1f} businesses/sec")
            logger.info(f"   • Workers used: {self.max_workers}")
            
            return processed_count
                    
        except Exception as e:
            logger.error(f"Error extracting business data: {e}")
            return 0
    
    def _get_text_from_element(self, parent, selector, by=By.CSS_SELECTOR):
        """Get text from an element within a parent element"""
        try:
            element = parent.find_element(by, selector)
            return element.text
        except (NoSuchElementException, StaleElementReferenceException):
            return ""
    
    def _get_text_if_exists(self, selector):
        """Safely extract text from an element if it exists"""
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, selector)
            return element.text
        except NoSuchElementException:
            return ""
    
    def _get_href_if_exists(self, selector):
        """Safely extract href attribute from an element if it exists"""
        try:
            element = self.driver.find_element(By.CSS_SELECTOR, selector)
            return element.get_attribute("href")
        except NoSuchElementException:
            return ""
    
    def save_results(self, filename):
        """Save the scraped results to a CSV file"""
        if not self.results:
            logger.warning("No results to save.")
            return
            
        os.makedirs(os.path.dirname(filename), exist_ok=True)
        
        with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = [
                "business_name", "business_type", "category", "address", "location", 
                "phone", "website", "has_website", "maps_url", "rating", 
                "reviews", "years_in_business", "scraped_date"
            ]
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            
            writer.writeheader()
            for business in self.results:
                writer.writerow(business)
        
        logger.info(f"Saved {len(self.results)} businesses to {filename}")
        logger.info(f"Businesses without websites: {sum(1 for b in self.results if not b['has_website'])}")
    
    def close(self):
        """Close the WebDriver"""
        if hasattr(self, 'driver'):
            self.driver.quit()

    # ────────────────────────────────────────────────────────────────────────
    def _save_profile(self, business_dict):
        """Serialize a single business dict to JSON in data/profiles/"""
        os.makedirs("../data/profiles", exist_ok=True)

        # build slugs
        loc_slug  = business_dict["location"].lower().replace(" ", "_").replace(",", "")
        type_slug = business_dict["business_type"].lower().replace(" ", "_")

        # assign a unique id
        profile_id = str(uuid.uuid4())
        business_dict["profile_id"] = profile_id

        # write full profile
        profile_path = f"../data/profiles/{loc_slug}__{type_slug}__{profile_id}.json"
        with open(profile_path, "w", encoding="utf-8") as f:
            json.dump(business_dict, f, ensure_ascii=False, indent=2)

        return profile_id

    def _update_index(self, brief):
        """Append a summary entry to data/profiles/index.json"""
        idx_path = "../data/profiles/index.json"
        try:
            with open(idx_path, "r", encoding="utf-8") as f:
                index = json.load(f)
        except FileNotFoundError:
            index = []
        index.append(brief)
        with open(idx_path, "w", encoding="utf-8") as f:
            json.dump(index, f, ensure_ascii=False, indent=2)

    def _init_conversation(self, profile_id):
        """Create an empty conversation thread JSON for this profile"""
        conv_dir = "../data/conversations"
        os.makedirs(conv_dir, exist_ok=True)
        conv_file = f"{conv_dir}/{profile_id}.json"
        with open(conv_file, "w", encoding="utf-8") as f:
            json.dump([], f)
    # ────────────────────────────────────────────────────────────────────────

    def _get_text_if_exists_with_driver(self, driver, selector):
        """Get text from element using a specific driver instance"""
        try:
            element = driver.find_element(By.CSS_SELECTOR, selector)
            return element.text
        except (NoSuchElementException, StaleElementReferenceException):
            return ""
    
    def _get_href_if_exists_with_driver(self, driver, selector):
        """Get href attribute from element using a specific driver instance"""
        try:
            element = driver.find_element(By.CSS_SELECTOR, selector)
            return element.get_attribute("href")
        except (NoSuchElementException, StaleElementReferenceException):
            return ""


def create_cli_parser():
    """Create command-line argument parser"""
    parser = argparse.ArgumentParser(
        description="Google Maps Business Scraper with Database Persistence",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Basic scraping
  python google_maps_scraper.py --business-type "restaurants" --location "Brunswick, ME"
  
  # Resume interrupted session
  python google_maps_scraper.py --list-sessions
  python google_maps_scraper.py --resume SESSION_ID
  
  # Force refresh existing businesses
  python google_maps_scraper.py --business-type "restaurants" --location "Brunswick, ME" --force-refresh
  
  # Custom database and verbose logging
  python google_maps_scraper.py --business-type "cafes" --location "Portland, ME" --db-path "my_scraper.db" --log-level DEBUG
        """
    )
    
    # Primary arguments
    parser.add_argument('--business-type', '-t', type=str, 
                       help='Type of business to search for (e.g., "restaurants", "plumbers")')
    parser.add_argument('--location', '-l', type=str,
                       help='Location to search in (e.g., "Brunswick, ME", "Portland, Maine")')
    
    # Database options
    parser.add_argument('--db-path', type=str, default="scraper_results.db",
                       help='Path to SQLite database file (default: scraper_results.db)')
    parser.add_argument('--force-refresh', action='store_true',
                       help='Re-scrape businesses even if they already exist in database')
    
    # Resume functionality
    parser.add_argument('--list-sessions', action='store_true',
                       help='List incomplete sessions that can be resumed')
    parser.add_argument('--resume', type=str, metavar='SESSION_ID',
                       help='Resume an incomplete session by ID')
    
    # Export and dashboard functionality  
    parser.add_argument('--export', action='store_true',
                       help='Export leads to file')
    parser.add_argument('--format', choices=['csv', 'excel'], default='csv',
                       help='Export format (default: csv)')
    parser.add_argument('--filter', choices=['no-website', 'with-website', 'high-rated', 'with-phone'],
                       help='Filter criteria for export')
    parser.add_argument('--output', type=str, metavar='FILENAME',
                       help='Output filename for export')
    parser.add_argument('--session', type=str, metavar='SESSION_ID',
                       help='Export data from specific session only')
    parser.add_argument('--dashboard', action='store_true',
                       help='Show lead generation dashboard')
    parser.add_argument('--sessions', action='store_true',
                       help='Show detailed session information')
    
    # Performance options
    parser.add_argument('--max-workers', type=int, default=3, metavar='N',
                       help='Maximum number of concurrent worker threads (default: 3)')
    parser.add_argument('--rate-limit', type=float, default=2.0, metavar='RATE',
                       help='Rate limit in requests per second (default: 2.0)')
    
    # Output options
    parser.add_argument('--headless', action='store_true', default=True,
                       help='Run browser in headless mode (default: True)')
    parser.add_argument('--show-browser', action='store_true',
                       help='Show browser window (opposite of headless)')
    parser.add_argument('--log-level', choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'], 
                       default='INFO', help='Set logging level (default: INFO)')
    
    # Outreach options
    parser.add_argument('--outreach', action='store_true',
                       help='Run outreach campaign')
    parser.add_argument('--channel', choices=['email', 'sms'],
                       help='Outreach channel (email or SMS)')
    parser.add_argument('--template', type=str,
                       help='Template name from outreach_config.yaml')
    parser.add_argument('--segment', choices=['prime_prospects', 'no_website', 'high_rated', 'all_not_contacted'],
                       default='prime_prospects', help='Which leads to target')
    parser.add_argument('--dry-run', action='store_true',
                       help='Preview messages without sending (practice mode)')
    parser.add_argument('--limit', type=int, metavar='N',
                       help='Maximum number of messages to send')
    parser.add_argument('--delay', type=float, metavar='SECONDS',
                       help='Delay between messages (overrides config)')
    parser.add_argument('--outreach-stats', action='store_true',
                       help='Show outreach campaign statistics')
    
    # Validation options
    parser.add_argument('--validate', action='store_true',
                       help='Validate phone numbers and enrich lead data')
    parser.add_argument('--validate-segment', choices=['prime_prospects', 'no_website', 'high_rated', 'all'],
                       default='all', help='Which leads to validate')
    parser.add_argument('--validation-delay', type=float, default=0.5, metavar='SECONDS',
                       help='Delay between validation API calls (default: 0.5)')
    
    # Email validation options
    parser.add_argument('--validate-emails', action='store_true',
                       help='Validate and discover email addresses for leads')
    parser.add_argument('--email-segment', choices=['prime_prospects', 'no_website', 'high_rated', 'all'],
                       default='all', help='Which leads to validate emails for')
    parser.add_argument('--email-discovery', action='store_true',
                       help='Enable email discovery for businesses without emails')
    
    return parser

def main():
    """Main CLI entry point"""
    parser = create_cli_parser()
    args = parser.parse_args()
    
    # Configure logging level
    logging.getLogger().setLevel(getattr(logging, args.log_level))
    
    # Validate concurrency parameters
    if args.max_workers < 1 or args.max_workers > 10:
        logger.error("❌ --max-workers must be between 1 and 10")
        return
    
    if args.rate_limit <= 0 or args.rate_limit > 10:
        logger.error("❌ --rate-limit must be between 0.1 and 10.0 requests/sec")
        return
    
    # Determine headless mode
    headless = args.headless and not args.show_browser
    
    try:
        scraper = GoogleMapsScraper(
            headless=headless, 
            db_path=args.db_path,
            force_refresh=args.force_refresh,
            max_workers=args.max_workers,
            rate_limit=args.rate_limit
        )
        
        # Handle dashboard
        if args.dashboard:
            scraper.show_dashboard()
            return
        
        # Handle detailed sessions view
        if args.sessions:
            scraper.list_sessions_detailed()
            return
        
        # Handle export
        if args.export:
            if args.format == 'excel':
                output_file = args.output or "leads_export.xlsx"
                success = scraper.export_to_excel(output_file, args.session, args.filter)
            else:
                output_file = args.output or "leads_export.csv"
                success = scraper.export_to_csv(output_file, args.session, args.filter)
            
            if success:
                logger.info(f"✅ Export completed successfully: {output_file}")
            else:
                logger.error("❌ Export failed")
            return
        
        # Handle outreach
        if args.outreach:
            # Import outreach manager
            try:
                from outreach_manager import OutreachManager
            except ImportError:
                logger.error("❌ Could not import OutreachManager. Make sure outreach_manager.py is in the same directory.")
                return
            
            # Validate required arguments
            if not args.channel or not args.template:
                logger.error("❌ --channel and --template are required for outreach")
                logger.info("💡 Example: --outreach --channel email --template cold_email_v1")
                return
            
            # Initialize outreach manager
            outreach = OutreachManager(
                config_path="outreach_config.yaml",
                db_path=args.db_path,
                dry_run=args.dry_run
            )
            
            # Run campaign
            logger.info(f"{'🔍 DRY RUN' if args.dry_run else '🚀 LIVE'} OUTREACH CAMPAIGN")
            outreach.run_campaign(
                channel=args.channel,
                template_name=args.template,
                segment=args.segment,
                limit=args.limit,
                delay=args.delay
            )
            return
        
        # Handle outreach statistics
        if args.outreach_stats:
            try:
                from outreach_manager import OutreachManager
                outreach = OutreachManager(db_path=args.db_path)
                stats = outreach.get_campaign_stats()
                
                print("\n" + "="*60)
                print("📊 OUTREACH CAMPAIGN STATISTICS")
                print("="*60)
                print(f"📋 Total Businesses: {stats['total_businesses']}")
                print(f"✅ Contacted: {stats['contacted']}")
                print(f"💬 Responded: {stats['responded']}")
                
                if stats['by_channel']:
                    print("\n📱 By Channel:")
                    for channel, data in stats['by_channel'].items():
                        print(f"   {channel.upper()}:")
                        print(f"     • Attempts: {data['attempts']}")
                        print(f"     • Sent: {data['sent']}")
                        print(f"     • Failed: {data['failed']}")
                
                print("="*60 + "\n")
            except ImportError:
                logger.error("❌ Could not import OutreachManager")
            return
        
        # Handle validation
        if args.validate:
            if not VALIDATION_AVAILABLE:
                logger.error("❌ Validation module not available. Make sure validation.py is in the parent directory.")
                return
            
            logger.info("🔍 Starting lead validation and enrichment...")
            
            # Load leads based on segment
            conn = sqlite3.connect(args.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Build query based on segment
            base_query = "SELECT * FROM businesses"
            where_clauses = []
            
            if args.validate_segment == "prime_prospects":
                where_clauses.append("has_website = 0")
                where_clauses.append("phone IS NOT NULL")
                where_clauses.append("phone != ''")
            elif args.validate_segment == "no_website":
                where_clauses.append("has_website = 0")
            elif args.validate_segment == "high_rated":
                where_clauses.append("CAST(rating AS REAL) >= 4.0")
            # 'all' has no additional filters
            
            if where_clauses:
                base_query += " WHERE " + " AND ".join(where_clauses)
            
            cursor.execute(base_query)
            leads = [dict(row) for row in cursor.fetchall()]
            
            if not leads:
                logger.warning(f"No leads found for segment: {args.validate_segment}")
                conn.close()
                return
            
            logger.info(f"Found {len(leads)} leads to validate")
            
            # Initialize validator
            validator = PhoneValidator(dry_run=args.dry_run)
            enricher = LeadEnricher(dry_run=args.dry_run)
            
            # Process leads
            validated_count = 0
            for i, lead in enumerate(leads):
                if lead.get('phone'):
                    logger.info(f"🔍 Validating {lead['business_name']} ({i+1}/{len(leads)})")
                    
                    # Enrich the lead
                    enriched = enricher.enrich_lead(lead)
                    
                    # Update database with validation results
                    cursor.execute('''
                        UPDATE businesses 
                        SET phone_valid = ?, phone_formatted = ?, phone_carrier = ?, 
                            phone_country = ?, phone_line_type = ?, phone_error = ?,
                            email_format_valid = ?, email_discovered = ?, validation_date = CURRENT_TIMESTAMP
                        WHERE id = ?
                    ''', (
                        enriched.get('phone_valid'),
                        enriched.get('phone_formatted'),
                        enriched.get('phone_carrier'),
                        enriched.get('phone_country'),
                        enriched.get('phone_line_type'),
                        enriched.get('phone_error'),
                        enriched.get('email_format_valid'),
                        enriched.get('email_discovered'),
                        lead['id']
                    ))
                    
                    if enriched.get('phone_valid'):
                        validated_count += 1
                    
                    # Rate limiting
                    if i < len(leads) - 1:
                        time.sleep(args.validation_delay)
                else:
                    logger.debug(f"Skipping {lead['business_name']} - no phone number")
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Validation complete: {validated_count}/{len(leads)} valid phone numbers")
            return
        
        # Handle email validation
        if args.validate_emails:
            if not VALIDATION_AVAILABLE:
                logger.error("❌ Email validation module not available. Make sure email_validator.py is in the parent directory.")
                return
            
            logger.info("📧 Starting email validation and discovery...")
            
            # Load leads based on segment
            conn = sqlite3.connect(args.db_path)
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            
            # Build query based on segment
            base_query = "SELECT * FROM businesses"
            where_clauses = []
            
            if args.email_segment == "prime_prospects":
                where_clauses.append("has_website = 0")
                where_clauses.append("phone IS NOT NULL")
                where_clauses.append("phone != ''")
            elif args.email_segment == "no_website":
                where_clauses.append("has_website = 0")
            elif args.email_segment == "high_rated":
                where_clauses.append("CAST(rating AS REAL) >= 4.0")
            # 'all' has no additional filters
            
            if where_clauses:
                base_query += " WHERE " + " AND ".join(where_clauses)
            
            cursor.execute(base_query)
            leads = [dict(row) for row in cursor.fetchall()]
            
            if not leads:
                logger.warning(f"No leads found for segment: {args.email_segment}")
                conn.close()
                return
            
            logger.info(f"Found {len(leads)} leads to process for email validation")
            
            # Initialize email enricher
            email_enricher = EmailEnricher(dry_run=args.dry_run)
            
            # Process leads
            valid_emails_count = 0
            discovered_emails_count = 0
            
            for i, lead in enumerate(leads):
                logger.info(f"📧 Processing {lead['business_name']} ({i+1}/{len(leads)})")
                
                # Enrich with email validation and discovery
                enriched = email_enricher.enrich_lead_emails(lead)
                
                # Update database with email validation results
                cursor.execute('''
                    UPDATE businesses 
                    SET email_valid = ?, email_confidence_score = ?, email_type = ?, 
                        email_risk_score = ?, email_mx_valid = ?, email_is_disposable = ?,
                        email_discovery_source = ?, email_discovery_confidence = ?, 
                        email_enrichment_date = CURRENT_TIMESTAMP
                    WHERE id = ?
                ''', (
                    enriched.get('email_valid'),
                    enriched.get('email_confidence_score'),
                    enriched.get('email_type'),
                    enriched.get('email_risk_score'),
                    enriched.get('email_mx_valid'),
                    enriched.get('email_is_disposable'),
                    enriched.get('email_discovery_source'),
                    enriched.get('email_discovery_confidence'),
                    lead['id']
                ))
                
                # Update email field if discovered
                if enriched.get('email_discovered') and not lead.get('email'):
                    cursor.execute('UPDATE businesses SET email = ? WHERE id = ?', 
                                 (enriched['email_discovered'], lead['id']))
                    discovered_emails_count += 1
                
                if enriched.get('email_valid'):
                    valid_emails_count += 1
                
                # Show progress
                if enriched.get('email_valid'):
                    logger.info(f"   ✅ Valid email: {enriched.get('email', 'N/A')} (confidence: {enriched.get('email_confidence_score', 0)})")
                elif enriched.get('email_discovered'):
                    logger.info(f"   🔍 Discovered: {enriched['email_discovered']} (confidence: {enriched.get('email_discovery_confidence', 0)})")
                else:
                    logger.info(f"   ❌ No valid email found")
            
            conn.commit()
            conn.close()
            
            logger.info(f"✅ Email processing complete:")
            logger.info(f"   • Valid emails: {valid_emails_count}/{len(leads)}")
            logger.info(f"   • Discovered emails: {discovered_emails_count}")
            return
        
        # Handle list sessions
        if args.list_sessions:
            sessions = scraper.get_incomplete_sessions()
            if sessions:
                logger.info("📋 Incomplete Sessions:")
                for session in sessions:
                    logger.info(f"   • {session['session_id']}")
                    logger.info(f"     Type: {session['business_type']}, Location: {session['location']}")
                    logger.info(f"     Progress: {session['progress']} ({session['completion_percent']}%)")
                    logger.info(f"     Started: {session['started_at']}")
                    logger.info("")
            else:
                logger.info("✅ No incomplete sessions found")
            return
        
        # Handle resume
        if args.resume:
            logger.info(f"🔄 Resuming session: {args.resume}")
            scraper.enable_resume_mode(args.resume)
            # For now, user needs to provide business_type and location again
            # In a future version, we could store these in the session
            if not args.business_type or not args.location:
                logger.error("❌ --business-type and --location are required when resuming")
                return
        
        # Validate required arguments for scraping
        if not args.business_type or not args.location:
            if not args.list_sessions and not args.resume:
                logger.error("❌ --business-type and --location are required for scraping")
                logger.info("💡 Use --help for usage examples")
                return
        
        # Start scraping
        if args.business_type and args.location:
            logger.info(f"🚀 Starting scraper...")
            logger.info(f"   • Business Type: {args.business_type}")
            logger.info(f"   • Location: {args.location}")
            logger.info(f"   • Database: {args.db_path}")
            logger.info(f"   • Force Refresh: {args.force_refresh}")
            logger.info(f"   • Headless Mode: {headless}")
            logger.info(f"   • Max Workers: {args.max_workers}")
            logger.info(f"   • Rate Limit: {args.rate_limit} req/sec")
            
            scraper.search_businesses(args.business_type, args.location)
            
            logger.info("✅ Scraping completed successfully!")
    
    except KeyboardInterrupt:
        logger.info("🛑 Scraping interrupted by user")
    except Exception as e:
        logger.error(f"❌ Scraping failed: {e}")
        raise
    finally:
        try:
            scraper.close()
        except:
            pass

if __name__ == "__main__":
    main()
