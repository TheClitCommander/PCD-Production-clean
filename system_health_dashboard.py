#!/usr/bin/env python3

import requests
import subprocess
import json
import time
import os
from datetime import datetime
from typing import Dict, List, Tuple, Optional

class PleasantCoveHealthDashboard:
    def __init__(self):
        self.project_root = "/Users/bendickinson/Desktop/pleasantcovedesign"
        self.services = {
            "Backend API": {"port": 3000, "health_endpoint": "/health", "critical": True},
            "Admin UI": {"port": 5173, "health_endpoint": None, "critical": True},
            "Widget Server": {"port": 8080, "health_endpoint": None, "critical": True},
            "Demo Server": {"port": 8005, "health_endpoint": "/api/demos", "critical": True},
            "Minerva Bridge": {"port": 8001, "health_endpoint": None, "critical": True}
        }
        
    def check_port_status(self, port: int) -> bool:
        """Check if a port is in use (service is running)"""
        try:
            result = subprocess.run(
                ['lsof', '-i', f':{port}'], 
                capture_output=True, 
                text=True
            )
            return result.returncode == 0
        except Exception:
            return False
    
    def check_health_endpoint(self, port: int, endpoint: str) -> Tuple[bool, Optional[str]]:
        """Check service health via HTTP endpoint"""
        try:
            url = f"http://localhost:{port}{endpoint}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                return True, response.text[:100]  # First 100 chars
            else:
                return False, f"HTTP {response.status_code}"
        except requests.exceptions.RequestException as e:
            return False, str(e)[:100]
    
    def get_service_status(self, name: str, config: Dict) -> Dict:
        """Get comprehensive status for a service"""
        port = config['port']
        is_running = self.check_port_status(port)
        
        status = {
            'name': name,
            'port': port,
            'running': is_running,
            'critical': config['critical'],
            'health_status': 'unknown',
            'health_details': None,
            'last_checked': datetime.now().isoformat()
        }
        
        if is_running and config['health_endpoint']:
            health_ok, health_details = self.check_health_endpoint(port, config['health_endpoint'])
            status['health_status'] = 'healthy' if health_ok else 'unhealthy'
            status['health_details'] = health_details
        elif is_running:
            status['health_status'] = 'running'
            
        return status
    
    def get_system_metrics(self) -> Dict:
        """Get system-level metrics"""
        try:
            # Get CPU and memory info
            cpu_result = subprocess.run(['top', '-l', '1', '-n', '0'], capture_output=True, text=True)
            
            # Extract CPU usage (simplified)
            cpu_line = [line for line in cpu_result.stdout.split('\n') if 'CPU usage' in line]
            cpu_usage = cpu_line[0] if cpu_line else "Unknown"
            
            # Get disk space
            disk_result = subprocess.run(['df', '-h', '/'], capture_output=True, text=True)
            disk_lines = disk_result.stdout.strip().split('\n')
            disk_info = disk_lines[1] if len(disk_lines) > 1 else "Unknown"
            
            return {
                'cpu_usage': cpu_usage,
                'disk_space': disk_info,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            return {'error': str(e), 'timestamp': datetime.now().isoformat()}
    
    def test_critical_functions(self) -> Dict:
        """Test critical business functions"""
        tests = {}
        
        # Test admin authentication
        try:
            response = requests.post(
                'http://localhost:3000/api/token',
                json={'type': 'admin'},
                timeout=5
            )
            tests['admin_auth'] = {
                'status': 'pass' if response.status_code == 200 else 'fail',
                'details': f"HTTP {response.status_code}"
            }
        except Exception as e:
            tests['admin_auth'] = {'status': 'fail', 'details': str(e)[:100]}
        
        # Test messaging system
        try:
            # Get a test token first
            token_response = requests.post(
                'http://localhost:3000/api/token',
                json={'type': 'member', 'email': 'health-check@test.com', 'name': 'Health Check'},
                timeout=5
            )
            if token_response.status_code == 200:
                token_data = token_response.json()
                tests['messaging_system'] = {
                    'status': 'pass',
                    'details': f"Token generated: {token_data.get('token', 'N/A')[:20]}..."
                }
            else:
                tests['messaging_system'] = {
                    'status': 'fail', 
                    'details': f"Token generation failed: HTTP {token_response.status_code}"
                }
        except Exception as e:
            tests['messaging_system'] = {'status': 'fail', 'details': str(e)[:100]}
        
        # Test demo generation system
        try:
            response = requests.get('http://localhost:8005/api/demos', timeout=5)
            if response.status_code == 200:
                demos = response.json()
                tests['demo_system'] = {
                    'status': 'pass',
                    'details': f"Found {len(demos)} demos available"
                }
            else:
                tests['demo_system'] = {'status': 'fail', 'details': f"HTTP {response.status_code}"}
        except Exception as e:
            tests['demo_system'] = {'status': 'fail', 'details': str(e)[:100]}
        
        return tests
    
    def generate_status_report(self) -> Dict:
        """Generate comprehensive status report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'services': {},
            'system_metrics': self.get_system_metrics(),
            'critical_functions': self.test_critical_functions(),
            'overall_status': 'healthy'
        }
        
        critical_issues = 0
        
        for name, config in self.services.items():
            status = self.get_service_status(name, config)
            report['services'][name] = status
            
            if config['critical'] and not status['running']:
                critical_issues += 1
                report['overall_status'] = 'critical'
            elif status['health_status'] == 'unhealthy':
                if report['overall_status'] == 'healthy':
                    report['overall_status'] = 'degraded'
        
        report['critical_issues_count'] = critical_issues
        return report
    
    def print_dashboard(self, report: Dict):
        """Print a formatted dashboard to console"""
        print("\n" + "="*80)
        print(f"🏢 PLEASANT COVE DESIGN - SYSTEM HEALTH DASHBOARD")
        print(f"📅 {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*80)
        
        # Overall status
        status_emoji = {
            'healthy': '🟢',
            'degraded': '🟡', 
            'critical': '🔴'
        }
        overall = report['overall_status']
        print(f"\n📊 OVERALL STATUS: {status_emoji.get(overall, '⚪')} {overall.upper()}")
        
        if report['critical_issues_count'] > 0:
            print(f"⚠️  CRITICAL ISSUES: {report['critical_issues_count']}")
        
        # Services status
        print(f"\n🔧 SERVICES STATUS:")
        print("-" * 60)
        for name, status in report['services'].items():
            running_emoji = "🟢" if status['running'] else "🔴"
            critical_marker = " [CRITICAL]" if status['critical'] else ""
            
            print(f"{running_emoji} {name:<20} Port {status['port']:<5} {critical_marker}")
            
            if status['health_status'] != 'unknown':
                health_emoji = "✅" if status['health_status'] in ['healthy', 'running'] else "❌"
                print(f"   └─ Health: {health_emoji} {status['health_status']}")
                
                if status['health_details']:
                    details = status['health_details'][:50]
                    print(f"   └─ Details: {details}")
        
        # Critical functions
        print(f"\n🧪 CRITICAL BUSINESS FUNCTIONS:")
        print("-" * 60)
        for func_name, result in report['critical_functions'].items():
            status_emoji = "✅" if result['status'] == 'pass' else "❌"
            print(f"{status_emoji} {func_name.replace('_', ' ').title():<25} {result['status'].upper()}")
            if result['details']:
                print(f"   └─ {result['details'][:60]}")
        
        # System metrics
        print(f"\n💻 SYSTEM METRICS:")
        print("-" * 60)
        metrics = report['system_metrics']
        if 'cpu_usage' in metrics:
            print(f"🖥️  CPU: {metrics['cpu_usage']}")
        if 'disk_space' in metrics:
            print(f"💾 Disk: {metrics['disk_space']}")
        
        print("\n" + "="*80)
    
    def run_continuous_monitoring(self, interval: int = 30):
        """Run continuous monitoring with specified interval"""
        print("🚀 Starting Pleasant Cove Design Health Monitor...")
        print(f"📊 Monitoring every {interval} seconds (Press Ctrl+C to stop)")
        
        try:
            while True:
                # Clear screen (works on most terminals)
                os.system('clear' if os.name == 'posix' else 'cls')
                
                report = self.generate_status_report()
                self.print_dashboard(report)
                
                # Check if critical services are down and alert
                if report['overall_status'] == 'critical':
                    print(f"\n🚨 CRITICAL ALERT: {report['critical_issues_count']} critical services are down!")
                    print("💡 Run './ensure_servers_running.sh restart' to attempt recovery")
                
                time.sleep(interval)
                
        except KeyboardInterrupt:
            print(f"\n\n👋 Health monitoring stopped.")

def main():
    import sys
    
    dashboard = PleasantCoveHealthDashboard()
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == 'monitor':
            interval = int(sys.argv[2]) if len(sys.argv) > 2 else 30
            dashboard.run_continuous_monitoring(interval)
        elif command == 'status':
            report = dashboard.generate_status_report()
            dashboard.print_dashboard(report)
        elif command == 'json':
            report = dashboard.generate_status_report()
            print(json.dumps(report, indent=2))
        else:
            print("Usage: python3 system_health_dashboard.py [status|monitor|json] [interval]")
    else:
        # Default: show status once
        report = dashboard.generate_status_report()
        dashboard.print_dashboard(report)

if __name__ == "__main__":
    main() 