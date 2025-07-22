#!/usr/bin/env python3
"""
Advanced Email Discovery & Validation Module for Pleasant Cove Design
Handles email format validation, domain verification, discovery, and deliverability scoring
"""

import re
import time
import logging
from typing import Dict, List, Optional, Tuple
from urllib.parse import urljoin, urlparse
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed

# Set up logging
logger = logging.getLogger(__name__)

# Try to import optional libraries with fallbacks
try:
    import dns.resolver
    DNS_AVAILABLE = True
except ImportError:
    DNS_AVAILABLE = False
    logger.warning("dnspython not installed. Install with: pip install dnspython")

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests not installed. Install with: pip install requests")

try:
    import whois
    WHOIS_AVAILABLE = True
except ImportError:
    WHOIS_AVAILABLE = False
    logger.warning("python-whois not installed. Install with: pip install python-whois")

class EmailValidator:
    """Advanced email validation with format, DNS, and deliverability checks"""
    
    def __init__(self, dry_run=False, timeout=10):
        """
        Initialize email validator
        
        Args:
            dry_run: If True, simulate validation without making external requests
            timeout: Timeout for DNS and HTTP requests
        """
        self.dry_run = dry_run
        self.timeout = timeout
        
        # Common disposable email domains
        self.disposable_domains = {
            '10minutemail.com', 'temp-mail.org', 'guerrillamail.com', 'mailinator.com',
            'throwaway.email', 'tempmail.org', 'yopmail.com', 'maildrop.cc',
            'sharklasers.com', 'guerrillamail.info', 'guerrillamail.biz', 'guerrillamail.de'
        }
        
        # Common business email patterns
        self.business_patterns = [
            'info@{}', 'contact@{}', 'hello@{}', 'admin@{}', 'office@{}',
            'sales@{}', 'support@{}', 'team@{}', 'mail@{}', 'inquiry@{}'
        ]
        
        # Role-based email prefixes (lower priority)
        self.role_prefixes = {
            'info', 'contact', 'admin', 'support', 'sales', 'marketing', 
            'hello', 'team', 'office', 'mail', 'inquiry', 'help', 'service'
        }
        
        logger.info(f"📧 Email validator initialized ({'dry-run' if dry_run else 'live'} mode)")
    
    def validate_format(self, email: str) -> Dict:
        """
        Validate email format using regex
        
        Args:
            email: Email address to validate
            
        Returns:
            Dict with validation results
        """
        if not email:
            return {
                "format_valid": False,
                "error": "Empty email address"
            }
        
        # Comprehensive email regex
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        
        if not re.match(pattern, email.strip()):
            return {
                "format_valid": False,
                "error": "Invalid email format"
            }
        
        # Additional checks
        local, domain = email.split('@')
        
        # Check local part
        if len(local) > 64:
            return {
                "format_valid": False,
                "error": "Local part too long"
            }
        
        # Check domain part
        if len(domain) > 255:
            return {
                "format_valid": False,
                "error": "Domain part too long"
            }
        
        return {
            "format_valid": True,
            "local_part": local,
            "domain": domain,
            "error": None
        }
    
    def check_mx_record(self, domain: str) -> Dict:
        """
        Check if domain has valid MX record
        
        Args:
            domain: Domain to check
            
        Returns:
            Dict with MX validation results
        """
        if self.dry_run or not DNS_AVAILABLE:
            # Simulate MX check
            if domain.endswith('.com') or domain.endswith('.org') or domain.endswith('.net'):
                return {
                    "mx_valid": True,
                    "mx_records": [f"mail.{domain}"],
                    "error": None
                }
            else:
                return {
                    "mx_valid": False,
                    "mx_records": [],
                    "error": "No MX record found (simulated)" if self.dry_run else "DNS module not available"
                }
        
        try:
            mx_records = dns.resolver.resolve(domain, 'MX')
            mx_list = [str(mx.exchange) for mx in mx_records]
            
            return {
                "mx_valid": True,
                "mx_records": mx_list,
                "error": None
            }
            
        except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer):
            return {
                "mx_valid": False,
                "mx_records": [],
                "error": "No MX record found"
            }
        except Exception as e:
            return {
                "mx_valid": False,
                "mx_records": [],
                "error": f"MX check failed: {str(e)}"
            }
    
    def check_domain_reputation(self, domain: str) -> Dict:
        """
        Check domain reputation and risk factors
        
        Args:
            domain: Domain to check
            
        Returns:
            Dict with reputation analysis
        """
        risk_score = 0
        risk_factors = []
        
        # Check if disposable email domain
        if domain.lower() in self.disposable_domains:
            risk_score += 50
            risk_factors.append("Disposable email domain")
        
        # Check domain age (if whois available)
        if WHOIS_AVAILABLE and not self.dry_run:
            try:
                domain_info = whois.whois(domain)
                if domain_info.creation_date:
                    # New domains (< 30 days) are riskier
                    import datetime
                    if isinstance(domain_info.creation_date, list):
                        creation_date = domain_info.creation_date[0]
                    else:
                        creation_date = domain_info.creation_date
                    
                    days_old = (datetime.datetime.now() - creation_date).days
                    if days_old < 30:
                        risk_score += 20
                        risk_factors.append("Very new domain")
                    elif days_old < 90:
                        risk_score += 10
                        risk_factors.append("New domain")
            except:
                pass  # Whois lookup failed, skip
        
        # Check for suspicious patterns
        if any(word in domain.lower() for word in ['temp', 'fake', 'test', 'spam']):
            risk_score += 30
            risk_factors.append("Suspicious domain name")
        
        # Free email providers (lower risk but less professional)
        free_providers = {'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com'}
        is_free_provider = domain.lower() in free_providers
        if is_free_provider:
            risk_score += 5
            risk_factors.append("Free email provider")
        
        return {
            "risk_score": min(risk_score, 100),  # Cap at 100
            "risk_factors": risk_factors,
            "is_free_provider": is_free_provider,
            "is_disposable": domain.lower() in self.disposable_domains
        }
    
    def classify_email_type(self, email: str) -> str:
        """
        Classify email type (personal, business, role)
        
        Args:
            email: Email address to classify
            
        Returns:
            Email type classification
        """
        local_part = email.split('@')[0].lower()
        
        # Check if it's a role-based email
        if local_part in self.role_prefixes:
            return "role"
        
        # Check if it contains numbers (likely personal)
        if any(char.isdigit() for char in local_part):
            return "personal"
        
        # Check if it's a name pattern (firstname.lastname, firstnamelastname)
        if '.' in local_part or len(local_part.replace('.', '')) > 15:
            return "personal"
        
        # Default to business
        return "business"
    
    def validate_email(self, email: str) -> Dict:
        """
        Comprehensive email validation
        
        Args:
            email: Email address to validate
            
        Returns:
            Complete validation results
        """
        if not email:
            return {
                "email": "",
                "valid": False,
                "confidence_score": 0,
                "error": "No email provided"
            }
        
        email = email.strip().lower()
        
        # Format validation
        format_result = self.validate_format(email)
        if not format_result["format_valid"]:
            return {
                "email": email,
                "valid": False,
                "confidence_score": 0,
                "error": format_result["error"],
                "format_valid": False,
                "mx_valid": False,
                "mx_records": [],
                "email_type": "unknown",
                "risk_score": 100,
                "risk_factors": ["Invalid format"],
                "is_free_provider": False,
                "is_disposable": False
            }
        
        domain = format_result["domain"]
        
        # MX record validation
        mx_result = self.check_mx_record(domain)
        
        # Domain reputation check
        reputation = self.check_domain_reputation(domain)
        
        # Email type classification
        email_type = self.classify_email_type(email)
        
        # Calculate confidence score (0-100)
        confidence_score = 100
        
        if not mx_result["mx_valid"]:
            confidence_score -= 70  # Major penalty for no MX
        
        confidence_score -= reputation["risk_score"] * 0.3  # Apply risk penalty
        
        if email_type == "role":
            confidence_score -= 10  # Slight penalty for role emails
        
        # Ensure score is between 0-100
        confidence_score = max(0, min(100, confidence_score))
        
        return {
            "email": email,
            "valid": mx_result["mx_valid"] and confidence_score > 30,
            "confidence_score": round(confidence_score, 1),
            "format_valid": format_result["format_valid"],
            "mx_valid": mx_result["mx_valid"],
            "mx_records": mx_result["mx_records"],
            "email_type": email_type,
            "risk_score": reputation["risk_score"],
            "risk_factors": reputation["risk_factors"],
            "is_free_provider": reputation["is_free_provider"],
            "is_disposable": reputation["is_disposable"],
            "error": mx_result.get("error")
        }


class EmailDiscovery:
    """Discovers email addresses for businesses"""
    
    def __init__(self, dry_run=False, timeout=10):
        """
        Initialize email discovery
        
        Args:
            dry_run: If True, simulate discovery without making external requests
            timeout: Timeout for HTTP requests
        """
        self.dry_run = dry_run
        self.timeout = timeout
        self.validator = EmailValidator(dry_run=dry_run, timeout=timeout)
        
        logger.info(f"🔍 Email discovery initialized ({'dry-run' if dry_run else 'live'} mode)")
    
    def extract_domain_from_business(self, business_name: str, address: str = None) -> List[str]:
        """
        Generate potential domains from business name and address
        
        Args:
            business_name: Name of the business
            address: Business address (optional)
            
        Returns:
            List of potential domains
        """
        domains = []
        
        if not business_name:
            return domains
        
        # Clean business name
        clean_name = re.sub(r'[^a-zA-Z0-9\s]', '', business_name.lower())
        clean_name = re.sub(r'\s+', '', clean_name)  # Remove spaces
        
        # Remove common business words
        business_words = ['llc', 'inc', 'corp', 'company', 'co', 'ltd', 'restaurant', 'cafe', 'diner']
        for word in business_words:
            clean_name = clean_name.replace(word, '')
        
        # Generate domain variations
        if clean_name:
            domains.extend([
                f"{clean_name}.com",
                f"{clean_name}.net",
                f"{clean_name}.org",
                f"{clean_name}maine.com",  # Location-specific
                f"{clean_name}me.com",     # Maine-specific
            ])
        
        # If business name has multiple words, try combinations
        words = business_name.lower().split()
        if len(words) >= 2:
            # First word + last word
            first_last = ''.join([re.sub(r'[^a-zA-Z0-9]', '', word) for word in [words[0], words[-1]]])
            if first_last:
                domains.extend([
                    f"{first_last}.com",
                    f"{first_last}.net"
                ])
        
        return list(set(domains))  # Remove duplicates
    
    def discover_emails_for_domain(self, domain: str) -> List[Dict]:
        """
        Discover potential email addresses for a domain
        
        Args:
            domain: Domain to search
            
        Returns:
            List of discovered email addresses with validation
        """
        emails = []
        
        # Generate common business email patterns
        patterns = [
            'info@{}', 'contact@{}', 'hello@{}', 'admin@{}', 'office@{}',
            'sales@{}', 'support@{}', 'team@{}', 'mail@{}'
        ]
        
        for pattern in patterns:
            email = pattern.format(domain)
            validation = self.validator.validate_email(email)
            
            if validation["valid"] or validation["confidence_score"] > 50:
                emails.append({
                    "email": email,
                    "source": "pattern_generated",
                    "pattern": pattern,
                    "validation": validation
                })
        
        return emails
    
    def discover_from_website(self, website_url: str) -> List[Dict]:
        """
        Extract email addresses from website content
        
        Args:
            website_url: Website URL to scrape
            
        Returns:
            List of discovered emails
        """
        if self.dry_run or not REQUESTS_AVAILABLE:
            # Simulate website discovery
            domain = urlparse(website_url).netloc
            return [{
                "email": f"info@{domain}",
                "source": "website_scrape",
                "confidence": 80,
                "validation": self.validator.validate_email(f"info@{domain}")
            }]
        
        emails = []
        
        try:
            response = requests.get(website_url, timeout=self.timeout, 
                                  headers={'User-Agent': 'Mozilla/5.0 (compatible; EmailDiscovery/1.0)'})
            
            if response.status_code == 200:
                content = response.text.lower()
                
                # Email regex pattern
                email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
                found_emails = re.findall(email_pattern, content, re.IGNORECASE)
                
                for email in set(found_emails):  # Remove duplicates
                    validation = self.validator.validate_email(email)
                    emails.append({
                        "email": email,
                        "source": "website_scrape",
                        "url": website_url,
                        "validation": validation
                    })
        
        except Exception as e:
            logger.debug(f"Website scraping failed for {website_url}: {e}")
        
        return emails
    
    def discover_business_emails(self, business_name: str, website: str = None, 
                               address: str = None) -> List[Dict]:
        """
        Comprehensive email discovery for a business
        
        Args:
            business_name: Name of the business
            website: Business website (optional)
            address: Business address (optional)
            
        Returns:
            List of discovered and validated emails
        """
        all_emails = []
        
        # If website is provided, try scraping it first
        if website:
            website_emails = self.discover_from_website(website)
            all_emails.extend(website_emails)
            
            # Extract domain from website for pattern generation
            domain = urlparse(website).netloc
            if domain:
                domain_emails = self.discover_emails_for_domain(domain)
                all_emails.extend(domain_emails)
        
        # Generate potential domains and discover emails
        potential_domains = self.extract_domain_from_business(business_name, address)
        
        for domain in potential_domains:
            domain_emails = self.discover_emails_for_domain(domain)
            all_emails.extend(domain_emails)
        
        # Remove duplicates and sort by confidence
        unique_emails = {}
        for email_data in all_emails:
            email = email_data["email"]
            if email not in unique_emails:
                unique_emails[email] = email_data
            else:
                # Keep the one with higher confidence
                if email_data["validation"]["confidence_score"] > unique_emails[email]["validation"]["confidence_score"]:
                    unique_emails[email] = email_data
        
        # Sort by confidence score
        sorted_emails = sorted(unique_emails.values(), 
                             key=lambda x: x["validation"]["confidence_score"], 
                             reverse=True)
        
        return sorted_emails


class EmailEnricher:
    """Combines validation and discovery for comprehensive email enrichment"""
    
    def __init__(self, dry_run=False, timeout=10):
        """
        Initialize email enricher
        
        Args:
            dry_run: If True, simulate without external requests
            timeout: Timeout for requests
        """
        self.dry_run = dry_run
        self.validator = EmailValidator(dry_run=dry_run, timeout=timeout)
        self.discovery = EmailDiscovery(dry_run=dry_run, timeout=timeout)
        
        logger.info(f"🚀 Email enricher initialized ({'dry-run' if dry_run else 'live'} mode)")
    
    def enrich_lead_emails(self, lead_data: Dict) -> Dict:
        """
        Enrich a lead with email validation and discovery
        
        Args:
            lead_data: Lead information dictionary
            
        Returns:
            Enriched lead data with email information
        """
        enriched = lead_data.copy()
        
        # Validate existing email if present
        existing_email = lead_data.get("email")
        if existing_email:
            validation = self.validator.validate_email(existing_email)
            enriched.update({
                "email_valid": validation["valid"],
                "email_confidence_score": validation["confidence_score"],
                "email_type": validation["email_type"],
                "email_risk_score": validation["risk_score"],
                "email_mx_valid": validation["mx_valid"],
                "email_is_disposable": validation["is_disposable"],
                "email_error": validation.get("error")
            })
        
        # Discover additional emails
        discovered_emails = self.discovery.discover_business_emails(
            business_name=lead_data.get("business_name", ""),
            website=lead_data.get("website"),
            address=lead_data.get("address")
        )
        
        # Add best discovered email if none exists or current one is invalid
        if discovered_emails and (not existing_email or not enriched.get("email_valid", False)):
            best_email = discovered_emails[0]  # Already sorted by confidence
            
            enriched.update({
                "email_discovered": best_email["email"],
                "email_discovery_source": best_email["source"],
                "email_discovery_confidence": best_email["validation"]["confidence_score"]
            })
            
            # If no existing email, use discovered as primary
            if not existing_email:
                enriched.update({
                    "email": best_email["email"],
                    "email_valid": best_email["validation"]["valid"],
                    "email_confidence_score": best_email["validation"]["confidence_score"],
                    "email_type": best_email["validation"]["email_type"],
                    "email_risk_score": best_email["validation"]["risk_score"],
                    "email_mx_valid": best_email["validation"]["mx_valid"],
                    "email_is_disposable": best_email["validation"]["is_disposable"]
                })
        
        return enriched


if __name__ == "__main__":
    # Test the email validation and discovery
    print("🧪 Testing Email Validation & Discovery")
    print("=" * 60)
    
    enricher = EmailEnricher(dry_run=True)
    
    # Test cases
    test_leads = [
        {
            "business_name": "The Coastal Kitchen",
            "email": "coastal@example.com",
            "website": "https://coastalkitchen.com",
            "address": "123 Main St, Brunswick, ME"
        },
        {
            "business_name": "Harbor View Diner", 
            "email": "invalid-email",
            "website": None,
            "address": "456 Harbor Rd, Brunswick, ME"
        },
        {
            "business_name": "Maine Street Cafe",
            "email": None,
            "website": "https://mainestreetcafe.com",
            "address": "789 Maine St, Brunswick, ME"
        }
    ]
    
    for i, lead in enumerate(test_leads, 1):
        print(f"\n🏪 Test {i}: {lead['business_name']}")
        enriched = enricher.enrich_lead_emails(lead)
        
        print(f"   Original email: {lead.get('email', 'None')}")
        print(f"   Valid: {enriched.get('email_valid', 'N/A')}")
        print(f"   Confidence: {enriched.get('email_confidence_score', 'N/A')}")
        print(f"   Discovered: {enriched.get('email_discovered', 'None')}")
        print(f"   Type: {enriched.get('email_type', 'N/A')}")
    
    print("\n✅ Email validation and discovery test complete!") 