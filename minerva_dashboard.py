#!/usr/bin/env python3
"""
Minerva Dashboard - Simple web interface for Pleasant Cove Design
"""

from flask import Flask, render_template_string, jsonify, request, send_file
import json
import os
from minerva_outreach_assistant import MinervaOutreachAssistant
from minerva_visual_generator import MinervaVisualGenerator
import requests

app = Flask(__name__)
minerva = MinervaOutreachAssistant()
visual_generator = MinervaVisualGenerator()

# Simple HTML template
DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>🤖 Minerva Assistant - Pleasant Cove Design</title>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0; padding: 20px; background: #f5f7fa; color: #333;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;
            text-align: center;
        }
        .card { 
            background: white; padding: 25px; border-radius: 12px; margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .btn { 
            background: #667eea; color: white; border: none; padding: 12px 24px;
            border-radius: 6px; cursor: pointer; margin: 5px;
            font-size: 14px; font-weight: 500;
        }
        .btn:hover { background: #5a6fd8; }
        .btn-success { background: #28a745; }
        .btn-warning { background: #ffc107; color: #333; }
        .btn-danger { background: #dc3545; }
        .btn-visual { background: #e91e63; }
        .btn-visual:hover { background: #c2185b; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .metric { text-align: center; padding: 20px; }
        .metric-value { font-size: 2.5em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { color: #666; font-size: 0.9em; }
        .lead-item { 
            border: 1px solid #eee; padding: 15px; margin: 10px 0;
            border-radius: 8px; background: #fafafa;
        }
        .lead-score { 
            display: inline-block; padding: 4px 8px; border-radius: 4px;
            font-weight: bold; color: white; font-size: 0.85em;
        }
        .score-high { background: #28a745; }
        .score-medium { background: #ffc107; color: #333; }
        .score-low { background: #6c757d; }
        .status { margin-top: 10px; padding: 10px; border-radius: 6px; }
        .status-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .status-error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .insights { background: #e8f4fd; padding: 15px; border-radius: 8px; margin: 15px 0; }
        .loading { text-align: center; padding: 20px; color: #666; }
        .demo-item {
            border: 1px solid #ddd; padding: 15px; margin: 10px 0;
            border-radius: 8px; background: white;
            display: flex; justify-content: space-between; align-items: center;
        }
        .demo-preview {
            width: 100px; height: 60px; background: #f0f0f0;
            border-radius: 4px; margin-right: 15px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🤖 Minerva AI Assistant</h1>
            <p>Your Personal Lead Outreach Manager for Pleasant Cove Design</p>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📊 Lead Analysis</h3>
                <button class="btn" onclick="analyzeLeads('high_priority')">High Priority Leads</button>
                <button class="btn" onclick="analyzeLeads('need_follow_up')">Need Follow-up</button>
                <button class="btn" onclick="analyzeLeads('schedule_ready')">Ready to Schedule</button>
                <div id="lead-analysis"></div>
            </div>

            <div class="card">
                <h3>🚀 Quick Actions</h3>
                <button class="btn btn-success" onclick="launchCampaign()">Launch Outreach Campaign</button>
                <button class="btn btn-warning" onclick="scheduleFollowUps()">Schedule Follow-ups</button>
                <button class="btn" onclick="generateReport()">Performance Report</button>
                <div id="action-status"></div>
            </div>

            <div class="card">
                <h3>🎨 Visual Demo Generator</h3>
                <p>Create custom website mockups for your leads</p>
                <button class="btn btn-visual" onclick="generateDemos()">Generate Website Demos</button>
                <button class="btn" onclick="viewDemos()">View Created Demos</button>
                <div id="demo-status"></div>
            </div>
        </div>

        <div class="card">
            <h3>📈 Performance Dashboard</h3>
            <div id="performance-metrics" class="grid"></div>
        </div>

        <div class="card">
            <h3>🎯 Minerva's Insights</h3>
            <div id="insights"></div>
        </div>

        <div class="card">
            <h3>🖼️ Generated Demos</h3>
            <div id="demos-list"></div>
        </div>
    </div>

    <script>
        async function analyzeLeads(segment) {
            document.getElementById('lead-analysis').innerHTML = '<div class="loading">🤖 Minerva is analyzing leads...</div>';
            
            try {
                const response = await fetch(`/api/analyze/${segment}`);
                const data = await response.json();
                
                let html = `<div class="insights">
                    <h4>📋 ${data.segment.replace('_', ' ').toUpperCase()} (${data.total_count} leads)</h4>
                    ${data.analysis.recommendation ? `<p><strong>💡 Recommendation:</strong> ${data.analysis.recommendation}</p>` : ''}
                </div>`;
                
                if (data.leads && data.leads.length > 0) {
                    html += '<div style="max-height: 400px; overflow-y: auto;">';
                    data.leads.forEach(lead => {
                        const scoreClass = lead.score >= 80 ? 'score-high' : lead.score >= 60 ? 'score-medium' : 'score-low';
                        html += `<div class="lead-item">
                            <strong>${lead.name}</strong> 
                            <span class="lead-score ${scoreClass}">${lead.score || 0}</span>
                            <button class="btn btn-visual" onclick="generateSingleDemo(${lead.id}, '${lead.name}')">🎨 Create Demo</button>
                            <br>
                            <small>${lead.businessType || 'Unknown'} • ${lead.stage || 'New'}</small>
                            <br>
                            <small>📞 ${lead.phone || 'No phone'} • 📧 ${lead.email || 'No email'}</small>
                        </div>`;
                    });
                    html += '</div>';
                } else {
                    html += '<p>No leads found in this segment.</p>';
                }
                
                document.getElementById('lead-analysis').innerHTML = html;
            } catch (error) {
                document.getElementById('lead-analysis').innerHTML = `<div class="status status-error">Error: ${error.message}</div>`;
            }
        }

        async function generateSingleDemo(leadId, businessName) {
            document.getElementById('demo-status').innerHTML = `<div class="loading">🎨 Creating demo for ${businessName}...</div>`;
            
            try {
                const response = await fetch('/api/generate-demo', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ lead_id: leadId })
                });
                const data = await response.json();
                
                if (data.error) {
                    document.getElementById('demo-status').innerHTML = `<div class="status status-error">Error: ${data.error}</div>`;
                } else {
                    document.getElementById('demo-status').innerHTML = `
                        <div class="status status-success">
                            ✅ Demo created for ${businessName}!
                            <br><a href="${data.public_url}" target="_blank">View Demo</a>
                            <br><small>Demo ID: ${data.demo_id}</small>
                        </div>`;
                    
                    // Refresh demos list
                    viewDemos();
                }
            } catch (error) {
                document.getElementById('demo-status').innerHTML = `<div class="status status-error">Error: ${error.message}</div>`;
            }
        }

        async function generateDemos() {
            document.getElementById('demo-status').innerHTML = '<div class="loading">🎨 Generating demos for high-priority leads...</div>';
            
            try {
                const response = await fetch('/api/generate-batch-demos', { method: 'POST' });
                const data = await response.json();
                
                document.getElementById('demo-status').innerHTML = `
                    <div class="status status-success">
                        ✅ Generated ${data.generated_count} demos!
                        <br><small>Check the demos list below</small>
                    </div>`;
                
                // Refresh demos list
                viewDemos();
            } catch (error) {
                document.getElementById('demo-status').innerHTML = `<div class="status status-error">Error: ${error.message}</div>`;
            }
        }

        async function viewDemos() {
            try {
                const response = await fetch('/api/demos');
                const data = await response.json();
                
                let html = '';
                if (data.demos && data.demos.length > 0) {
                    data.demos.forEach(demo => {
                        html += `<div class="demo-item">
                            <div class="demo-preview"></div>
                            <div>
                                <strong>${demo.business_name}</strong> (${demo.business_type})
                                <br><small>Created: ${new Date(demo.created_at).toLocaleDateString()}</small>
                            </div>
                            <div>
                                <a href="${demo.public_url}" target="_blank" class="btn">View</a>
                                <button class="btn btn-warning" onclick="shareDemo('${demo.demo_id}')">Share</button>
                            </div>
                        </div>`;
                    });
                } else {
                    html = '<p>No demos generated yet. Create some demos for your leads!</p>';
                }
                
                document.getElementById('demos-list').innerHTML = html;
            } catch (error) {
                document.getElementById('demos-list').innerHTML = `<div class="status status-error">Error: ${error.message}</div>`;
            }
        }

        async function shareDemo(demoId) {
            try {
                const response = await fetch(`/api/demo/${demoId}/share`);
                const data = await response.json();
                
                // Show sharing options
                const shareHtml = `
                    <div class="status status-success">
                        📧 Email Template:<br>
                        <textarea style="width:100%; height:100px; margin:10px 0;">${data.email_template}</textarea>
                        <br>📱 SMS Template:<br>
                        <textarea style="width:100%; height:60px; margin:10px 0;">${data.sms_template}</textarea>
                        <br><small>Share URL: ${data.share_url}</small>
                    </div>`;
                
                document.getElementById('demo-status').innerHTML = shareHtml;
            } catch (error) {
                document.getElementById('demo-status').innerHTML = `<div class="status status-error">Error: ${error.message}</div>`;
            }
        }

        async function launchCampaign() {
            document.getElementById('action-status').innerHTML = '<div class="loading">🚀 Launching campaign...</div>';
            
            try {
                // First get high priority leads
                const leadsResponse = await fetch('/api/analyze/high_priority');
                const leadsData = await leadsResponse.json();
                
                if (leadsData.leads && leadsData.leads.length > 0) {
                    const leadIds = leadsData.leads.slice(0, 5).map(lead => lead.id); // Launch to first 5
                    
                    const response = await fetch('/api/campaign', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ lead_ids: leadIds, type: 'sms' })
                    });
                    const data = await response.json();
                    
                    document.getElementById('action-status').innerHTML = `
                        <div class="status status-success">
                            ✅ Campaign launched! Sent: ${data.sent}/${data.target_count}
                            <br><small>Success rate: ${data.success_rate}</small>
                        </div>`;
                } else {
                    document.getElementById('action-status').innerHTML = `
                        <div class="status status-error">No high-priority leads found for campaign.</div>`;
                }
            } catch (error) {
                document.getElementById('action-status').innerHTML = `<div class="status status-error">Error: ${error.message}</div>`;
            }
        }

        async function scheduleFollowUps() {
            document.getElementById('action-status').innerHTML = '<div class="loading">📅 Scheduling follow-ups...</div>';
            
            try {
                const response = await fetch('/api/follow-ups', { method: 'POST' });
                const data = await response.json();
                
                document.getElementById('action-status').innerHTML = `
                    <div class="status status-success">
                        ✅ Scheduled ${data.scheduled_count} follow-ups
                        <br><small>Next action: ${data.next_action_date}</small>
                    </div>`;
            } catch (error) {
                document.getElementById('action-status').innerHTML = `<div class="status status-error">Error: ${error.message}</div>`;
            }
        }

        async function generateReport() {
            document.getElementById('performance-metrics').innerHTML = '<div class="loading">📊 Generating report...</div>';
            
            try {
                const response = await fetch('/api/report');
                const data = await response.json();
                
                // Display metrics
                let metricsHtml = '';
                if (data.overview) {
                    metricsHtml = `
                        <div class="metric">
                            <div class="metric-value">${data.overview.total_leads}</div>
                            <div class="metric-label">Total Leads</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">${data.overview.conversion_rate}%</div>
                            <div class="metric-label">Conversion Rate</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value">$${data.overview.revenue.total}</div>
                            <div class="metric-label">Total Revenue</div>
                        </div>`;
                }
                document.getElementById('performance-metrics').innerHTML = metricsHtml;
                
                // Display insights
                if (data.minerva_insights) {
                    let insightsHtml = '<h4>🧠 Minerva\'s Analysis:</h4>';
                    data.minerva_insights.forEach(insight => {
                        insightsHtml += `<p>${insight}</p>`;
                    });
                    document.getElementById('insights').innerHTML = insightsHtml;
                }
                
            } catch (error) {
                document.getElementById('performance-metrics').innerHTML = `<div class="status status-error">Error: ${error.message}</div>`;
            }
        }

        // Auto-load dashboard on page load
        window.onload = () => {
            generateReport();
            analyzeLeads('high_priority');
            viewDemos();
        };
    </script>
</body>
</html>
"""

@app.route('/')
def dashboard():
    """Main dashboard"""
    return render_template_string(DASHBOARD_TEMPLATE)

@app.route('/api/analyze/<segment>')
def analyze_leads(segment):
    """Analyze leads by segment"""
    result = minerva.analyze_leads(segment)
    return jsonify(result)

@app.route('/api/campaign', methods=['POST'])
def launch_campaign():
    """Launch outreach campaign"""
    data = request.get_json()
    campaign_config = {
        'type': data.get('type', 'sms'),
        'lead_ids': data.get('lead_ids', [])
    }
    result = minerva.launch_outreach_campaign(campaign_config)
    return jsonify(result)

@app.route('/api/follow-ups', methods=['POST'])
def schedule_follow_ups():
    """Schedule follow-ups"""
    result = minerva.schedule_follow_ups()
    return jsonify(result)

@app.route('/api/report')
def performance_report():
    """Generate performance report"""
    result = minerva.generate_performance_report()
    return jsonify(result)

@app.route('/api/generate-demo', methods=['POST'])
def generate_single_demo():
    """Generate demo for a single lead"""
    data = request.get_json()
    lead_id = data.get('lead_id')
    
    # Get lead data from Pleasant Cove backend
    try:
        url = f"{minerva.backend_url}/api/businesses?token={minerva.admin_token}"
        response = requests.get(url)
        
        if response.status_code == 200:
            leads = response.json()
            lead = next((l for l in leads if l.get('id') == lead_id), None)
            
            if lead:
                result = visual_generator.generate_demo_website(lead)
                return jsonify(result)
            else:
                return jsonify({'error': 'Lead not found'})
        else:
            return jsonify({'error': 'Could not fetch lead data'})
            
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/generate-batch-demos', methods=['POST'])
def generate_batch_demos():
    """Generate demos for high-priority leads"""
    try:
        # Get high-priority leads
        leads_analysis = minerva.analyze_leads("high_priority")
        leads = leads_analysis.get("leads", [])
        
        if leads:
            results = visual_generator.generate_batch_demos(leads[:5])  # Generate for top 5
            return jsonify({
                'generated_count': len(results),
                'demos': results
            })
        else:
            return jsonify({'generated_count': 0, 'message': 'No high-priority leads found'})
            
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/demos')
def list_demos():
    """List all generated demos"""
    try:
        demo_files = [f for f in os.listdir(visual_generator.output_dir) if f.endswith('.html')]
        demos = []
        
        for demo_file in demo_files:
            demo_id = demo_file.replace('.html', '')
            # Try to parse demo info from filename
            parts = demo_id.split('_')
            business_name = ' '.join(parts[:-2]).replace('_', ' ').title()
            
            demos.append({
                'demo_id': demo_id,
                'business_name': business_name,
                'business_type': 'unknown',  # Could be enhanced
                'created_at': '2024-01-01T00:00:00',  # Could be enhanced
                'public_url': f"/demo/{demo_id}"
            })
        
        return jsonify({'demos': demos})
        
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/demo/<demo_id>')
def serve_demo(demo_id):
    """Serve a generated demo"""
    try:
        demo_file = os.path.join(visual_generator.output_dir, f"{demo_id}.html")
        if os.path.exists(demo_file):
            return send_file(demo_file)
        else:
            return "Demo not found", 404
    except Exception as e:
        return f"Error: {e}", 500

@app.route('/api/demo/<demo_id>/share')
def get_demo_share_info(demo_id):
    """Get sharing information for a demo"""
    result = visual_generator.get_demo_sharing_info(demo_id)
    return jsonify(result)

@app.route('/health')
def health():
    """Health check"""
    return jsonify({
        'status': 'healthy',
        'service': 'minerva_dashboard',
        'message': 'Minerva is ready to help!',
        'visual_generator': 'enabled'
    })

if __name__ == '__main__':
    print("🤖 Starting Minerva Dashboard with Visual Demo Generator...")
    print("📊 Dashboard: http://localhost:8005")  # Changed port to avoid conflicts
    print("🎨 Visual demos will be saved to ./demos/")
    print("🔧 Make sure your Pleasant Cove backend is running on http://localhost:5173")
    
    app.run(host='0.0.0.0', port=8005, debug=True) 