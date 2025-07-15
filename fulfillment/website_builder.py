#!/usr/bin/env python3
"""
Website Builder and Fulfillment System
--------------------------------------
This script helps automate the fulfillment process for website creation.
It generates instructions for outsourcing, handles client information,
and provides templates for quick website setup.
"""

import os
import json
import csv
import pandas as pd
from datetime import datetime
import shutil
import re

class WebsiteFulfillment:
    def __init__(self):
        """Initialize the fulfillment system"""
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.template_dir = os.path.join(self.base_dir, "templates")
        self.client_data_dir = os.path.join(self.base_dir, "data", "clients")
        
        # Create client data directory if it doesn't exist
        os.makedirs(self.client_data_dir, exist_ok=True)
        
        # Load client tracking file or create if it doesn't exist
        self.client_tracker_file = os.path.join(self.client_data_dir, "client_tracker.csv")
        if not os.path.exists(self.client_tracker_file):
            with open(self.client_tracker_file, 'w', newline='') as f:
                writer = csv.writer(f)
                writer.writerow(['client_id', 'business_name', 'contact_name', 'phone', 
                                'email', 'website', 'status', 'created_date', 'launch_date', 
                                'monthly_fee', 'notes'])
    
    def create_client_folder(self, business_name, contact_info):
        """Create a new client folder and initialize tracking"""
        # Clean business name for folder name
        folder_name = re.sub(r'[^\w\s-]', '', business_name).strip().replace(' ', '_').lower()
        client_id = f"{folder_name}_{datetime.now().strftime('%Y%m%d')}"
        
        # Create client folder
        client_folder = os.path.join(self.client_data_dir, client_id)
        os.makedirs(client_folder, exist_ok=True)
        
        # Save contact information
        contact_info['business_name'] = business_name
        contact_info['client_id'] = client_id
        contact_info['created_date'] = datetime.now().strftime("%Y-%m-%d")
        contact_info['status'] = 'new'
        
        with open(os.path.join(client_folder, "client_info.json"), 'w') as f:
            json.dump(contact_info, f, indent=4)
        
        # Add to tracker
        self._add_to_tracker(contact_info)
        
        return client_id, client_folder
    
    def _add_to_tracker(self, client_info):
        """Add a new client to the tracking spreadsheet"""
        # Read existing tracker
        if os.path.exists(self.client_tracker_file) and os.path.getsize(self.client_tracker_file) > 0:
            df = pd.read_csv(self.client_tracker_file)
        else:
            df = pd.DataFrame(columns=['client_id', 'business_name', 'contact_name', 'phone', 
                                      'email', 'website', 'status', 'created_date', 'launch_date', 
                                      'monthly_fee', 'notes'])
        
        # Create new row
        new_row = {
            'client_id': client_info.get('client_id', ''),
            'business_name': client_info.get('business_name', ''),
            'contact_name': client_info.get('contact_name', ''),
            'phone': client_info.get('phone', ''),
            'email': client_info.get('email', ''),
            'website': '',
            'status': client_info.get('status', 'new'),
            'created_date': client_info.get('created_date', datetime.now().strftime("%Y-%m-%d")),
            'launch_date': '',
            'monthly_fee': '50',
            'notes': client_info.get('notes', '')
        }
        
        # Append to dataframe and save
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        df.to_csv(self.client_tracker_file, index=False)
    
    def generate_fiverr_instructions(self, client_id):
        """Generate instructions for Fiverr freelancer"""
        client_folder = os.path.join(self.client_data_dir, client_id)
        
        if not os.path.exists(client_folder):
            raise ValueError(f"Client folder not found: {client_id}")
        
        # Load client info
        with open(os.path.join(client_folder, "client_info.json"), 'r') as f:
            client_info = json.load(f)
        
        # Generate instructions
        instructions = f"""
# Website Creation Instructions for {client_info['business_name']}

## Business Information
- Business Name: {client_info['business_name']}
- Business Type: {client_info.get('business_type', 'Service Business')}
- Location: {client_info.get('location', 'Midcoast Maine')}
- Phone: {client_info.get('phone', 'N/A')}
- Email: {client_info.get('email', 'N/A')}

## Website Requirements
- Simple, professional design for a local {client_info.get('business_type', 'service')} business
- Mobile responsive
- 5 pages: Home, About, Services, Contact, Gallery/Portfolio
- Contact form
- Google Maps integration
- Business hours display
- Testimonials section (if provided)

## Branding Guidelines
- Colors: {client_info.get('colors', 'Professional, clean design with blues and whites')}
- Logo: {client_info.get('has_logo', 'No logo provided - create simple text-based logo')}
- Style: Professional, trustworthy, local business feel

## Delivery Requirements
- WordPress site (preferred) or Wix/Webflow if easier
- Complete site with all pages
- Responsive on mobile devices
- Basic SEO setup (title tags, meta descriptions)
- Contact form working
- All plugins properly installed and configured

## Timeline
- Required within 3 days of order

## Additional Notes
{client_info.get('notes', 'N/A')}

Thank you for your work!
"""
        
        # Save instructions to client folder
        instructions_file = os.path.join(client_folder, "fiverr_instructions.md")
        with open(instructions_file, 'w') as f:
            f.write(instructions)
        
        return instructions_file
    
    def generate_client_form(self):
        """Generate HTML form to collect client information"""
        form_html = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Website Information Form</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
        }
        input[type="text"],
        input[type="email"],
        input[type="tel"],
        textarea,
        select {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 16px;
        }
        .button {
            background-color: #4CAF50;
            color: white;
            padding: 12px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        .button:hover {
            background-color: #45a049;
        }
    </style>
</head>
<body>
    <h1>Website Information Form</h1>
    <p>Please provide the following information to help us create your business website.</p>
    
    <form id="websiteForm">
        <div class="form-group">
            <label for="businessName">Business Name *</label>
            <input type="text" id="businessName" name="businessName" required>
        </div>
        
        <div class="form-group">
            <label for="contactName">Contact Person's Name *</label>
            <input type="text" id="contactName" name="contactName" required>
        </div>
        
        <div class="form-group">
            <label for="email">Email Address *</label>
            <input type="email" id="email" name="email" required>
        </div>
        
        <div class="form-group">
            <label for="phone">Phone Number *</label>
            <input type="tel" id="phone" name="phone" required>
        </div>
        
        <div class="form-group">
            <label for="businessType">Business Type *</label>
            <select id="businessType" name="businessType" required>
                <option value="">-- Select --</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Electrical">Electrical</option>
                <option value="Mechanical">Mechanical/Automotive</option>
                <option value="Construction">Construction/Contracting</option>
                <option value="Landscaping">Landscaping/Outdoor Services</option>
                <option value="Cleaning">Cleaning Services</option>
                <option value="Other">Other (specify below)</option>
            </select>
        </div>
        
        <div class="form-group">
            <label for="businessTypeOther">If Other, please specify:</label>
            <input type="text" id="businessTypeOther" name="businessTypeOther">
        </div>
        
        <div class="form-group">
            <label for="businessDescription">Brief Description of Your Business (Services Offered) *</label>
            <textarea id="businessDescription" name="businessDescription" rows="4" required></textarea>
        </div>
        
        <div class="form-group">
            <label for="businessAddress">Business Address *</label>
            <textarea id="businessAddress" name="businessAddress" rows="3" required></textarea>
        </div>
        
        <div class="form-group">
            <label for="businessHours">Business Hours *</label>
            <textarea id="businessHours" name="businessHours" rows="7" placeholder="Monday: 9am-5pm&#10;Tuesday: 9am-5pm&#10;etc." required></textarea>
        </div>
        
        <div class="form-group">
            <label for="colorPreference">Color Preferences for Website (if any)</label>
            <input type="text" id="colorPreference" name="colorPreference" placeholder="E.g., Blue and gray, Company colors (specify), etc.">
        </div>
        
        <div class="form-group">
            <label>Do you have a logo?</label>
            <div>
                <input type="radio" id="logoYes" name="hasLogo" value="Yes">
                <label for="logoYes" style="display:inline;">Yes</label>
                
                <input type="radio" id="logoNo" name="hasLogo" value="No" checked style="margin-left:20px;">
                <label for="logoNo" style="display:inline;">No</label>
            </div>
        </div>
        
        <div class="form-group" id="logoUploadGroup" style="display:none;">
            <label for="logoFile">Upload your logo:</label>
            <input type="file" id="logoFile" name="logoFile" accept="image/*">
            <p><small>Or email it to us at your convenience.</small></p>
        </div>
        
        <div class="form-group">
            <label for="additionalNotes">Additional Information or Special Requests</label>
            <textarea id="additionalNotes" name="additionalNotes" rows="4"></textarea>
        </div>
        
        <button type="submit" class="button">Submit Information</button>
    </form>
    
    <script>
        // Show/hide logo upload field based on selection
        document.querySelectorAll('input[name="hasLogo"]').forEach(radio => {
            radio.addEventListener('change', function() {
                document.getElementById('logoUploadGroup').style.display = 
                    this.value === 'Yes' ? 'block' : 'none';
            });
        });
        
        // Form submission handling
        document.getElementById('websiteForm').addEventListener('submit', function(e) {
            e.preventDefault();
            alert('Thank you for submitting your information! We will begin work on your website shortly.');
            // In a real implementation, you would send this data to your server
            console.log('Form submitted');
        });
    </script>
</body>
</html>
"""
        
        # Save form to templates directory
        form_file = os.path.join(self.template_dir, "client_information_form.html")
        os.makedirs(os.path.dirname(form_file), exist_ok=True)
        
        with open(form_file, 'w') as f:
            f.write(form_html)
        
        return form_file
    
    def update_client_status(self, client_id, new_status, notes=None):
        """Update client status in the tracker"""
        if not os.path.exists(self.client_tracker_file):
            raise FileNotFoundError(f"Client tracker file not found: {self.client_tracker_file}")
            
        df = pd.read_csv(self.client_tracker_file)
        
        # Find the client row
        client_row = df['client_id'] == client_id
        if not any(client_row):
            raise ValueError(f"Client ID not found in tracker: {client_id}")
            
        # Update status
        df.loc[client_row, 'status'] = new_status
        
        # Update notes if provided
        if notes:
            df.loc[client_row, 'notes'] = notes
            
        # If status is 'launched', update launch date
        if new_status.lower() == 'launched':
            df.loc[client_row, 'launch_date'] = datetime.now().strftime("%Y-%m-%d")
            
        # Save updated tracker
        df.to_csv(self.client_tracker_file, index=False)
        
        return True

def main():
    """Example usage of the WebsiteFulfillment class"""
    fulfillment = WebsiteFulfillment()
    
    # Generate client information form template
    form_file = fulfillment.generate_client_form()
    print(f"Client information form template created: {form_file}")
    
    # Example: Create a new client
    # client_id, client_folder = fulfillment.create_client_folder(
    #     "Bob's Plumbing", 
    #     {
    #         "contact_name": "Bob Smith",
    #         "phone": "207-555-1234",
    #         "email": "bob@example.com",
    #         "business_type": "Plumbing",
    #         "location": "Brunswick, Maine",
    #         "notes": "Client wants a simple website with testimonials from previous customers."
    #     }
    # )
    # print(f"Created client folder: {client_folder}")
    
    # # Generate Fiverr instructions
    # instructions_file = fulfillment.generate_fiverr_instructions(client_id)
    # print(f"Generated Fiverr instructions: {instructions_file}")

if __name__ == "__main__":
    main()
