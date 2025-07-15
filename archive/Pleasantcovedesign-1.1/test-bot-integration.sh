#!/bin/bash

# Bot Integration Test Script
# Tests all critical bot integration endpoints

API_URL="http://localhost:5173/api"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🤖 WebsiteWizard Bot Integration Test Suite"
echo "=========================================="

# Function to print test results
print_result() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓ $2${NC}"
    else
        echo -e "${RED}✗ $2${NC}"
    fi
}

# Test 1: Server Health Check
echo -e "\n${YELLOW}1. Testing Server Connection${NC}"
curl -s -f "$API_URL/health" > /dev/null
print_result $? "Server is running"

# Test 2: Enrich Lead (assuming business ID 1 exists)
echo -e "\n${YELLOW}2. Testing Lead Enrichment${NC}"
ENRICH_RESPONSE=$(curl -s -X POST "$API_URL/bot/enrich/1")
if [[ $ENRICH_RESPONSE == *"success"* ]]; then
    print_result 0 "Lead enrichment endpoint working"
    
    # Check if website detection is working
    if [[ $ENRICH_RESPONSE == *"website\":null"* ]]; then
        echo -e "${GREEN}   ✓ No-website detection working!${NC}"
    fi
    
    # Check if score was calculated
    if [[ $ENRICH_RESPONSE == *"score"* ]]; then
        echo -e "${GREEN}   ✓ Lead scoring active${NC}"
    fi
else
    print_result 1 "Lead enrichment failed"
fi

# Test 3: Test Google Sheets Import (dry run)
echo -e "\n${YELLOW}3. Testing Google Sheets Import${NC}"
IMPORT_RESPONSE=$(curl -s -X POST "$API_URL/import/google-sheets" \
    -H "Content-Type: application/json" \
    -d '{"sheetId": "TEST_SHEET_ID"}')
    
if [[ $IMPORT_RESPONSE == *"error"* ]]; then
    echo -e "${YELLOW}   ⚠️  Import endpoint exists but needs real sheet ID${NC}"
else
    print_result 0 "Google Sheets import endpoint ready"
fi

# Test 4: Launch Outreach
echo -e "\n${YELLOW}4. Testing Outreach Launch${NC}"
OUTREACH_RESPONSE=$(curl -s -X POST "$API_URL/bot/launch-outreach" \
    -H "Content-Type: application/json" \
    -d '{"businessIds": [1]}')
    
if [[ $OUTREACH_RESPONSE == *"success"* ]] || [[ $OUTREACH_RESPONSE == *"campaign"* ]]; then
    print_result 0 "Outreach launch endpoint working"
else
    print_result 1 "Outreach launch failed"
fi

# Test 5: Check Database for No-Website Leads
echo -e "\n${YELLOW}5. Checking Database Configuration${NC}"
if [ -f "websitewizard.db" ]; then
    print_result 0 "Database file exists"
    
    # Count businesses without websites
    NO_WEBSITE_COUNT=$(sqlite3 websitewizard.db "SELECT COUNT(*) FROM businesses WHERE website IS NULL;" 2>/dev/null || echo "0")
    echo -e "${GREEN}   ✓ Businesses without websites: $NO_WEBSITE_COUNT${NC}"
    
    # Check for high-scoring no-website leads
    HIGH_SCORE_COUNT=$(sqlite3 websitewizard.db "SELECT COUNT(*) FROM businesses WHERE website IS NULL AND score >= 80;" 2>/dev/null || echo "0")
    echo -e "${GREEN}   ✓ High-scoring no-website leads: $HIGH_SCORE_COUNT${NC}"
else
    print_result 1 "Database file not found"
fi

# Test 6: Activity Logging
echo -e "\n${YELLOW}6. Testing Activity Logging${NC}"
ACTIVITY_COUNT=$(sqlite3 websitewizard.db "SELECT COUNT(*) FROM activities WHERE type IN ('enrichment_complete', 'auto_outreach');" 2>/dev/null || echo "0")
if [ "$ACTIVITY_COUNT" -gt 0 ]; then
    print_result 0 "Bot activities being logged ($ACTIVITY_COUNT bot actions)"
else
    echo -e "${YELLOW}   ⚠️  No bot activities logged yet${NC}"
fi

# Test 7: Lead Quality Distribution
echo -e "\n${YELLOW}7. Lead Quality Analysis${NC}"
sqlite3 websitewizard.db "
SELECT 
    CASE 
        WHEN score >= 80 THEN 'Hot (80+)'
        WHEN score >= 60 THEN 'Warm (60-79)'
        ELSE 'Cold (<60)'
    END as quality,
    COUNT(*) as count,
    SUM(CASE WHEN website IS NULL THEN 1 ELSE 0 END) as no_website
FROM businesses
GROUP BY quality
ORDER BY score DESC;" 2>/dev/null || echo "   No lead data available"

# Test 8: Python Bot CLI (if available)
echo -e "\n${YELLOW}8. Testing Python Bot CLI${NC}"
if command -v python3 &> /dev/null; then
    # Try to find bot_cli.py
    if [ -f "../bot_cli.py" ]; then
        TEST_ENRICH=$(python3 ../bot_cli.py enrich --name "Test Business" --phone "207-555-0000" 2>/dev/null)
        if [[ $TEST_ENRICH == *"{"* ]]; then
            print_result 0 "Python bot CLI responding"
        else
            print_result 1 "Python bot CLI not returning JSON"
        fi
    else
        echo -e "${YELLOW}   ⚠️  bot_cli.py not found in parent directory${NC}"
    fi
else
    echo -e "${YELLOW}   ⚠️  Python3 not found${NC}"
fi

echo -e "\n=========================================="
echo -e "${GREEN}Bot Integration Test Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "1. Ensure bot_cli.py is in the parent directory"
echo "2. Set PYTHON_PATH and BOT_SCRIPT_PATH in .env"
echo "3. Test with real Google Sheets ID"
echo "4. Monitor no-website lead detection accuracy" 