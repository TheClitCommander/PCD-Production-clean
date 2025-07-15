#!/usr/bin/env python3
"""
Simple Google Maps Business Scraper
----------------------------------
A streamlined scraper that:
1. Captures ALL businesses whether they have a website or not
2. Gets name, phone, address, website, rating, reviews and maps URL
3. Uses reliable selectors and explicit waits to avoid errors
"""

import os
import csv
import time
import random
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

def setup_driver(headless=False):
    """Configure and initialize Chrome WebDriver with anti-detection measures"""
    options = Options()
    if headless:
        options.add_argument("--headless=new")  # New headless mode
    
    # Anti-detection measures
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--disable-blink-features=AutomationControlled")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--start-maximized")
    
    # Set a realistic user agent
    options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36")
    
    # Disable images for faster loading (optional)
    # options.add_experimental_option("prefs", {"profile.managed_default_content_settings.images": 2})
    
    return webdriver.Chrome(options=options)

def scrape_google_maps(search_query, output_file, headless=False, max_results=30):
    """Main function to scrape Google Maps for businesses"""
    print(f"Starting scrape for: {search_query}")
    print(f"Headless mode: {'On' if headless else 'Off'}")
    
    driver = setup_driver(headless)
    wait = WebDriverWait(driver, 10)
    results = []
    
    try:
        # Step 1: Navigate to Google Maps
        print("Opening Google Maps...")
        driver.get("https://www.google.com/maps")
        time.sleep(3)  # Wait for page to fully load
        
        # Step 2: Enter search query
        print(f"Searching for: {search_query}")
        search_box = wait.until(EC.presence_of_element_located((By.ID, "searchboxinput")))
        search_box.clear()
        search_box.send_keys(search_query)
        search_box.send_keys(Keys.ENTER)
        time.sleep(3)  # Wait for search results
        
        # Step 3: Ensure we're in the "Places" tab (not the map view)
        try:
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='feed']")))
            print("Listing view detected")
        except TimeoutException:
            print("Listing view not found, checking for place details view...")
            try:
                # If we landed directly on a business page, go back to results
                back_button = driver.find_element(By.CSS_SELECTOR, "button[jsaction='pane.back']")
                back_button.click()
                time.sleep(2)
                wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='feed']")))
                print("Navigated to listing view")
            except:
                print("Could not find listing view")
                return results
        
        # Step 4: Scroll to load more results
        print("Scrolling to load results...")
        scroll_and_collect_listings(driver, wait, results, max_results)
        
        # Step 5: Save results
        if results:
            print(f"Saving {len(results)} businesses to {output_file}")
            save_to_csv(results, output_file)
            print(f"Businesses without websites: {sum(1 for b in results if not b.get('has_website', False))}")
        else:
            print("No results found to save")
            
    except WebDriverException as e:
        print(f"Browser error: {e}")
    except Exception as e:
        print(f"Error: {e}")
    finally:
        print("Closing browser")
        driver.quit()
        
    return results

def scroll_and_collect_listings(driver, wait, results, max_results=30):
    """Scroll through results and collect business data"""
    scroll_pause_time = 2
    
    try:
        # Find the scrollable container
        scrollable = wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, "div[role='feed']")))
        
        # Initial count of listings
        listings = driver.find_elements(By.CSS_SELECTOR, "div[role='article']")
        print(f"Initial listings found: {len(listings)}")
        
        # If no listings found, try alternative selector
        if not listings:
            listings = driver.find_elements(By.CSS_SELECTOR, ".Nv2PK")
            print(f"Using alternative selector, found: {len(listings)}")
        
        # If still no listings, try another alternative
        if not listings:
            listings = driver.find_elements(By.CSS_SELECTOR, ".a4gq8e-aVTXAb-haAclf-jRmmHf-hSRGPd")
            print(f"Using second alternative selector, found: {len(listings)}")
            
        # Continue scrolling until we have enough results or stop finding new ones
        previous_count = 0
        no_new_results_count = 0
        
        while len(results) < max_results and no_new_results_count < 3:
            # Process visible listings
            listings = driver.find_elements(By.CSS_SELECTOR, "div[role='article']")
            if not listings:
                listings = driver.find_elements(By.CSS_SELECTOR, ".Nv2PK")
            if not listings:
                listings = driver.find_elements(By.CSS_SELECTOR, ".a4gq8e-aVTXAb-haAclf-jRmmHf-hSRGPd")
                
            # Process only new listings we haven't seen yet
            start_idx = previous_count
            end_idx = min(len(listings), start_idx + 5)  # Process 5 at a time
            
            for i in range(start_idx, end_idx):
                if i >= len(listings):
                    break
                    
                try:
                    print(f"Processing listing {i+1}/{len(listings)}")
                    listing = listings[i]
                    
                    # Click the listing to view details
                    listing.click()
                    time.sleep(2)
                    
                    # Extract business details from the side panel
                    business_data = extract_business_details(driver, wait)
                    
                    if business_data and business_data.get('business_name'):
                        results.append(business_data)
                        print(f"Added: {business_data['business_name']} | Website: {'Yes' if business_data.get('has_website') else 'No'}")
                    
                    # Go back to listing view
                    back_button = driver.find_element(By.CSS_SELECTOR, "button[jsaction='pane.back']")
                    back_button.click()
                    time.sleep(1)
                    
                except Exception as e:
                    print(f"Error processing listing {i}: {e}")
                    # Try to get back to listing view if we're stuck
                    try:
                        driver.find_element(By.CSS_SELECTOR, "button[jsaction='pane.back']").click()
                        time.sleep(1)
                    except:
                        pass
            
            # Update previous count
            previous_count = len(listings)
            
            # Scroll down
            driver.execute_script("arguments[0].scrollTop += 300", scrollable)
            time.sleep(scroll_pause_time)
            
            # Check if we have new results
            new_listings = driver.find_elements(By.CSS_SELECTOR, "div[role='article']")
            if not new_listings:
                new_listings = driver.find_elements(By.CSS_SELECTOR, ".Nv2PK")
            if not new_listings:
                new_listings = driver.find_elements(By.CSS_SELECTOR, ".a4gq8e-aVTXAb-haAclf-jRmmHf-hSRGPd")
                
            if len(new_listings) <= len(listings):
                no_new_results_count += 1
                print(f"No new results found ({no_new_results_count}/3)")
            else:
                no_new_results_count = 0
                print(f"Found {len(new_listings) - len(listings)} new results")
                
            print(f"Total results so far: {len(results)}")
            
    except Exception as e:
        print(f"Error while scrolling: {e}")

def extract_business_details(driver, wait):
    """Extract business details from the side panel"""
    business_data = {
        'business_name': '',
        'address': '',
        'phone': '',
        'website': '',
        'has_website': False,
        'rating': '',
        'reviews': '',
        'maps_url': driver.current_url,
        'scraped_date': time.strftime('%Y-%m-%d')
    }
    
    try:
        # Business name
        try:
            business_data['business_name'] = wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "h1.DUwDvf"))).text
        except:
            try:
                business_data['business_name'] = driver.find_element(By.CSS_SELECTOR, "h1 span").text
            except:
                # If we can't find the name, this might not be a business listing
                return None
        
        # Rating and reviews
        try:
            rating_element = driver.find_element(By.CSS_SELECTOR, "div.F7nice span")
            if rating_element:
                rating_text = rating_element.text
                if rating_text:
                    rating_match = re.search(r'([\d.]+)', rating_text)
                    if rating_match:
                        business_data['rating'] = rating_match.group(1)
                        
            reviews_element = driver.find_element(By.CSS_SELECTOR, "div.F7nice span[aria-label*='review']")
            if reviews_element:
                reviews_text = reviews_element.text
                if reviews_text:
                    reviews_match = re.search(r'([\d,]+)', reviews_text)
                    if reviews_match:
                        business_data['reviews'] = reviews_match.group(1).replace(',', '')
        except:
            pass
        
        # Address, phone, website
        try:
            info_sections = driver.find_elements(By.CSS_SELECTOR, "div.rogA2c")
            for section in info_sections:
                button = section.find_element(By.CSS_SELECTOR, "button")
                if button:
                    button_aria_label = button.get_attribute("aria-label") or ""
                    
                    if "address" in button_aria_label.lower():
                        business_data['address'] = button.text
                    elif "phone" in button_aria_label.lower():
                        business_data['phone'] = button.text
            
            # Website requires a different selector
            try:
                website_element = driver.find_element(By.CSS_SELECTOR, "a[data-item-id*='authority']")
                if website_element:
                    website_url = website_element.get_attribute("href")
                    if website_url:
                        business_data['website'] = website_url
                        business_data['has_website'] = True
            except NoSuchElementException:
                # No website found
                business_data['has_website'] = False
        except:
            pass
        
    except Exception as e:
        print(f"Error extracting business details: {e}")
    
    return business_data

def save_to_csv(results, filename):
    """Save results to a CSV file"""
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    
    fieldnames = [
        'business_name', 'address', 'phone', 'website', 'has_website',
        'rating', 'reviews', 'maps_url', 'scraped_date'
    ]
    
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
        writer.writeheader()
        for business in results:
            writer.writerow(business)

def main():
    """Main entry point for the script"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Scrape Google Maps for business information')
    parser.add_argument('--query', type=str, default='plumbers in Brunswick, Maine',
                        help='Search query for Google Maps')
    parser.add_argument('--output', type=str, default='../data/google_maps_results.csv',
                        help='Output CSV file path')
    parser.add_argument('--headless', action='store_true',
                        help='Run in headless mode')
    parser.add_argument('--max', type=int, default=30,
                        help='Maximum number of results to scrape')
    
    args = parser.parse_args()
    
    scrape_google_maps(args.query, args.output, args.headless, args.max)

if __name__ == "__main__":
    main()
