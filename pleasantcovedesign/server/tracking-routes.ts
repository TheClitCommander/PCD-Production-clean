import { Router } from 'express';
import { spawn } from 'child_process';
import path from 'path';

const router = Router();

// Helper function to call Python tracking system
function callPythonTracker(script: string, args: string[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonPath = path.join(process.cwd(), '..', 'protection_env', 'bin', 'python');
    const scriptPath = path.join(process.cwd(), '..', script);
    
    const childProcess = spawn(pythonPath, [scriptPath, ...args]);
    
    let output = '';
    let error = '';
    
    childProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    childProcess.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    childProcess.on('close', (code) => {
      if (code === 0) {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          resolve({ success: true, output });
        }
      } else {
        reject(new Error(error || `Process exited with code ${code}`));
      }
    });
  });
}

// Track demo view
router.post('/api/track/view', async (req, res) => {
  try {
    const { demo_id, lead_id, tracking_token, user_agent } = req.body;
    
    // Call Python tracking system
    const result = await callPythonTracker('demo_tracking_integration.py', [
      'track_view',
      demo_id,
      lead_id || '',
      tracking_token || '',
      user_agent || req.headers['user-agent'] || ''
    ]);
    
    res.json(result);
  } catch (error) {
    console.error('View tracking failed:', error);
    res.status(500).json({ tracked: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Track CTA click
router.post('/api/track/click', async (req, res) => {
  try {
    const { demo_id, lead_id, cta_type, user_agent } = req.body;
    
    const result = await callPythonTracker('demo_tracking_integration.py', [
      'track_click',
      demo_id,
      lead_id,
      cta_type,
      user_agent || req.headers['user-agent'] || ''
    ]);
    
    res.json(result);
  } catch (error) {
    console.error('Click tracking failed:', error);
    res.status(500).json({ tracked: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Get lead tracking data
router.get('/api/leads/:id/tracking', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await callPythonTracker('lead_tracker.py', [
      'get_activity',
      id
    ]);
    
    res.json(result);
  } catch (error) {
    console.error('Failed to get lead tracking:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Get all leads with tracking data
router.get('/api/leads/tracking/summary', async (req, res) => {
  try {
    const { status } = req.query;
    
    const result = await callPythonTracker('demo_tracking_integration.py', [
      'get_dashboard_data'
    ]);
    
    res.json(result);
  } catch (error) {
    console.error('Failed to get tracking summary:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Update lead status
router.post('/api/leads/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;
    
    const result = await callPythonTracker('lead_tracker.py', [
      'update_status',
      id,
      status,
      notes || ''
    ]);
    
    res.json(result);
  } catch (error) {
    console.error('Failed to update lead status:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Generate tracked demo
router.post('/api/leads/:id/generate-demo', async (req, res) => {
  try {
    const { id } = req.params;
    const business_data = req.body;
    
    const result = await callPythonTracker('demo_tracking_integration.py', [
      'generate_tracked_demo',
      JSON.stringify({ ...business_data, id })
    ]);
    
    res.json(result);
  } catch (error) {
    console.error('Failed to generate tracked demo:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

// Log inbound message (SMS/email reply)
router.post('/api/track/message', async (req, res) => {
  try {
    const { contact_info, message_content, message_type } = req.body;
    
    const result = await callPythonTracker('demo_tracking_integration.py', [
      'handle_inbound_message',
      contact_info,
      message_content,
      message_type || 'unknown'
    ]);
    
    res.json(result);
  } catch (error) {
    console.error('Failed to log message:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : String(error) });
  }
});

export { router as trackingRoutes }; 