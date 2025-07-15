# Local Website Business Automation

A complete system for finding, contacting, and selling websites to small businesses in Midcoast Maine with minimal manual work.

## Overview

This project automates the process of:
1. Finding local businesses without websites
2. Reaching out to them via SMS
3. Managing leads and client information
4. Creating and deploying websites 

All with minimal manual effort. The system is designed to help you earn $350+ profit per site ($400 initial build fee - $50 Fiverr cost) plus $50/month recurring revenue.

## Project Structure

```
localwebsitebuilder/
├── scrapers/               # Google Maps scraping tools
├── data/                   # Business data storage
├── outreach/               # SMS automation tools
├── templates/              # Website templates
├── fulfillment/            # Website building automation
├── main.py                 # Main application entry point
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# Twilio credentials for SMS
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Your business information
YOUR_NAME=Your Name
YOUR_EMAIL=your_email@example.com
YOUR_PHONE=your_phone_number
```

### 3. Chrome WebDriver

The scraper uses Selenium with Chrome. Make sure you have Chrome installed and the appropriate ChromeDriver for your Chrome version.

## Usage Guide

### Step 1: Find Businesses Without Websites

```bash
python scrapers/google_maps_scraper.py
```

This will:
- Scrape Google Maps for businesses in Midcoast Maine
- Save raw data to the `data/` directory as CSV files

### Step 2: Process Business Data

```bash
python data/process_data.py
```

This will:
- Combine all scraped data files
- Remove businesses with websites
- Remove duplicates
- Create a clean lead list in `data/clean_leads.csv`
- Generate a JSON file for outreach automation

### Step 3: Automated SMS Outreach

```bash
# Test mode (simulation)
python outreach/sms_automation.py --test

# Live mode with limited number of messages
python outreach/sms_automation.py --limit 5

# Full campaign
python outreach/sms_automation.py
```

### Step 4: Client Information Collection

Use the included client information form:

```bash
python fulfillment/website_builder.py
```

This will:
- Generate a client information form template
- Set up the structure for tracking clients
- Create instructions for Fiverr freelancers

### Step 5: Website Creation & Fulfillment

Once you've closed a client:

1. Create a client folder with their info
2. Generate Fiverr instructions
3. Hire a Fiverr developer (~$50)
4. Set up hosting (Namecheap + EasyWP, Hostinger, etc.)

## Business Templates

The `templates/` directory contains a ready-to-use local business website template that can be customized for any service business. This template includes:

- Modern, responsive design
- Optimized for local SEO
- Contact form
- Gallery/portfolio section
- Testimonials
- Calls to action

## Financial Model

- **Setup Fee**: $400 (one-time)
- **Fiverr Cost**: $50 (one-time)
- **Hosting/Maintenance**: $50/month (recurring)
- **Your Profit**: $350 setup + $50/month recurring

With just 10 clients, you'll earn $3,500 in setup fees and $500/month in recurring revenue!

## Scaling Your Business

To scale this business:
1. Run the automation for multiple towns/regions
2. Hire a virtual assistant to manage lead responses
3. Create templated email responses for common questions
4. Build a network of reliable Fiverr developers
5. Consider white-labeling platforms like Wix, Webflow, or Framer

## Support

For questions or assistance, please reach out to [your contact information].

---

**Happy automating!** 📈 💻
