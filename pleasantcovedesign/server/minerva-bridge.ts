import express from 'express';
import { spawn } from 'child_process';
import path from 'path';
import cors from 'cors';
import { authenticate, requireAdmin, createDevAuthRoutes, AuthenticatedRequest } from './middleware/auth';
import { validate } from './middleware/validation';

const app = express();
app.use(express.json());
app.use(cors());

// Add development authentication routes
createDevAuthRoutes(app);

const PYTHON_PATH = process.env.PYTHON_PATH || 'python3';
// CommonJS __dirname is available by default
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, '../../');

/**
 * Execute a Python Minerva command and return results
 */
async function executeMinervaCommand(scriptName: string, args: string[] = []): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(PROJECT_ROOT, scriptName);
    
    // Use the protection_env virtual environment
    const venvPython = path.join(PROJECT_ROOT, 'protection_env/bin/python3');
    const pythonExecutable = venvPython;
    
    const pythonProcess = spawn(pythonExecutable, [pythonScript, ...args], {
      cwd: PROJECT_ROOT,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    pythonProcess.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    pythonProcess.on('close', (code) => {
      if (code === 0) {
        try {
          // Try to parse JSON output
          const result = JSON.parse(stdout.trim());
          resolve(result);
        } catch (e) {
          // Return raw output if not JSON
          resolve({ output: stdout.trim(), success: true });
        }
      } else {
        reject({ error: stderr || stdout, code });
      }
    });

    // Handle timeout
    setTimeout(() => {
      pythonProcess.kill();
      reject({ error: 'Command timeout', code: -1 });
    }, 30000); // 30 second timeout
  });
}

// MINERVA ENDPOINTS

/**
 * Generate a professional demo for a company
 */
app.post('/api/minerva/generate-demo', 
  validate.minervaDemo, 
  authenticate, 
  requireAdmin, 
  async (req: AuthenticatedRequest, res) => {
  try {
    const { company_id, company_name, industry, phone, email, style = 'storefront' } = req.body;
    
    console.log(`🤖 Minerva: Generating ${style} demo for ${company_name} (${industry}) - User: ${req.user?.email}`);
    
    // Call our enhanced demo generator
    const result = await executeMinervaCommand('create_industry_demo_templates.py', [
      company_name,
      industry || 'general',
      style || 'modern'
    ]);
    
    if (result.success && result.demo_url) {
      console.log(`✅ ${style} demo generated: ${result.demo_url}`);
      res.json({
        success: true,
        demo_url: result.demo_url,
        demo_path: result.demo_path,
        style: result.style,
        message: result.message,
        company_id
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error || 'Failed to generate demo',
        details: result
      });
    }
  } catch (error) {
    console.error('❌ Demo generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Demo generation failed',
      details: error
    });
  }
});

/**
 * Generate both demo styles for comparison
 */
app.post('/api/minerva/generate-both-styles', 
  validate.minervaBothStyles, 
  authenticate, 
  requireAdmin, 
  async (req: AuthenticatedRequest, res) => {
  try {
    const { company_id, company_name, industry } = req.body;
    
    console.log(`🤖 Minerva: Generating both styles for ${company_name} - User: ${req.user?.email}`);
    
    // Generate storefront style
    const storefrontResult = await executeMinervaCommand('create_industry_demo_templates.py', [
      company_name,
      industry || 'general',
      'storefront'
    ]);
    
    // Generate stylized style
    const stylizedResult = await executeMinervaCommand('create_industry_demo_templates.py', [
      company_name,
      industry || 'general',
      'stylized'
    ]);
    
    res.json({
      success: true,
      message: `Both demo styles generated for ${company_name}`,
      demos: {
        storefront: storefrontResult,
        stylized: stylizedResult
      },
      company_id
    });
  } catch (error) {
    console.error('❌ Multi-style generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Multi-style generation failed',
      details: error
    });
  }
});

/**
 * Run smart outreach for a company (demo + personalized messaging)
 */
app.post('/api/minerva/smart-outreach', 
  validate.minervaOutreach, 
  authenticate, 
  requireAdmin, 
  async (req: AuthenticatedRequest, res) => {
  try {
    const { company_id, company_name, industry, phone, email } = req.body;
    
    console.log(`🤖 Minerva: Running smart outreach for ${company_name} - User: ${req.user?.email}`);
    
    // Call Minerva Smart Outreach
    const result = await executeMinervaCommand('minerva_smart_outreach.py', [
      '--company-name', company_name,
      '--industry', industry || 'general',
      '--phone', phone || '',
      '--email', email || '',
      '--mode', 'single'
    ]);
    
    res.json({
      success: true,
      message: `Smart outreach initiated for ${company_name}`,
      details: result,
      company_id
    });
  } catch (error) {
    console.error('❌ Smart outreach error:', error);
    res.status(500).json({
      success: false,
      error: 'Smart outreach failed',
      details: error
    });
  }
});

/**
 * Create an invoice for a company
 */
app.post('/api/minerva/create-invoice', 
  validate.minervaInvoice, 
  authenticate, 
  requireAdmin, 
  async (req: AuthenticatedRequest, res) => {
  try {
    const { company_id, company_name, package_type, notes } = req.body;
    
    console.log(`🤖 Minerva: Creating ${package_type} invoice for ${company_name} - User: ${req.user?.email}`);
    
    // Call Minerva Billing Commands
    const result = await executeMinervaCommand('minerva_billing_commands.py', [
      'create-invoice',
      '--company', company_name,
      '--package', package_type || 'starter',
      '--notes', notes || ''
    ]);
    
    res.json({
      success: true,
      message: `Invoice created for ${company_name}`,
      invoice: result,
      company_id
    });
  } catch (error) {
    console.error('❌ Invoice creation error:', error);
    res.status(500).json({
      success: false,
      error: 'Invoice creation failed',
      details: error
    });
  }
});

/**
 * Get analytics for a company (demo views, engagement, etc.)
 */
app.get('/api/minerva/analytics/:company_id', 
  authenticate, 
  requireAdmin, 
  async (req: AuthenticatedRequest, res) => {
  try {
    const { company_id } = req.params;
    
    console.log(`🤖 Minerva: Getting analytics for company ${company_id} - User: ${req.user?.email}`);
    
    // Call analytics script
    const result = await executeMinervaCommand('demo_tracking_integration.py', [
      '--company-id', company_id,
      '--mode', 'analytics'
    ]);
    
    res.json({
      success: true,
      analytics: result,
      company_id
    });
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({
      success: false,
      error: 'Analytics retrieval failed',
      details: error
    });
  }
});

/**
 * Get lead priority score from Minerva
 */
app.post('/api/minerva/analyze-lead', 
  validate.minervaAnalyzeLead, 
  authenticate, 
  requireAdmin, 
  async (req: AuthenticatedRequest, res) => {
  try {
    const { company_id, company_name, industry, phone, email, website } = req.body;
    
    console.log(`🤖 Minerva: Analyzing lead ${company_name} - User: ${req.user?.email}`);
    
    // Call lead analysis
    const result = await executeMinervaCommand('minerva_full_control.py', [
      'analyze-lead',
      '--company', company_name,
      '--industry', industry || 'general',
      '--phone', phone || '',
      '--email', email || '',
      '--website', website || ''
    ]);
    
    res.json({
      success: true,
      analysis: result,
      company_id
    });
  } catch (error) {
    console.error('❌ Lead analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Lead analysis failed',
      details: error
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/minerva/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Minerva Bridge',
    timestamp: new Date().toISOString(),
    python_path: PYTHON_PATH
  });
});

const PORT = process.env.MINERVA_PORT || 8001;

app.listen(PORT, () => {
  console.log(`🤖 Minerva Bridge API running on port ${PORT}`);
  console.log(`📍 Endpoints available at http://localhost:${PORT}/api/minerva/*`);
  console.log(`🐍 Using Python: ${PYTHON_PATH}`);
});

export default app; 