#!/usr/bin/env python3
"""
Simple Demo Server for Pleasant Cove Design
Serves generated demo HTML files on port 8005
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse, parse_qs

PORT = 8005
DEMO_DIR = "demos"

class DemoHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DEMO_DIR, **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        super().end_headers()
    
    def do_GET(self):
        # Parse the request
        parsed_path = urlparse(self.path)
        
        # Health check
        if parsed_path.path == '/health':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"status": "healthy", "service": "demo-server"}')
            return
        
        # List demos endpoint
        if parsed_path.path == '/api/demos':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            
            demos = []
            if os.path.exists(DEMO_DIR):
                for filename in os.listdir(DEMO_DIR):
                    if filename.endswith('.html'):
                        demos.append({
                            'filename': filename,
                            'url': f'http://localhost:{PORT}/{filename}',
                            'name': filename.replace('.html', '').replace('_', ' ').title()
                        })
            
            import json
            self.wfile.write(json.dumps({'demos': demos}).encode())
            return
        
        # Default behavior for HTML files
        super().do_GET()
    
    def log_message(self, format, *args):
        # Custom log format
        print(f"🌐 Demo Server: {format % args}")

def start_server():
    """Start the demo server"""
    
    # Create demos directory if it doesn't exist
    if not os.path.exists(DEMO_DIR):
        os.makedirs(DEMO_DIR)
        print(f"📁 Created {DEMO_DIR} directory")
    
    # Start the server
    with socketserver.TCPServer(("", PORT), DemoHandler) as httpd:
        print(f"🚀 Demo Server starting on port {PORT}")
        print(f"📂 Serving files from: {os.path.abspath(DEMO_DIR)}")
        print(f"🌐 Access demos at: http://localhost:{PORT}")
        print(f"📋 List all demos: http://localhost:{PORT}/api/demos")
        print("✨ Press Ctrl+C to stop")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Demo Server stopped")

if __name__ == "__main__":
    start_server() 