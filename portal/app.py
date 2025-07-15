#!/usr/bin/env python3
"""
Client Portal Web Application
----------------------------
A Flask-based client portal that allows website clients to:
1. View their project status and progress
2. Approve designs
3. Communicate with the service provider
4. Upload and manage content
"""

import os
import json
import secrets
import hashlib
import uuid
from datetime import datetime, timedelta
from flask import Flask, request, render_template, redirect, url_for, flash, session, send_from_directory
from werkzeug.utils import secure_filename
import pandas as pd
import sys

# Add parent directory to path so we can import from other modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from communication.messaging import CommunicationSystem

app = Flask(__name__)
app.secret_key = os.environ.get('FLASK_SECRET_KEY', secrets.token_hex(16))
app.config['UPLOAD_FOLDER'] = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize communication system
comm_system = CommunicationSystem()

# Base directory for client data
DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data', 'clients')
os.makedirs(DATA_DIR, exist_ok=True)

# Project status stages
PROJECT_STAGES = [
    'onboarding',      # Collecting client information
    'content',         # Waiting for client to provide content
    'design',          # Creating design mockups
    'revisions',       # Making revisions based on feedback
    'development',     # Building the actual website
    'review',          # Final client review
    'launch',          # Website is live
    'maintenance'      # Ongoing maintenance
]

@app.route('/')
def home():
    """Home page - redirects to login if not authenticated"""
    if 'client_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    """Handle client login"""
    if request.method == 'POST':
        email = request.form.get('email', '').lower()
        password = request.form.get('password', '')
        
        client = authenticate_client(email, password)
        if client:
            session['client_id'] = client['client_id']
            session['business_name'] = client['business_name']
            flash('Login successful!', 'success')
            return redirect(url_for('dashboard'))
        else:
            flash('Invalid email or password', 'error')
    
    return render_template('login.html')

@app.route('/logout')
def logout():
    """Handle client logout"""
    session.clear()
    flash('You have been logged out', 'info')
    return redirect(url_for('login'))

@app.route('/dashboard')
def dashboard():
    """Main client dashboard showing project status"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    client = get_client_data(client_id)
    
    if not client:
        session.clear()
        flash('Client account not found', 'error')
        return redirect(url_for('login'))
    
    # Get project status and progress
    project = get_project_status(client_id)
    
    # Get recent messages
    messages = get_recent_messages(client_id, limit=5)
    
    return render_template('dashboard.html', 
                          client=client, 
                          project=project, 
                          messages=messages,
                          stages=PROJECT_STAGES)

@app.route('/profile', methods=['GET', 'POST'])
def profile():
    """Client profile page for viewing and updating account information"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    client = get_client_data(client_id)
    
    if request.method == 'POST':
        # Update profile information
        updates = {
            'contact_name': request.form.get('contact_name'),
            'phone': request.form.get('phone'),
            'email': request.form.get('email'),
            'address': request.form.get('address'),
        }
        
        # Check if password should be updated
        new_password = request.form.get('new_password')
        if new_password and len(new_password) >= 8:
            confirm_password = request.form.get('confirm_password')
            if new_password == confirm_password:
                # Hash the new password
                salt = client.get('salt', secrets.token_hex(8))
                password_hash = hash_password(new_password, salt)
                updates['password_hash'] = password_hash
                updates['salt'] = salt
            else:
                flash('Passwords do not match', 'error')
                return render_template('profile.html', client=client)
        
        # Save updates
        update_client_data(client_id, updates)
        flash('Profile updated successfully', 'success')
        return redirect(url_for('profile'))
    
    return render_template('profile.html', client=client)

@app.route('/messages')
def messages():
    """Message center for client-provider communication"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    client = get_client_data(client_id)
    
    # Get full message history
    messages = get_recent_messages(client_id, limit=100)
    
    return render_template('messages.html', client=client, messages=messages)

@app.route('/send_message', methods=['POST'])
def send_message():
    """Handle sending a new message"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    client = get_client_data(client_id)
    
    message = request.form.get('message', '')
    channel = request.form.get('channel', 'portal')
    
    if message:
        # Record the message in our system
        record_client_message(client_id, message, channel)
        
        # If this is an SMS reply, also send via Twilio
        if channel == 'sms':
            comm_system.send_sms(
                to_phone=client.get('admin_phone'),  # Send to admin
                message=f"Portal message from {client.get('business_name')}: {message}",
                client_id=client_id,
                business_name=client.get('business_name')
            )
            flash('Message sent via SMS', 'success')
        else:
            # Default to portal message
            flash('Message sent', 'success')
    
    # Redirect back to the appropriate page
    referrer = request.referrer
    if 'messages' in referrer:
        return redirect(url_for('messages'))
    return redirect(url_for('dashboard'))

@app.route('/content')
def content():
    """Content management page"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    client = get_client_data(client_id)
    
    # Get content items already uploaded
    content_items = get_client_content(client_id)
    
    return render_template('content.html', client=client, content_items=content_items)

@app.route('/upload_content', methods=['POST'])
def upload_content():
    """Handle file uploads for website content"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    
    if 'file' not in request.files:
        flash('No file part', 'error')
        return redirect(url_for('content'))
    
    file = request.files['file']
    if file.filename == '':
        flash('No selected file', 'error')
        return redirect(url_for('content'))
    
    if file:
        # Create client uploads directory if it doesn't exist
        client_upload_dir = os.path.join(app.config['UPLOAD_FOLDER'], client_id)
        os.makedirs(client_upload_dir, exist_ok=True)
        
        # Secure the filename and save the file
        filename = secure_filename(file.filename)
        file_path = os.path.join(client_upload_dir, filename)
        file.save(file_path)
        
        # Record the upload in client's content list
        content_type = request.form.get('content_type', 'image')
        description = request.form.get('description', '')
        
        add_content_item(client_id, filename, content_type, description)
        
        flash('File uploaded successfully', 'success')
    
    return redirect(url_for('content'))

@app.route('/uploads/<client_id>/<filename>')
def uploaded_file(client_id, filename):
    """Serve uploaded files"""
    if 'client_id' not in session or session['client_id'] != client_id:
        return "Unauthorized", 403
    
    return send_from_directory(os.path.join(app.config['UPLOAD_FOLDER'], client_id), filename)

@app.route('/approve_design/<design_id>')
def approve_design(design_id):
    """Handle design approval"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    client = get_client_data(client_id)
    
    # Update design approval status
    approve_client_design(client_id, design_id)
    
    # Send notification to admin
    comm_system.send_email(
        to_email=client.get('admin_email'),
        subject=f"Design Approved by {client.get('business_name')}",
        message=f"The client {client.get('business_name')} has approved design {design_id}.",
        client_id=client_id,
        business_name=client.get('business_name')
    )
    
    flash('Design approved successfully', 'success')
    return redirect(url_for('dashboard'))

@app.route('/designs')
def designs():
    """Design review page"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    client = get_client_data(client_id)
    
    # Get designs for the client
    designs = get_client_designs(client_id)
    
    return render_template('designs.html', client=client, designs=designs)

@app.route('/provide_feedback/<design_id>', methods=['POST'])
def provide_feedback(design_id):
    """Handle design feedback submission"""
    if 'client_id' not in session:
        return redirect(url_for('login'))
    
    client_id = session['client_id']
    client = get_client_data(client_id)
    
    feedback = request.form.get('feedback', '')
    
    if feedback:
        # Record the feedback
        add_design_feedback(client_id, design_id, feedback)
        
        # Notify admin
        comm_system.send_email(
            to_email=client.get('admin_email'),
            subject=f"Design Feedback from {client.get('business_name')}",
            message=f"The client {client.get('business_name')} has provided feedback on design {design_id}:\n\n{feedback}",
            client_id=client_id,
            business_name=client.get('business_name')
        )
        
        flash('Feedback submitted successfully', 'success')
    
    return redirect(url_for('designs'))

# Helper functions for client data management
def get_client_data(client_id):
    """Get client information from client_info.json"""
    client_dir = os.path.join(DATA_DIR, client_id)
    client_info_file = os.path.join(client_dir, "client_info.json")
    
    if not os.path.exists(client_info_file):
        return None
    
    try:
        with open(client_info_file, 'r') as f:
            client_info = json.load(f)
            client_info['client_id'] = client_id
            return client_info
    except Exception as e:
        print(f"Error loading client data: {e}")
        return None

def update_client_data(client_id, updates):
    """Update client information in client_info.json"""
    client_dir = os.path.join(DATA_DIR, client_id)
    client_info_file = os.path.join(client_dir, "client_info.json")
    
    if not os.path.exists(client_info_file):
        return False
    
    try:
        with open(client_info_file, 'r') as f:
            client_info = json.load(f)
        
        # Apply updates
        client_info.update(updates)
        
        with open(client_info_file, 'w') as f:
            json.dump(client_info, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Error updating client data: {e}")
        return False

def authenticate_client(email, password):
    """Authenticate a client by email and password"""
    # Search through all client directories
    for client_id in os.listdir(DATA_DIR):
        client_dir = os.path.join(DATA_DIR, client_id)
        client_info_file = os.path.join(client_dir, "client_info.json")
        
        if os.path.exists(client_info_file):
            try:
                with open(client_info_file, 'r') as f:
                    client_info = json.load(f)
                
                if client_info.get('email', '').lower() == email.lower():
                    # Check password
                    stored_hash = client_info.get('password_hash')
                    salt = client_info.get('salt')
                    
                    if stored_hash and salt:
                        password_hash = hash_password(password, salt)
                        if password_hash == stored_hash:
                            client_info['client_id'] = client_id
                            return client_info
            except Exception as e:
                print(f"Error during authentication: {e}")
    
    return None

def hash_password(password, salt):
    """Create a secure hash of a password"""
    return hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000).hex()

def get_project_status(client_id):
    """Get the current project status and progress"""
    client_dir = os.path.join(DATA_DIR, client_id)
    project_file = os.path.join(client_dir, "project_status.json")
    
    if not os.path.exists(project_file):
        # Create a default project status
        default_status = {
            "current_stage": "onboarding",
            "progress": 10,
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "next_steps": "Please complete the onboarding form and provide your business information.",
            "stage_history": [
                {
                    "stage": "onboarding",
                    "started": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
            ]
        }
        
        os.makedirs(client_dir, exist_ok=True)
        with open(project_file, 'w') as f:
            json.dump(default_status, f, indent=2)
        
        return default_status
    
    try:
        with open(project_file, 'r') as f:
            project_status = json.load(f)
        
        # Calculate days remaining estimate
        if project_status.get('estimated_completion'):
            completion_date = datetime.strptime(project_status['estimated_completion'], "%Y-%m-%d")
            days_remaining = (completion_date - datetime.now()).days
            project_status['days_remaining'] = max(0, days_remaining)
        
        return project_status
    except Exception as e:
        print(f"Error loading project status: {e}")
        return {
            "current_stage": "unknown",
            "progress": 0,
            "error": str(e)
        }

def get_recent_messages(client_id, limit=5):
    """Get recent messages for a client"""
    # Use the communication system to get messages
    messages = comm_system.get_conversation_history(client_id=client_id, limit=limit)
    
    # Also check for portal messages in the client's directory
    client_dir = os.path.join(DATA_DIR, client_id)
    messages_file = os.path.join(client_dir, "messages.json")
    
    if os.path.exists(messages_file):
        try:
            with open(messages_file, 'r') as f:
                portal_messages = json.load(f)
            
            # Convert portal messages to the same format as comm_system messages
            for msg in portal_messages:
                messages.append({
                    "timestamp": msg.get("timestamp"),
                    "client_id": client_id,
                    "direction": msg.get("direction"),
                    "channel": "portal",
                    "message": msg.get("message"),
                    "status": "delivered"
                })
        except Exception as e:
            print(f"Error loading portal messages: {e}")
    
    # Sort messages by timestamp, newest first
    messages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
    
    # Limit to the requested number
    return messages[:limit]

def record_client_message(client_id, message, channel="portal"):
    """Record a message from the client in their messages.json file"""
    client_dir = os.path.join(DATA_DIR, client_id)
    messages_file = os.path.join(client_dir, "messages.json")
    
    # Create messages array or load existing
    if os.path.exists(messages_file):
        try:
            with open(messages_file, 'r') as f:
                messages = json.load(f)
        except:
            messages = []
    else:
        messages = []
    
    # Add new message
    messages.append({
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "direction": "from_client",
        "channel": channel,
        "message": message
    })
    
    # Save updated messages
    os.makedirs(client_dir, exist_ok=True)
    with open(messages_file, 'w') as f:
        json.dump(messages, f, indent=2)
    
    return True

def get_client_content(client_id):
    """Get content items uploaded by the client"""
    client_dir = os.path.join(DATA_DIR, client_id)
    content_file = os.path.join(client_dir, "content.json")
    
    if not os.path.exists(content_file):
        return []
    
    try:
        with open(content_file, 'r') as f:
            content_items = json.load(f)
        return content_items
    except Exception as e:
        print(f"Error loading client content: {e}")
        return []

def add_content_item(client_id, filename, content_type, description):
    """Add a content item to the client's content list"""
    client_dir = os.path.join(DATA_DIR, client_id)
    content_file = os.path.join(client_dir, "content.json")
    
    # Create content array or load existing
    if os.path.exists(content_file):
        try:
            with open(content_file, 'r') as f:
                content_items = json.load(f)
        except:
            content_items = []
    else:
        content_items = []
    
    # Add new content item
    content_items.append({
        "id": str(uuid.uuid4()),
        "filename": filename,
        "content_type": content_type,
        "description": description,
        "uploaded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    })
    
    # Save updated content list
    os.makedirs(client_dir, exist_ok=True)
    with open(content_file, 'w') as f:
        json.dump(content_items, f, indent=2)
    
    return True

def get_client_designs(client_id):
    """Get designs for the client"""
    client_dir = os.path.join(DATA_DIR, client_id)
    designs_file = os.path.join(client_dir, "designs.json")
    
    if not os.path.exists(designs_file):
        return []
    
    try:
        with open(designs_file, 'r') as f:
            designs = json.load(f)
        return designs
    except Exception as e:
        print(f"Error loading client designs: {e}")
        return []

def approve_client_design(client_id, design_id):
    """Mark a design as approved by the client"""
    client_dir = os.path.join(DATA_DIR, client_id)
    designs_file = os.path.join(client_dir, "designs.json")
    
    if not os.path.exists(designs_file):
        return False
    
    try:
        with open(designs_file, 'r') as f:
            designs = json.load(f)
        
        # Find and update the design
        for design in designs:
            if design.get('id') == design_id:
                design['status'] = 'approved'
                design['approved_at'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Save updated designs
        with open(designs_file, 'w') as f:
            json.dump(designs, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Error approving design: {e}")
        return False

def add_design_feedback(client_id, design_id, feedback):
    """Add feedback to a design"""
    client_dir = os.path.join(DATA_DIR, client_id)
    designs_file = os.path.join(client_dir, "designs.json")
    
    if not os.path.exists(designs_file):
        return False
    
    try:
        with open(designs_file, 'r') as f:
            designs = json.load(f)
        
        # Find and update the design
        for design in designs:
            if design.get('id') == design_id:
                if 'feedback' not in design:
                    design['feedback'] = []
                
                design['feedback'].append({
                    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "content": feedback
                })
                
                design['status'] = 'feedback_provided'
        
        # Save updated designs
        with open(designs_file, 'w') as f:
            json.dump(designs, f, indent=2)
        
        return True
    except Exception as e:
        print(f"Error adding design feedback: {e}")
        return False

def create_client_account(business_name, contact_name, email, phone, password=None):
    """Create a new client account"""
    # Generate a client ID from business name
    client_id = business_name.lower().replace(' ', '_') + '_' + secrets.token_hex(4)
    client_dir = os.path.join(DATA_DIR, client_id)
    
    # Check if email already exists
    for existing_id in os.listdir(DATA_DIR):
        existing_client = get_client_data(existing_id)
        if existing_client and existing_client.get('email') == email:
            return None, "Email already exists"
    
    # Create client directory
    os.makedirs(client_dir, exist_ok=True)
    
    # Generate password if not provided
    if not password:
        password = secrets.token_urlsafe(10)
    
    # Hash password
    salt = secrets.token_hex(8)
    password_hash = hash_password(password, salt)
    
    # Create client info
    client_info = {
        "business_name": business_name,
        "contact_name": contact_name,
        "email": email,
        "phone": phone,
        "password_hash": password_hash,
        "salt": salt,
        "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "admin_email": "admin@example.com",  # Replace with your admin email
        "admin_phone": "+15551234567"  # Replace with your admin phone
    }
    
    # Save client info
    client_info_file = os.path.join(client_dir, "client_info.json")
    with open(client_info_file, 'w') as f:
        json.dump(client_info, f, indent=2)
    
    return client_id, password

# Command-line functions for account management
def create_client_from_cli():
    """Create a client account from command line"""
    print("=== Create New Client Account ===")
    business_name = input("Business Name: ")
    contact_name = input("Contact Name: ")
    email = input("Email: ")
    phone = input("Phone: ")
    password = input("Password (leave blank to generate): ")
    
    client_id, result = create_client_account(business_name, contact_name, email, phone, password)
    
    if client_id:
        print(f"Client created successfully!")
        print(f"Client ID: {client_id}")
        print(f"Login Email: {email}")
        if not password:
            print(f"Generated Password: {result}")
    else:
        print(f"Error creating client: {result}")

if __name__ == "__main__":
    # Check for command line arguments
    import sys
    if len(sys.argv) > 1:
        if sys.argv[1] == "create_client":
            create_client_from_cli()
        else:
            print(f"Unknown command: {sys.argv[1]}")
            print("Available commands: create_client")
        sys.exit(0)
    
    # Run the Flask app
    app.run(debug=True, host='0.0.0.0', port=5000)
