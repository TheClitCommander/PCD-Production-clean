#!/usr/bin/env python3
"""
Lead Validation Module for Pleasant Cove Design
Handles phone number validation, email discovery, and data enrichment
"""

import os
import re
import logging
from typing import Dict, Optional, List
import time

# Set up logging
logger = logging.getLogger(__name__)

# Try to import Twilio
try:
    from twilio.rest import Client as TwilioClient
    from twilio.base.exceptions import TwilioException
    TWILIO_AVAILABLE = True
except ImportError:
    TWILIO_AVAILABLE = False
    logger.warning("Twilio not installed. Install with: pip install twilio")

class PhoneValidator:
    """Validates phone numbers using Twilio Lookup API"""
    
    def __init__(self, dry_run=False):
        """
        Initialize the phone validator
        
        Args:
            dry_run: If True, simulate validation without making API calls
        """
        self.dry_run = dry_run
        self.client = None
        
        if TWILIO_AVAILABLE and not dry_run:
            account_sid = os.getenv("TWILIO_ACCOUNT_SID")
            auth_token = os.getenv("TWILIO_AUTH_TOKEN")
            
            if account_sid and auth_token:
                self.client = TwilioClient(account_sid, auth_token)
                logger.info("✅ Twilio Lookup API initialized")
            else:
                logger.warning("❌ Twilio credentials not found in environment variables")
        elif dry_run:
            logger.info("🔍 Phone validator in dry-run mode")
        else:
            logger.warning("❌ Twilio not available")
    
    def clean_phone_number(self, phone: str) -> str:
        """Clean and normalize phone number format"""
        if not phone:
            return ""
        
        # Remove all non-digit characters except +
        cleaned = re.sub(r'[^\d+]', '', phone)
        
        # If it starts with 1 and has 11 digits, add +
        if len(cleaned) == 11 and cleaned.startswith('1'):
            cleaned = '+' + cleaned
        # If it's 10 digits, add +1
        elif len(cleaned) == 10:
            cleaned = '+1' + cleaned
        # If it doesn't start with +, add it
        elif not cleaned.startswith('+'):
            cleaned = '+' + cleaned
        
        return cleaned
    
    def validate(self, phone_number: str) -> Dict:
        """
        Validate a phone number using Twilio Lookup API
        
        Args:
            phone_number: Phone number to validate
            
        Returns:
            Dict with validation results:
            {
                "valid": True/False,
                "formatted": "formatted number",
                "carrier": "carrier name",
                "country": "country code", 
                "line_type": "mobile/landline",
                "error": "error message if any"
            }
        """
        if not phone_number:
            return {
                "valid": False,
                "formatted": "",
                "carrier": None,
                "country": None,
                "line_type": None,
                "error": "No phone number provided"
            }
        
        # Clean the phone number
        cleaned_phone = self.clean_phone_number(phone_number)
        
        if self.dry_run:
            # Simulate validation for testing
            return self._simulate_validation(cleaned_phone)
        
        if not self.client:
            return {
                "valid": False,
                "formatted": cleaned_phone,
                "carrier": None,
                "country": None,
                "line_type": None,
                "error": "Twilio client not initialized"
            }
        
        try:
            # Make the Twilio Lookup API call
            result = self.client.lookups.v1.phone_numbers(cleaned_phone).fetch(
                type=["carrier"]
            )
            
            carrier_info = result.carrier or {}
            
            return {
                "valid": True,
                "formatted": result.phone_number,
                "carrier": carrier_info.get("name"),
                "country": result.country_code,
                "line_type": carrier_info.get("type"),
                "error": None
            }
            
        except TwilioException as e:
            logger.debug(f"Twilio validation failed for {cleaned_phone}: {e}")
            return {
                "valid": False,
                "formatted": cleaned_phone,
                "carrier": None,
                "country": None,
                "line_type": None,
                "error": str(e)
            }
        except Exception as e:
            logger.error(f"Unexpected error validating {cleaned_phone}: {e}")
            return {
                "valid": False,
                "formatted": cleaned_phone,
                "carrier": None,
                "country": None,
                "line_type": None,
                "error": f"Validation error: {str(e)}"
            }
    
    def _simulate_validation(self, phone: str) -> Dict:
        """Simulate phone validation for dry-run mode"""
        # Simple simulation based on phone format
        if not phone or len(phone) < 10:
            return {
                "valid": False,
                "formatted": phone,
                "carrier": None,
                "country": None,
                "line_type": None,
                "error": "Invalid format"
            }
        
        # Simulate some valid and invalid numbers
        if "555" in phone:  # Our test numbers
            carriers = ["Verizon", "AT&T", "T-Mobile", "Sprint"]
            line_types = ["mobile", "landline"]
            
            # Use hash to get consistent results for same number
            carrier_idx = abs(hash(phone)) % len(carriers)
            line_idx = abs(hash(phone + "line")) % len(line_types)
            
            return {
                "valid": True,
                "formatted": phone,
                "carrier": carriers[carrier_idx],
                "country": "US",
                "line_type": line_types[line_idx],
                "error": None
            }
        else:
            return {
                "valid": False,
                "formatted": phone,
                "carrier": None,
                "country": None,
                "line_type": None,
                "error": "Number not found"
            }
    
    def validate_batch(self, phone_numbers: List[str], delay: float = 0.5) -> List[Dict]:
        """
        Validate multiple phone numbers with rate limiting
        
        Args:
            phone_numbers: List of phone numbers to validate
            delay: Delay between API calls to avoid rate limits
            
        Returns:
            List of validation results
        """
        results = []
        
        logger.info(f"🔍 Validating {len(phone_numbers)} phone numbers...")
        
        for i, phone in enumerate(phone_numbers):
            if phone:  # Only validate non-empty numbers
                result = self.validate(phone)
                results.append(result)
                
                if result["valid"]:
                    logger.info(f"✅ {phone} -> {result['formatted']} ({result['carrier']})")
                else:
                    logger.warning(f"❌ {phone} -> {result['error']}")
            else:
                results.append({
                    "valid": False,
                    "formatted": "",
                    "carrier": None,
                    "country": None,
                    "line_type": None,
                    "error": "Empty phone number"
                })
            
            # Rate limiting
            if i < len(phone_numbers) - 1 and not self.dry_run:
                time.sleep(delay)
        
        valid_count = sum(1 for r in results if r["valid"])
        logger.info(f"📊 Validation complete: {valid_count}/{len(phone_numbers)} valid numbers")
        
        return results


class EmailValidator:
    """Validates and discovers email addresses"""
    
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        logger.info("📧 Email validator initialized (dry-run mode)" if dry_run else "📧 Email validator initialized")
    
    def validate_format(self, email: str) -> bool:
        """Basic email format validation"""
        if not email:
            return False
        
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    def discover_email(self, business_name: str, domain: str = None) -> Optional[str]:
        """
        Try to discover email addresses for a business
        This is a placeholder for integration with services like Hunter.io
        """
        if self.dry_run:
            # Simulate email discovery
            if business_name:
                safe_name = re.sub(r'[^a-zA-Z0-9]', '', business_name.lower())
                return f"info@{safe_name[:10]}.com"
        
        # In real implementation, integrate with Hunter.io, Clearbit, etc.
        logger.info("📧 Email discovery not yet implemented (placeholder)")
        return None


class LeadEnricher:
    """Combines all validation services for comprehensive lead enrichment"""
    
    def __init__(self, dry_run=False):
        self.dry_run = dry_run
        self.phone_validator = PhoneValidator(dry_run=dry_run)
        self.email_validator = EmailValidator(dry_run=dry_run)
        
        logger.info(f"🚀 Lead enricher initialized ({'dry-run' if dry_run else 'live'} mode)")
    
    def enrich_lead(self, lead_data: Dict) -> Dict:
        """
        Enrich a single lead with validation data
        
        Args:
            lead_data: Dictionary with lead information
            
        Returns:
            Enhanced lead data with validation results
        """
        enriched = lead_data.copy()
        
        # Validate phone number
        if lead_data.get("phone"):
            phone_result = self.phone_validator.validate(lead_data["phone"])
            enriched.update({
                "phone_valid": phone_result["valid"],
                "phone_formatted": phone_result["formatted"],
                "phone_carrier": phone_result["carrier"],
                "phone_country": phone_result["country"],
                "phone_line_type": phone_result["line_type"],
                "phone_error": phone_result["error"]
            })
        
        # Validate email format
        if lead_data.get("email"):
            enriched["email_format_valid"] = self.email_validator.validate_format(lead_data["email"])
        
        # Try to discover email if none exists
        if not lead_data.get("email") and lead_data.get("business_name"):
            discovered_email = self.email_validator.discover_email(lead_data["business_name"])
            if discovered_email:
                enriched["email_discovered"] = discovered_email
        
        return enriched


if __name__ == "__main__":
    # Test the validation module
    print("🧪 Testing Validation Module")
    print("=" * 50)
    
    # Test phone validation
    validator = PhoneValidator(dry_run=True)
    
    test_phones = [
        "(207) 555-1111",
        "207-555-2222", 
        "555.3333",
        "invalid",
        ""
    ]
    
    for phone in test_phones:
        result = validator.validate(phone)
        print(f"📞 {phone} -> Valid: {result['valid']}, Formatted: {result['formatted']}")
    
    print("\n✅ Validation module test complete!") 