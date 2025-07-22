
import http.server
import json
import time

start_time = time.time()
requests = 0

class HealthHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        global requests
        requests += 1
        
        if self.path == "/health":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            
            data = {
                "status": "healthy",
                "uptime_seconds": int(time.time() - start_time),
                "request_count": requests,
                "service": "minimal-gateway"
            }
            self.wfile.write(json.dumps(data).encode())
        else:
            self.send_response(404)
            self.end_headers()
    
    def log_message(self, format, *args):
        pass  # Suppress logs

print("Minimal health server running on :5000")
server = http.server.HTTPServer(("", 5000), HealthHandler)
server.serve_forever()
