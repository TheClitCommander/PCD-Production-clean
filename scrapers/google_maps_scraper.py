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
import random
import re
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException

class GoogleMapsScraper:
    def __init__(self, headless=True):
        self.setup_driver(headless)
        self.results = []
        
    def setup_driver(self, headless):
        """Configure and initialize the Chrome WebDriver"""
        options = Options()
        if headless:
            options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-blink-features=AutomationControlled")
        options.add_argument("user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36")
        options.add_argument("--window-size=1920,1080")
        
        self.driver = webdriver.Chrome(options=options)
        self.wait = WebDriverWait(self.driver, 10)
        
    def search_businesses(self, business_type, location):
        """Search for businesses of a specific type in a given location"""
        query = f"{business_type} in {location}"
        print(f"Searching for: {query}")
        
        self.driver.get("https://www.google.com/maps")
        time.sleep(2)
        
        # Enter search query
        try:
            search_box = self.wait.until(EC.presence_of_element_located((By.ID, "searchboxinput")))
            search_box.clear()
            search_box.send_keys(query)
            search_box.send_keys(Keys.ENTER)
            
            # Wait for results to load
            time.sleep(3)
            
            # Scroll to load more results
            self._scroll_results()
            
            # Extract business data
            self._extract_business_data(business_type, location)
            
        except Exception as e:
            print(f"Error during search: {e}")
        
    def _scroll_results(self):
        """Scroll through the results panel to load more businesses"""
        try:
            results_panel = self.wait.until(EC.presence_of_element_located(
                (By.CSS_SELECTOR, "div[role='feed']"))) 
            
            # Count initial results
            initial_results = len(self.driver.find_elements(By.CSS_SELECTOR, "div[role='article']"))
            print(f"Initial result count: {initial_results}")
            
            # Scroll several times to load more results
            scroll_count = 0
            max_scrolls = 10  # Increase this for more results
            last_count = initial_results
            
            while scroll_count < max_scrolls:
                # Scroll down
                self.driver.execute_script("arguments[0].scrollTop = arguments[0].scrollHeight", results_panel)
                time.sleep(2)
                
                # Count results after scrolling
                current_results = len(self.driver.find_elements(By.CSS_SELECTOR, "div[role='article']"))
                print(f"After scroll {scroll_count+1}: {current_results} results")
                
                # If no new results after 2 consecutive scrolls, break
                if current_results == last_count:
                    scroll_count += 1
                else:
                    scroll_count = 0  # Reset if we found new results
                    
                last_count = current_results
                
        except (TimeoutException, NoSuchElementException) as e:
            print(f"Error while scrolling: {e}")
    
    def _extract_business_data(self, business_type, location):
        """Extract business information from the results panel"""
        try:
            # First capture the listing URLs to avoid stale element references
            business_elements = self.driver.find_elements(By.CSS_SELECTOR, "div[role='article']")
            print(f"Found {len(business_elements)} business listings")
            
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
                    print(f"Could not get URL for business {i}: {e}")
            
            print(f"Successfully extracted {len(business_urls)} Google Maps URLs")
            
            # Now process each business one by one
            for i, business in enumerate(business_elements):
                try:
                    print(f"Processing business {i+1}/{len(business_elements)}")
                    
                    # Get basic info from the listing card without clicking
                    name = self._get_text_from_element(business, ".//div[contains(@class, 'fontHeadlineSmall')]", by=By.XPATH)
                    rating_text = self._get_text_from_element(business, ".//span[contains(@aria-label, 'stars')]", by=By.XPATH)
                    reviews_text = self._get_text_from_element(business, ".//span[contains(@aria-label, 'stars')]/following-sibling::span", by=By.XPATH)
                    
                    # Extract rating and review count
                    rating = ""
                    reviews = ""
                    if rating_text:
                        rating_match = re.search(r'([\d.]+)', rating_text)
                        rating = rating_match.group(1) if rating_match else ""
                    
                    if reviews_text:
                        reviews_match = re.search(r'(\d+)', reviews_text)
                        reviews = reviews_match.group(1) if reviews_match else ""
                    
                    # Click on the business to see details
                    business.click()
                    time.sleep(2)  # Wait for details to load
                    
                    # Get detailed information
                    address = self._get_text_if_exists("button[data-item-id='address']")
                    phone = self._get_text_if_exists("button[data-item-id^='phone']")
                    website = self._get_href_if_exists("a[data-item-id^='authority']")
                    business_type_text = self._get_text_if_exists("button[data-item-id^='category']")
                    
                    # Try to find years in business
                    years_in_business = ""
                    try:
                        # Look for text containing "years in business"
                        about_sections = self.driver.find_elements(By.CSS_SELECTOR, "div.RcCsl")
                        for section in about_sections:
                            text = section.text
                            if "years in business" in text.lower():
                                years_match = re.search(r'(\d+)\s+years? in business', text.lower())
                                if years_match:
                                    years_in_business = years_match.group(1)
                                break
                    except Exception as e:
                        print(f"Could not extract years in business: {e}")
                    
                    # Get the maps URL from our previously collected list
                    maps_url = ""
                    for url_item in business_urls:
                        if url_item["index"] == i:
                            maps_url = url_item["maps_url"]
                            break
                    
                    # Save all businesses, whether they have a website or not
                    if name:  # Only require a business name
                        new_business = {
                            "business_name": name,
                            "business_type": business_type,
                            "category": business_type_text,
                            "address": address,
                            "location": location,
                            "phone": phone,
                            "website": website,
                            "has_website": bool(website),  # True if website exists, False otherwise
                            "maps_url": maps_url,
                            "rating": rating,
                            "reviews": reviews,
                            "years_in_business": years_in_business,
                            "scraped_date": datetime.now().strftime("%Y-%m-%d")
                        }
                        
                        self.results.append(new_business)
                        print(f"Scraped: {name} | Website: {'Yes' if website else 'No'} | Rating: {rating}")
                    
                    # Random delay to avoid detection
                    time.sleep(random.uniform(1.0, 3.0))
                    
                except Exception as e:
                    print(f"Error processing business {i}: {e}")
                    continue
                    
        except Exception as e:
            print(f"Error extracting business data: {e}")
    
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
            print("No results to save.")
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
        
        print(f"Saved {len(self.results)} businesses to {filename}")
        print(f"Businesses without websites: {sum(1 for b in self.results if not b['has_website'])}")
    
    def close(self):
        """Close the WebDriver"""
        if hasattr(self, 'driver'):
            self.driver.quit()

def main():
    # Define target business types and locations
    business_types = [
        "mechanics", "plumbers", "electricians", "landscapers", 
        "roofers", "home cleaning", "contractors", "HVAC", "septic"
    ]
    
    locations = [
        "Brunswick, Maine", "Bath, Maine", "Wiscasset, Maine", 
        "Boothbay, Maine", "Damariscotta, Maine", "Waldoboro, Maine"
    ]
    
    # Create data directory if it doesn't exist
    os.makedirs("../data", exist_ok=True)
    
    # Allow command line override for headless mode
    import argparse
    parser = argparse.ArgumentParser(description='Scrape Google Maps for businesses')
    parser.add_argument('--headless', action='store_true', help='Run in headless mode')
    parser.add_argument('--business_type', type=str, help='Specific business type to search')
    parser.add_argument('--location', type=str, help='Specific location to search')
    args = parser.parse_args()
    
    # Set headless mode based on argument or default to visible browser
    headless_mode = args.headless
    
    # Initialize the scraper
    scraper = GoogleMapsScraper(headless=headless_mode)
    
    try:
        # If specific business type and location provided, just search those
        if args.business_type and args.location:
            scraper.search_businesses(args.business_type, args.location)
            output_file = f"../data/raw_{args.business_type.replace(' ', '_')}_{args.location.split(',')[0].lower()}.csv"
            scraper.save_results(output_file)
        else:
            # Otherwise, search all combinations
            for business_type in business_types:
                for location in locations:
                    scraper.search_businesses(business_type, location)
                    
                    # Save after each search to preserve data in case of failure
                    output_file = f"../data/raw_{business_type.replace(' ', '_')}_{location.split(',')[0].lower()}.csv"
                    scraper.save_results(output_file)
                    
                    # Clear results for the next search
                    scraper.results = []
                    
                    # Random delay between searches
                    time.sleep(random.uniform(3.0, 5.0))
    
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
