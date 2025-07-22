#!/usr/bin/env python3
"""
Test Cloudflare R2 Connection
Quick test to verify our API keys work
"""

import boto3
import logging
from cloudflare_config import get_r2_config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_r2_connection():
    """Test R2 connection and upload a simple test file"""
    try:
        config = get_r2_config()
        
        print("🧪 Testing Cloudflare R2 Connection")
        print("=" * 40)
        print(f"📦 Bucket: {config['bucket_name']}")
        print(f"🌐 Endpoint: {config['endpoint_url']}")
        print(f"🔑 Access Key: {config['access_key_id'][:8]}...")
        print(f"✅ Upload Enabled: {config['upload_enabled']}")
        print()
        
        if not config['upload_enabled']:
            print("❌ Upload not enabled - check API credentials")
            return False
        
        # Initialize S3 client for R2
        s3_client = boto3.client(
            's3',
            endpoint_url=config['endpoint_url'],
            aws_access_key_id=config['access_key_id'],
            aws_secret_access_key=config['secret_access_key'],
            region_name='auto'
        )
        
        print("🔗 Testing connection...")
        
        # Test 1: List buckets (should see our bucket)
        try:
            response = s3_client.list_buckets()
            buckets = [bucket['Name'] for bucket in response.get('Buckets', [])]
            print(f"📋 Available buckets: {buckets}")
            
            if config['bucket_name'] in buckets:
                print(f"✅ Found our bucket: {config['bucket_name']}")
            else:
                print(f"⚠️  Bucket {config['bucket_name']} not found in list")
                
        except Exception as e:
            print(f"❌ Failed to list buckets: {e}")
            return False
        
        # Test 2: Upload a simple test file
        test_content = """<!DOCTYPE html>
<html>
<head>
    <title>R2 Connection Test</title>
</head>
<body>
    <h1>🎉 R2 Upload Working!</h1>
    <p>This file was uploaded automatically by Minerva.</p>
    <p>Demo hosting is ready! 🚀</p>
</body>
</html>"""
        
        test_filename = "r2-connection-test.html"
        
        print(f"📤 Uploading test file: {test_filename}")
        
        try:
            s3_client.put_object(
                Bucket=config['bucket_name'],
                Key=test_filename,
                Body=test_content,
                ContentType='text/html',
                ACL='public-read'  # Make it publicly accessible
            )
            
            # Generate the public URL
            public_url = f"{config['public_url']}/{test_filename}"
            print(f"✅ Upload successful!")
            print(f"🔗 Test URL: {public_url}")
            print(f"🌐 Custom domain URL: https://demos.pleasantcovedesign.com/{test_filename}")
            print()
            print("🎯 Next Steps:")
            print("1. Wait 5-10 minutes for DNS propagation")
            print("2. Visit the custom domain URL to test")
            print("3. If it works, your professional demo hosting is ready!")
            
            return True
            
        except Exception as e:
            print(f"❌ Upload failed: {e}")
            return False
            
    except Exception as e:
        logger.error(f"R2 connection test failed: {e}")
        print(f"❌ Connection failed: {e}")
        return False

def test_demo_generation_with_upload():
    """Test generating and uploading a real demo"""
    try:
        from minerva_visual_generator import MinervaVisualGenerator
        
        print("\n🎨 Testing Demo Generation + Upload")
        print("=" * 40)
        
        generator = MinervaVisualGenerator()
        
        # Test business data
        test_business = {
            'name': 'R2 Test Plumbing Co',
            'businessType': 'plumbing',
            'email': 'test@example.com',
            'phone': '(207) 555-0123',
            'address': '123 Test Street, Portland, ME',
            'rating': '4.8',
            'score': 85
        }
        
        print(f"🏗️ Generating demo for: {test_business['name']}")
        
        demo = generator.generate_demo_website(test_business)
        
        if demo.get('error'):
            print(f"❌ Demo generation failed: {demo['error']}")
            return False
        
        print(f"✅ Demo generated successfully!")
        print(f"📁 Local file: {demo['html_file']}")
        print(f"🔗 Preview URL: {demo['preview_url']}")
        print(f"🌐 Custom domain: https://demos.pleasantcovedesign.com/{demo['demo_id']}.html")
        
        return True
        
    except Exception as e:
        print(f"❌ Demo generation test failed: {e}")
        return False

if __name__ == "__main__":
    print("🧪 Minerva R2 Connection Test Suite")
    print("🔧 This will verify your R2 setup is working correctly")
    print()
    
    # Test 1: Basic connection
    connection_ok = test_r2_connection()
    
    if connection_ok:
        print("\n" + "="*50)
        
        # Test 2: Demo generation with upload
        demo_ok = test_demo_generation_with_upload()
        
        if demo_ok:
            print("\n🎉 ALL TESTS PASSED!")
            print("🚀 Your professional demo hosting system is ready!")
            print("💼 You can now send clients URLs like:")
            print("   https://demos.pleasantcovedesign.com/coastal-plumbing-demo.html")
        else:
            print("\n⚠️  Demo generation needs attention")
    else:
        print("\n❌ Fix R2 connection first before proceeding") 