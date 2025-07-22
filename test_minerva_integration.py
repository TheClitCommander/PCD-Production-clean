#!/usr/bin/env python3
"""
Test Minerva Integration with Pleasant Cove Design
"""

import requests
import time
import json

def test_pleasant_cove_backend():
    """Test if Pleasant Cove backend is running"""
    try:
        response = requests.get("http://localhost:5173/health", timeout=5)
        if response.status_code == 200:
            print("✅ Pleasant Cove backend is running")
            return True
        else:
            print(f"❌ Pleasant Cove backend returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Pleasant Cove backend not accessible: {e}")
        return False

def test_minerva_dashboard():
    """Test if Minerva dashboard is running"""
    try:
        response = requests.get("http://localhost:8004/health", timeout=5)
        if response.status_code == 200:
            print("✅ Minerva dashboard is running")
            return True
        else:
            print(f"❌ Minerva dashboard returned {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Minerva dashboard not accessible: {e}")
        return False

def test_minerva_lead_analysis():
    """Test Minerva's lead analysis"""
    try:
        response = requests.get("http://localhost:8004/api/analyze/high_priority", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Minerva lead analysis working: {data.get('total_count', 0)} high-priority leads found")
            return True
        else:
            print(f"❌ Minerva lead analysis failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Minerva lead analysis error: {e}")
        return False

def test_full_integration():
    """Test the complete integration"""
    print("🤖 Testing Minerva + Pleasant Cove Integration")
    print("=" * 50)
    
    # Test backend
    backend_ok = test_pleasant_cove_backend()
    
    # Test Minerva dashboard
    minerva_ok = test_minerva_dashboard()
    
    # Test lead analysis
    analysis_ok = test_minerva_lead_analysis()
    
    print("\n" + "=" * 50)
    print("📊 Integration Test Results:")
    print(f"   Pleasant Cove Backend: {'✅ PASS' if backend_ok else '❌ FAIL'}")
    print(f"   Minerva Dashboard:     {'✅ PASS' if minerva_ok else '❌ FAIL'}")
    print(f"   Lead Analysis:         {'✅ PASS' if analysis_ok else '❌ FAIL'}")
    
    if backend_ok and minerva_ok and analysis_ok:
        print("\n🎉 ALL TESTS PASSED!")
        print("\n🌐 Access Points:")
        print("   - Pleasant Cove:     http://localhost:5173")
        print("   - Minerva Dashboard: http://localhost:8004")
        print("\n📋 Next Steps:")
        print("   1. Add some test leads to Pleasant Cove")
        print("   2. Use Minerva dashboard to analyze and launch outreach")
        print("   3. Monitor performance and iterate")
        return True
    else:
        print("\n⚠️  Some tests failed. Check the logs:")
        if not backend_ok:
            print("   - Start Pleasant Cove: cd pleasantcovedesign && npm start")
        if not minerva_ok:
            print("   - Start Minerva: python minerva_dashboard.py")
        return False

if __name__ == "__main__":
    success = test_full_integration()
    exit(0 if success else 1) 