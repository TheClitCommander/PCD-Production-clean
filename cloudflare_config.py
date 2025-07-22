#!/usr/bin/env python3
"""
Cloudflare R2 Configuration for Minerva Demo System
Configure this with your actual API credentials when available
"""

import os

# Cloudflare R2 Configuration
CLOUDFLARE_R2_CONFIG = {
    # Your bucket information (from Cloudflare dashboard)
    'bucket_name': 'minerva-lead-mockups-2025',
    'account_id': 'fa7598d9548bb7564ff3585546e3e5a8',
    'endpoint_url': 'https://fa7598d9548bb7564ff3585546e3e5a8.r2.cloudflarestorage.com',
    
    # Public URL for accessing demos
    'public_url': 'https://pub-68bdc8d034ed66782c0cda99d4ffbb4.r2.dev',
    
            # API credentials (set these when you get your R2 API tokens)
        'access_key_id': os.getenv('R2_ACCESS_KEY_ID', '2d8972a67ede0ad513d3f48dfe1aee42'),
        'secret_access_key': os.getenv('R2_SECRET_ACCESS_KEY', '649a9b6537b17f1443de39e3ede13535215346e36051fa76b9f3ff8dc8222e3f'),
        
        # Upload settings
        'upload_enabled': True,  # Credentials are now available
    'local_fallback': True,   # Use local storage until upload is ready
}

def get_r2_config():
    """Get the R2 configuration with environment variable overrides"""
    config = CLOUDFLARE_R2_CONFIG.copy()
    
    # Check if we have API credentials
    if config['access_key_id'] and config['secret_access_key']:
        config['upload_enabled'] = True
    
    return config

def is_upload_ready():
    """Check if R2 upload is configured and ready"""
    config = get_r2_config()
    return config['upload_enabled']

def get_demo_url(filename):
    """Generate the public URL for a demo file"""
    config = get_r2_config()
    
    if config['upload_enabled']:
        # Use public R2 URL
        return f"{config['public_url']}/{filename}"
    else:
        # Use local fallback (for testing)
        return f"http://localhost:8000/demos/{filename}"

# Environment variable setup guide
ENV_SETUP_GUIDE = """
To enable R2 uploads, set these environment variables:

export R2_ACCESS_KEY_ID="your_access_key_here"
export R2_SECRET_ACCESS_KEY="your_secret_key_here"

Or add them to a .env file:
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
"""

if __name__ == "__main__":
    config = get_r2_config()
    print("🪣 Cloudflare R2 Configuration:")
    print(f"   Bucket: {config['bucket_name']}")
    print(f"   Account: {config['account_id']}")
    print(f"   Upload Ready: {config['upload_enabled']}")
    print(f"   Public URL: {config['public_url']}")
    
    if not config['upload_enabled']:
        print("\n⚠️  Upload not configured yet")
        print(ENV_SETUP_GUIDE) 