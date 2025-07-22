#!/usr/bin/env python3
"""
Ultra Simple API Gateway - Just for testing
"""

from flask import Flask, jsonify
import os
import time

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Simple health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'ultra_simple_gateway',
        'timestamp': time.time(),
        'message': 'Protection stack operational'
    })

@app.route('/api/test', methods=['GET'])
def test():
    """Simple test endpoint"""
    return jsonify({
        'message': 'Test successful',
        'timestamp': time.time()
    })

if __name__ == '__main__':
    port = int(os.getenv('GATEWAY_PORT', 8001))
    print(f"🚀 Starting Ultra Simple Gateway on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True) 