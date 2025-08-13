#!/usr/bin/env python3
"""
Website verification script for lead pipeline.
Classifies website candidates as HAS_SITE, NO_SITE, SOCIAL_ONLY, or UNSURE.
"""

import re
import json
import sys
import argparse
import requests
from urllib.parse import urlparse
from difflib import SequenceMatcher
import time
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple

# Social media hosts that don't count as "real websites"
SOCIAL_HOSTS = {
    "facebook.com", "instagram.com", "tiktok.com", "linkedin.com", 
    "twitter.com", "x.com", "youtube.com", "snapchat.com"
}

@dataclass
class VerificationEvidence:
    """Evidence collected during website verification"""
    title_snippet: str = ""
    matched_phone: bool = False
    matched_address: bool = False
    schema_types: List[str] = None
    contact_emails: List[str] = None
    has_contact_form: bool = False
    tech_stack: List[str] = None
    ssl_enabled: bool = False
    mobile_friendly: bool = False
    load_time_ms: int = 0
    
    def __post_init__(self):
        if self.schema_types is None:
            self.schema_types = []
        if self.contact_emails is None:
            self.contact_emails = []
        if self.tech_stack is None:
            self.tech_stack = []

def norm_phone(phone_str):
    """Remove all non-digits from phone number."""
    if not phone_str:
        return ""
    return re.sub(r"\D", "", phone_str)

def extract_host(url):
    """Extract hostname from URL, removing www."""
    try:
        parsed = urlparse(url if url.startswith('http') else f'https://{url}')
        return parsed.netloc.lower().replace("www.", "")
    except:
        return ""

def analyze_candidate(candidate_url: str, brand_name: str, phone: str = None, address: str = None, timeout: int = 8) -> Tuple[float, VerificationEvidence]:
    """
    Enhanced candidate analysis with evidence collection.
    Returns (score, evidence) tuple.
    """
    evidence = VerificationEvidence()
    
    try:
        start_time = time.time()
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        
        response = requests.get(candidate_url, timeout=timeout, headers=headers, allow_redirects=True)
        response.raise_for_status()
        
        evidence.load_time_ms = int((time.time() - start_time) * 1000)
        evidence.ssl_enabled = candidate_url.startswith('https://')
        
        html = response.text[:500000]  # Limit HTML to 500KB
        
        # Extract and score title
        title_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.I | re.S)
        title = title_match.group(1).strip() if title_match else ""
        title = re.sub(r'\s+', ' ', title)[:200]
        evidence.title_snippet = title
        
        # Extract h1 tags
        h1_matches = re.findall(r"<h1[^>]*>(.*?)</h1>", html, re.I | re.S)
        h1_text = " ".join(h1_matches)[:200] if h1_matches else ""
        
        # Brand name similarity scoring
        brand_lower = brand_name.lower()
        title_lower = title.lower()
        domain = extract_host(candidate_url)
        
        title_similarity = SequenceMatcher(None, brand_lower, title_lower).ratio()
        h1_similarity = SequenceMatcher(None, brand_lower, h1_text.lower()).ratio()
        name_score = max(title_similarity, h1_similarity)
        
        # Domain similarity
        domain_score = SequenceMatcher(None, brand_lower, domain).ratio()
        
        # Phone verification
        phone_score = 0.0
        if phone:
            phone_normalized = norm_phone(phone)
            if phone_normalized and len(phone_normalized) >= 10:
                html_numbers = norm_phone(html)
                evidence.matched_phone = phone_normalized in html_numbers
                if evidence.matched_phone:
                    phone_score = 1.0
        
        # Address verification
        address_score = 0.0
        if address:
            # Simple address matching - could be enhanced
            address_words = set(re.findall(r'\b\w+\b', address.lower()))
            html_words = set(re.findall(r'\b\w+\b', html.lower()))
            common_words = address_words.intersection(html_words)
            if len(common_words) >= 2:  # At least 2 address components match
                evidence.matched_address = True
                address_score = 0.5
        
        # Extract contact emails
        email_pattern = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = list(set(re.findall(email_pattern, html)))
        evidence.contact_emails = emails[:5]  # Limit to 5 emails
        
        # Detect contact forms
        form_indicators = [
            r'<form[^>]*.*?contact.*?</form>',
            r'<input[^>]*type=["\']email["\']',
            r'<textarea[^>]*name=["\']message["\']',
            r'class=["\'][^"\']*contact[^"\']*["\']'
        ]
        evidence.has_contact_form = any(re.search(pattern, html, re.I | re.S) for pattern in form_indicators)
        
        # Detect Schema.org structured data
        schema_matches = re.findall(r'"@type":\s*"([^"]+)"', html)
        evidence.schema_types = list(set(schema_matches))
        
        # Basic tech stack detection
        tech_indicators = {
            'WordPress': r'wp-content|wp-includes|wordpress',
            'Shopify': r'shopify\.com|shopifycdn\.com',
            'Squarespace': r'squarespace\.com|static1\.squarespace',
            'Wix': r'wix\.com|wixstatic\.com',
            'React': r'react|__REACT_DEVTOOLS_GLOBAL_HOOK__',
            'jQuery': r'jquery|jQuery'
        }
        
        for tech, pattern in tech_indicators.items():
            if re.search(pattern, html, re.I):
                evidence.tech_stack.append(tech)
        
        # Mobile-friendly detection (basic)
        viewport_meta = re.search(r'<meta[^>]*name=["\']viewport["\'][^>]*>', html, re.I)
        evidence.mobile_friendly = viewport_meta is not None
        
        # Quality scoring
        quality_score = 0.0
        
        # Content length bonus
        if len(html) > 10000:
            quality_score += 0.2
        elif len(html) > 5000:
            quality_score += 0.1
        
        # Navigation elements
        if re.search(r'<nav|<menu|<header|<footer', html, re.I):
            quality_score += 0.2
        
        # Business content indicators
        business_terms = r'\b(about|contact|services|products|hours|location|phone|email)\b'
        business_matches = len(re.findall(business_terms, html, re.I))
        quality_score += min(business_matches * 0.05, 0.3)
        
        # Schema.org bonus
        if 'LocalBusiness' in evidence.schema_types or 'Organization' in evidence.schema_types:
            quality_score += 0.3
        
        # Contact info bonus
        if evidence.contact_emails or evidence.has_contact_form:
            quality_score += 0.2
        
        # Final weighted score
        final_score = (
            0.35 * name_score +      # Brand similarity
            0.25 * domain_score +    # Domain relevance  
            0.20 * phone_score +     # Phone verification
            0.10 * address_score +   # Address verification
            0.10 * quality_score     # Overall quality
        )
        
        return final_score, evidence
        
    except requests.exceptions.Timeout:
        evidence.load_time_ms = timeout * 1000
        return 0.0, evidence
    except requests.exceptions.RequestException:
        return 0.0, evidence
    except Exception as e:
        return 0.0, evidence

def classify_websites(urls: List[str], brand_name: str, phone: str = None, address: str = None) -> Tuple[str, str, float, dict]:
    """
    Enhanced website classification with evidence collection.
    Returns: (best_url, status, confidence, evidence_dict)
    """
    if not urls:
        return None, "NO_SITE", 0.8, {}
    
    # Filter and categorize URLs
    valid_urls = []
    social_urls = []
    
    for url in urls:
        if not url or not isinstance(url, str):
            continue
            
        # Ensure URL has protocol
        if not url.startswith(('http://', 'https://')):
            url = f'https://{url}'
        
        host = extract_host(url)
        if not host:
            continue
            
        if any(social in host for social in SOCIAL_HOSTS):
            social_urls.append(url)
        else:
            valid_urls.append(url)
    
    best_evidence = VerificationEvidence()
    
    # If we have real websites, analyze them
    if valid_urls:
        scored_sites = []
        for url in valid_urls[:5]:  # Limit to 5 URLs to avoid timeout
            score, evidence = analyze_candidate(url, brand_name, phone, address)
            scored_sites.append((url, score, evidence))
        
        # Sort by score
        scored_sites.sort(key=lambda x: x[1], reverse=True)
        best_url, best_score, best_evidence = scored_sites[0]
        
        # Confidence thresholds (adjusted for enhanced scoring)
        if best_score >= 0.70:
            status = "HAS_SITE"
        elif best_score >= 0.55:
            status = "UNSURE"
        else:
            # Even with websites, confidence is too low
            if social_urls:
                return social_urls[0], "SOCIAL_ONLY", 0.4, {"reason": "Low website confidence, using social"}
            return None, "NO_SITE", 0.7, {"reason": "Low website confidence, no valid sites"}
        
        # Convert evidence to dict
        evidence_dict = {
            "title_snippet": best_evidence.title_snippet,
            "matched_phone": best_evidence.matched_phone,
            "matched_address": best_evidence.matched_address,
            "schema_types": best_evidence.schema_types,
            "contact_emails": best_evidence.contact_emails,
            "has_contact_form": best_evidence.has_contact_form,
            "tech_stack": best_evidence.tech_stack,
            "ssl_enabled": best_evidence.ssl_enabled,
            "mobile_friendly": best_evidence.mobile_friendly,
            "load_time_ms": best_evidence.load_time_ms,
            "analyzed_urls": len(valid_urls),
            "social_urls_found": len(social_urls)
        }
        
        return best_url, status, round(best_score, 2), evidence_dict
    
    # Only social media found
    if social_urls:
        return social_urls[0], "SOCIAL_ONLY", 0.7, {"reason": "Only social media found"}
    
    # Nothing found
    return None, "NO_SITE", 0.8, {"reason": "No valid URLs provided"}

def main():
    parser = argparse.ArgumentParser(description='Verify website candidates for a business')
    parser.add_argument('--name', required=True, help='Business name')
    parser.add_argument('--phone', help='Business phone number')
    parser.add_argument('--address', help='Business address')
    parser.add_argument('--candidates', required=True, help='JSON array of candidate URLs')
    
    args = parser.parse_args()
    
    try:
        candidates = json.loads(args.candidates)
        if not isinstance(candidates, list):
            candidates = [candidates]
    except json.JSONDecodeError:
        candidates = []
    
    url, status, confidence, evidence = classify_websites(
        candidates, 
        args.name, 
        args.phone, 
        args.address
    )
    
    result = {
        "url": url,
        "status": status,
        "confidence": confidence,
        "evidence": evidence,
        "candidates": candidates
    }
    
    print(json.dumps(result, indent=2))

if __name__ == "__main__":
    main()
