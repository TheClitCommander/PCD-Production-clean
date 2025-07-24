#!/usr/bin/env python3
"""
Industry Template Test Suite
Tests all industry templates to ensure content matches correctly
"""

import json
import subprocess
import sys
from datetime import datetime

# Test cases: (company_name, industry, expected_keywords)
TEST_CASES = [
    # Direct template matches
    ("Maine Coast Plumbing", "plumbing", ["plumbing", "drain", "water", "pipe"]),
    ("Green Thumb Landscaping", "landscaping", ["landscaping", "lawn", "garden", "outdoor"]),
    ("Ocean View Restaurant", "restaurant", ["restaurant", "dining", "food", "menu"]),
    ("Coastal Dental", "dental", ["dental", "teeth", "oral", "smile"]),
    ("Harbor Auto Repair", "auto", ["auto", "car", "repair", "mechanic"]),
    ("Atlantic Consulting", "consulting", ["consulting", "business", "strategy", "solutions"]),
    
    # New industry templates
    ("Digital Marketing Pro", "marketing", ["marketing", "digital", "brand", "seo"]),
    ("Smith & Associates Law", "legal", ["legal", "attorney", "law", "client"]),
    ("Family Health Clinic", "medical", ["medical", "health", "patient", "care"]),
    ("PowerHouse Gym", "fitness", ["fitness", "training", "gym", "health"]),
    ("Elegant Salon & Spa", "beauty", ["beauty", "hair", "treatment", "spa"]),
    ("Coastal Realty", "realestate", ["real estate", "home", "property", "buying"]),
    ("Maine Construction Co", "construction", ["construction", "building", "renovation", "contractor"]),
    ("Bright Electric", "electrical", ["electrical", "electrician", "wiring", "installation"]),
    ("Climate Control HVAC", "hvac", ["hvac", "heating", "cooling", "air"]),
    ("Professional Accounting", "accounting", ["accounting", "tax", "financial", "bookkeeping"]),
    ("Spotless Cleaning", "cleaning", ["cleaning", "residential", "commercial", "maintenance"]),
    
    # Fallback mapping tests
    ("Law Office of John Smith", "law", ["legal", "attorney", "law"]),
    ("Auto Mechanic Shop", "mechanic", ["auto", "car", "repair"]),
    ("Doctor's Office", "healthcare", ["medical", "health", "patient"]),
    ("CPA Services", "cpa", ["accounting", "tax", "financial"]),
    ("Hair Salon", "salon", ["beauty", "hair", "styling"]),
    ("Personal Training", "gym", ["fitness", "training", "exercise"]),
    
    # Unknown industry fallback
    ("Tech Solutions Inc", "software", ["consulting", "business", "solutions"])
]

def run_demo_generation(company_name, industry):
    """Run the demo generation script and return the result"""
    try:
        result = subprocess.run(
            ["python3", "create_industry_demo_templates.py", company_name, industry],
            capture_output=True,
            text=True,
            timeout=30
        )
        
        if result.returncode == 0:
            return json.loads(result.stdout)
        else:
            return {
                "success": False,
                "error": f"Script failed: {result.stderr}",
                "company_name": company_name,
                "industry": industry
            }
    except Exception as e:
        return {
            "success": False,
            "error": f"Exception: {str(e)}",
            "company_name": company_name,
            "industry": industry
        }

def validate_demo_content(demo_result, expected_keywords, company_name):
    """Validate that demo content contains expected keywords"""
    if not demo_result.get("success"):
        return False, [f"Demo generation failed: {demo_result.get('error', 'Unknown error')}"]
    
    issues = []
    
    # Check if demo URL is accessible (basic check)
    demo_url = demo_result.get("demo_url", "")
    if not demo_url:
        issues.append("No demo URL generated")
    
    # Check template used
    template_used = demo_result.get("template_used", "")
    if not template_used:
        issues.append("No template information")
    
    # Check validation warnings
    validation_warnings = demo_result.get("validation_warnings", [])
    if validation_warnings:
        issues.extend([f"Validation warning: {warning}" for warning in validation_warnings])
    
    return len(issues) == 0, issues

def main():
    """Run all industry template tests"""
    print("🧪 Starting Industry Template Test Suite")
    print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    total_tests = len(TEST_CASES)
    passed_tests = 0
    failed_tests = 0
    
    results = []
    
    for i, (company_name, industry, expected_keywords) in enumerate(TEST_CASES, 1):
        print(f"\n[{i:2d}/{total_tests}] Testing: {company_name} ({industry})")
        print("-" * 50)
        
        # Generate demo
        demo_result = run_demo_generation(company_name, industry)
        
        # Validate result
        is_valid, issues = validate_demo_content(demo_result, expected_keywords, company_name)
        
        test_result = {
            "company_name": company_name,
            "industry": industry,
            "expected_keywords": expected_keywords,
            "demo_result": demo_result,
            "is_valid": is_valid,
            "issues": issues
        }
        
        results.append(test_result)
        
        if is_valid:
            passed_tests += 1
            template_used = demo_result.get("template_used", "Unknown")
            print(f"✅ PASS - Template: {template_used}")
        else:
            failed_tests += 1
            print(f"❌ FAIL - Issues:")
            for issue in issues:
                print(f"   • {issue}")
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 TEST SUMMARY")
    print("=" * 60)
    print(f"Total Tests:  {total_tests}")
    print(f"Passed:       {passed_tests} ✅")
    print(f"Failed:       {failed_tests} ❌")
    print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if failed_tests > 0:
        print(f"\n❌ FAILED TESTS:")
        for result in results:
            if not result["is_valid"]:
                print(f"   • {result['company_name']} ({result['industry']})")
                for issue in result["issues"]:
                    print(f"     - {issue}")
    
    # Return appropriate exit code
    sys.exit(0 if failed_tests == 0 else 1)

if __name__ == "__main__":
    main() 