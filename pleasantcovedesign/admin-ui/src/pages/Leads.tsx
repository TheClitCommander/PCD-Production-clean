import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Filter, Plus, Building2, Eye, MousePointer, MessageCircle, TrendingUp } from 'lucide-react'
import EntitySummaryCard from '../components/EntitySummaryCard'
import api from '../api'
import { deviceDetection, communicationFallbacks, urlUtils } from '../utils/deviceDetection'
import { authenticatedFetch, checkAuthStatus, AuthAPI } from '../utils/auth'

// Make communication functions available globally for UI components
(window as any).initiateVideoCall = communicationFallbacks.initiateVideoCall;

// MINERVA API Integration
const MINERVA_API_URL = 'http://localhost:8001/api/minerva';

interface MinervaResponse {
  success: boolean;
  message?: string;
  demo_url?: string;
  invoice?: any;
  analytics?: any;
  error?: string;
  details?: any;
  demos?: {
    storefront: any;
    stylized: any;
  };
}

async function callMinervaAPI(endpoint: string, data: any): Promise<MinervaResponse> {
  try {
    const response = await authenticatedFetch(`${MINERVA_API_URL}${endpoint}`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Minerva API Error:', error);
    return {
      success: false,
      error: 'Failed to connect to Minerva AI',
      details: error
    };
  }
}

interface Company {
  id: number;
  name: string;
  email: string;
  phone: string;
  industry: string;
  priority: string;
  stage?: string;
  projects?: any[];
  trackingData?: {
    demo_views: number;
    cta_clicks: number;
    messages: number;
    status: string;
    last_activity?: string;
  }
}

interface CompanyWithProjects extends Company {
  projects: any[]
  totalPaid: number
  expandedProjects?: boolean
}

const Leads: React.FC = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState<string>('all')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [companies, setCompanies] = useState<CompanyWithProjects[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedCompanies, setExpandedCompanies] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [companiesRes, projectsRes] = await Promise.all([
          api.get('/companies'),
          api.get('/projects')
        ])

        const projectsByCompany = projectsRes.data.reduce((acc: any, project: any) => {
          if (!acc[project.companyId]) {
            acc[project.companyId] = []
          }
          acc[project.companyId].push(project)
          return acc
        }, {})

        const companiesWithProjects: CompanyWithProjects[] = companiesRes.data.map((company: Company) => {
          const companyProjects = projectsByCompany[company.id] || []
          const totalPaid = companyProjects.reduce((sum: number, project: any) => {
            return sum + (project.amountPaid || 0)
          }, 0)

          // Add mock tracking data based on company ID
          let trackingData = undefined
          
          if (company.id <= 4) {
            // Add tracking data for first 4 companies
            const mockTrackingData = {
              1: { demo_views: 0, cta_clicks: 0, messages: 0, status: 'demo_sent' },
              2: { demo_views: 0, cta_clicks: 0, messages: 0, status: 'demo_sent' },
              3: { demo_views: 3, cta_clicks: 0, messages: 0, status: 'viewed_demo' },
              4: { demo_views: 3, cta_clicks: 1, messages: 0, status: 'viewed_demo' }
            }
            trackingData = mockTrackingData[company.id] || undefined
          }

          return {
            ...company,
            projects: companyProjects,
            totalPaid,
            stage: company.stage || 'scraped',
            trackingData
          }
        })

        setCompanies(companiesWithProjects)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = searchTerm === '' || 
      company.name.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStage = stageFilter === 'all' || company.stage === stageFilter
    const matchesPriority = priorityFilter === 'all' || company.priority === priorityFilter

    return matchesSearch && matchesStage && matchesPriority
  })

  const toggleCompanyExpansion = (companyId: number) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev)
      if (newSet.has(companyId)) {
        newSet.delete(companyId)
      } else {
        newSet.add(companyId)
      }
      return newSet
    })
  }

  const deleteCompany = async (companyId: number) => {
    if (window.confirm('Are you sure you want to delete this company? This action cannot be undone.')) {
      try {
        await api.delete(`/companies/${companyId}`)
        
        // Remove from local state
        setCompanies(prev => prev.filter(company => company.id !== companyId))
        
        console.log(`✅ Company ${companyId} deleted successfully`)
      } catch (error) {
        console.error('❌ Failed to delete company:', error)
        alert('Failed to delete company. Please try again.')
      }
    }
  }

  const contactCompany = (company: CompanyWithProjects) => {
    // Check what contact methods are available
    const hasEmail = company.email && company.email.includes('@')
    const hasPhone = company.phone && company.phone.trim() !== ''
    const hasProjects = company.projects.length > 0

    // Create contact options
    const contactOptions: string[] = []
    
    if (hasProjects) {
      contactOptions.push('💬 Send Message (via Project Chat)')
    }
    if (hasEmail) {
      contactOptions.push('📧 Send Email')
    }
    if (hasPhone) {
      contactOptions.push('📱 Send SMS')
    }
    
    if (contactOptions.length === 0) {
      alert('No contact methods available for this company.')
      return
    }

    // For now, use a simple prompt. Later this could be a modal.
    const choice = window.prompt(
      `Contact ${company.name}:\n\n` +
      contactOptions.map((opt, i) => `${i + 1}. ${opt}`).join('\n') +
      '\n\nEnter your choice (1-' + contactOptions.length + '):'
    )

    const choiceNum = parseInt(choice || '0')
    
    if (choiceNum === 1 && hasProjects) {
      // Open the first project conversation
      window.open(`/inbox/${company.projects[0].accessToken}`, '_blank')
    } else if ((choiceNum === 1 && !hasProjects && hasEmail) || (choiceNum === 2 && hasProjects && hasEmail)) {
      // Email
      const subject = encodeURIComponent(`Following up with ${company.name}`)
      const body = encodeURIComponent(`Hi,\n\nI wanted to follow up regarding your website project.\n\nBest regards,\nPleasant Cove Design`)
      window.open(`mailto:${company.email}?subject=${subject}&body=${body}`)
    } else if (hasPhone && ((choiceNum === contactOptions.length) || (!hasEmail && choiceNum === 1))) {
      // SMS - For now, just show the phone number
      alert(`SMS ${company.name} at: ${company.phone}\n\nTip: You can also use the outreach system for automated SMS.`)
    }
  }

  // Direct communication methods for icon clicks
  const handlePhoneClick = (company: CompanyWithProjects) => {
    if (company.phone && company.phone.trim()) {
      communicationFallbacks.initiatePhoneCall(company.phone, company.name)
    }
  }

  // NEW: Enhanced video/call options
  const handleVideoCallClick = (company: CompanyWithProjects) => {
    if (company.phone && company.email && company.phone.trim()) {
      communicationFallbacks.initiateVideoCall(company.phone, company.email, company.name)
    }
  }

  const handleEmailClick = (company: CompanyWithProjects) => {
    if (company.email && company.email.includes('@')) {
      const subject = `Following up from Pleasant Cove Design`
      const body = 
        `Hi ${company.name},\n\n` +
        `I hope this email finds you well. I wanted to reach out regarding your website project.\n\n` +
        `We specialize in creating beautiful, functional websites that help businesses like yours grow online.\n\n` +
        `Would you be available for a brief call this week to discuss your needs?\n\n` +
        `Best regards,\nPleasant Cove Design`
      
      communicationFallbacks.initiateEmail(company.email, subject, body)
    }
  }

  const handleMessageClick = (company: CompanyWithProjects) => {
    if (company.phone && company.phone.trim()) {
      // Use SMS for lead outreach
      communicationFallbacks.initiateSMS(company.phone, company.name);
    } else {
      alert(`No phone number available for ${company.name}`);
    }
  }

  // MINERVA AI HANDLERS
  
  const handleMinervaDemo = async (company: CompanyWithProjects) => {
    try {
      // Style selection dialog
      const styleOptions = [
        '1. 🏪 Storefront Style (Clean template, professional)',
        '2. 🎨 Stylized Style (UI concept, modern design)',
        '3. 🔄 Generate Both Styles for Comparison',
        '4. ❌ Cancel'
      ];
      
      const choice = window.prompt(
        `Generate professional demo for ${company.name}:\n\n` +
        styleOptions.join('\n') +
        '\n\nChoose style (1-4):'
      );
      
      const choiceNum = parseInt(choice || '0');
      if (choiceNum < 1 || choiceNum > 3) return;
      
      let selectedStyle = 'storefront';
      let bothStyles = false;
      
      if (choiceNum === 1) {
        selectedStyle = 'storefront';
      } else if (choiceNum === 2) {
        selectedStyle = 'stylized';
      } else if (choiceNum === 3) {
        bothStyles = true;
      }
      
      // Show loading state
      const loadingMessage = bothStyles 
        ? '🤖 Minerva is generating both demo styles...\n\nThis may take 30-60 seconds.'
        : `🤖 Minerva is generating a professional ${selectedStyle} demo...\n\nThis may take 30-60 seconds.`;
      
      alert(loadingMessage);
      
      if (bothStyles) {
        // Generate both styles for comparison
        const result = await callMinervaAPI('/generate-both-styles', {
          company_id: company.id,
          company_name: company.name,
          industry: (company as any).industry || 'general'
        });
        
        if (result.success) {
          const storefront = result.demos?.storefront;
          const stylized = result.demos?.stylized;
          
          const viewChoice = window.prompt(
            `✅ Both demo styles created successfully!\n\n` +
            `🏪 Storefront: ${storefront?.demo_url}\n` +
            `🎨 Stylized: ${stylized?.demo_url}\n\n` +
            `Which would you like to view?\n` +
            `1. Storefront Style\n` +
            `2. Stylized Style\n` +
            `3. View Both (opens 2 tabs)\n` +
            `4. View Later\n\n` +
            `Choose option (1-4):`
          );
          
          const viewNum = parseInt(viewChoice || '0');
          if (viewNum === 1) {
            window.open(storefront?.demo_url, '_blank');
          } else if (viewNum === 2) {
            window.open(stylized?.demo_url, '_blank');
          } else if (viewNum === 3) {
            window.open(storefront?.demo_url, '_blank');
            setTimeout(() => window.open(stylized?.demo_url, '_blank'), 500);
          }
        } else {
          alert(`❌ Demo generation failed:\n\n${result.error || 'Unknown error'}`);
        }
      } else {
        // Generate single style
        const result = await callMinervaAPI('/generate-demo', {
          company_id: company.id,
          company_name: company.name,
          industry: (company as any).industry || 'general',
          phone: company.phone,
          email: company.email,
          style: selectedStyle
        });
        
        if (result.success && result.demo_url) {
          const viewDemo = window.confirm(
            `✅ ${selectedStyle === 'storefront' ? '🏪 Storefront' : '🎨 Stylized'} demo created successfully!\n\n` +
            `${result.message}\n\n` +
            `Would you like to view the demo now?`
          );
          
          if (viewDemo) {
            window.open(result.demo_url, '_blank');
          }
        } else {
          alert(`❌ Demo generation failed:\n\n${result.error || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Demo generation error:', error);
      alert('❌ Failed to generate demo. Please try again.');
    }
  };

  const handleMinervaOutreach = async (company: CompanyWithProjects) => {
    try {
      const confirmed = window.confirm(
        `Run AI smart outreach for ${company.name}?\n\n` +
        `Minerva will:\n` +
        `• Generate a professional demo\n` +
        `• Create personalized messaging\n` +
        `• Send outreach via SMS/email\n\n` +
        `Continue?`
      );
      
      if (!confirmed) return;
      
      // Show loading state
      alert('🤖 Minerva is running smart outreach...\n\nThis includes demo generation and personalized messaging.');
      
      const result = await callMinervaAPI('/smart-outreach', {
        company_id: company.id,
        company_name: company.name,
        industry: (company as any).industry || 'general',
        phone: company.phone,
        email: company.email
      });
      
      if (result.success) {
        alert(
          `✅ Smart outreach completed!\n\n` +
          `${result.message}\n\n` +
          `Check your outreach logs for details.`
        );
      } else {
        alert(`❌ Smart outreach failed:\n\n${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Smart outreach error:', error);
      alert('❌ Failed to run smart outreach. Please try again.');
    }
  };

  const handleMinervaInvoice = async (company: CompanyWithProjects) => {
    try {
      // Show package selection dialog
      const packageOptions = [
        '1. Starter Package ($997)',
        '2. Growth Package ($2,497)', 
        '3. Professional Package ($4,997)',
        '4. Cancel'
      ];
      
      const choice = window.prompt(
        `Create invoice for ${company.name}:\n\n` +
        packageOptions.join('\n') +
        '\n\nEnter your choice (1-4):'
      );
      
      const choiceNum = parseInt(choice || '0');
      if (choiceNum < 1 || choiceNum > 3) return;
      
      const packageTypes = ['starter', 'growth', 'professional'];
      const selectedPackage = packageTypes[choiceNum - 1];
      
      // Show loading state
      alert('🤖 Minerva is creating your invoice...');
      
      const result = await callMinervaAPI('/create-invoice', {
        company_id: company.id,
        company_name: company.name,
        package_type: selectedPackage,
        notes: `Invoice created via Minerva AI for ${company.name}`
      });
      
      if (result.success) {
        alert(
          `✅ Invoice created successfully!\n\n` +
          `${result.message}\n\n` +
          `Invoice details have been saved to your billing system.`
        );
      } else {
        alert(`❌ Invoice creation failed:\n\n${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Invoice creation error:', error);
      alert('❌ Failed to create invoice. Please try again.');
    }
  };

  const handleMinervaAnalytics = async (company: CompanyWithProjects) => {
    try {
      // Show loading state
      alert('🤖 Minerva is gathering analytics...');
      
      const response = await fetch(`${MINERVA_API_URL}/analytics/${company.id}`);
      const result = await response.json();
      
      if (result.success) {
        const analytics = result.analytics;
        alert(
          `📊 Analytics for ${company.name}:\n\n` +
          `Demo Views: ${analytics.demo_views || 0}\n` +
          `Email Opens: ${analytics.email_opens || 0}\n` +
          `Click-through Rate: ${analytics.ctr || '0%'}\n` +
          `Engagement Score: ${analytics.engagement_score || 'N/A'}\n\n` +
          `Last Activity: ${analytics.last_activity || 'No activity yet'}`
        );
      } else {
        alert(`❌ Analytics retrieval failed:\n\n${result.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Analytics error:', error);
      alert('❌ Failed to retrieve analytics. Please try again.');
    }
  };

  const scheduleWithCompany = (company: CompanyWithProjects) => {
    // Create a scheduling link or calendar event
    const schedulingUrl = `https://www.pleasantcovedesign.com/schedule?company=${encodeURIComponent(company.name)}&email=${encodeURIComponent(company.email || '')}`
    
    if (window.confirm(`Schedule a meeting with ${company.name}?\n\nThis will open your scheduling page.`)) {
      window.open(schedulingUrl, '_blank')
    }
  }

  const viewCompanyNotes = (company: CompanyWithProjects) => {
    // For now, show existing notes. Later this could open a notes modal.
    const notes = (company as any).notes || 'No notes available'
    
    const newNotes = window.prompt(
      `Notes for ${company.name}:\n\n(You can edit these notes)`,
      notes
    )
    
    if (newNotes !== null && newNotes !== notes) {
      // Update notes via API
      updateCompanyNotes(company.id, newNotes)
    }
  }

  const updateCompanyNotes = async (companyId: number, notes: string) => {
    try {
      await api.put(`/companies/${companyId}`, { notes })
      
      // Update local state
      setCompanies(prev => prev.map(company => 
        company.id === companyId ? { ...company, notes } : company
      ))
      
      console.log(`✅ Notes updated for company ${companyId}`)
    } catch (error) {
      console.error('❌ Failed to update notes:', error)
      alert('Failed to update notes. Please try again.')
    }
  }

  const updateProject = (project: any) => {
    // Open the project conversation
    if (project.accessToken) {
      window.open(`/inbox/${project.accessToken}`, '_blank')
    } else {
      alert('No conversation available for this project.')
    }
  }

  const viewProjectNotes = (project: any) => {
    // For now, show project details
    alert(`Project: ${project.title}\nStage: ${project.stage || 'Active'}\nCreated: ${new Date(project.createdAt || '').toLocaleDateString()}`)
  }

  const getFilteredProjects = (company: CompanyWithProjects) => {
    return company.projects || []
  }

  // Count tracking stats
  const companiesWithTracking = companies.filter(c => c.trackingData)
  const totalViews = companiesWithTracking.reduce((sum, c) => sum + (c.trackingData?.demo_views || 0), 0)
  const totalClicks = companiesWithTracking.reduce((sum, c) => sum + (c.trackingData?.cta_clicks || 0), 0)
  const totalMessages = companiesWithTracking.reduce((sum, c) => sum + (c.trackingData?.messages || 0), 0)

  return (
    <div className="space-y-6">
      {/* Tracking Summary Cards */}
      {companiesWithTracking.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-border p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Tracked Leads</p>
                <p className="text-2xl font-bold text-gray-900">{companiesWithTracking.length}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-border p-4">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Demo Views</p>
                <p className="text-2xl font-bold text-gray-900">{totalViews}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-border p-4">
            <div className="flex items-center">
              <MousePointer className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total CTA Clicks</p>
                <p className="text-2xl font-bold text-gray-900">{totalClicks}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border border-border p-4">
            <div className="flex items-center">
              <MessageCircle className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Messages</p>
                <p className="text-2xl font-bold text-gray-900">{totalMessages}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted" />
            <input
              type="text"
              placeholder="Search companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Stages</option>
              <option value="scraped">Scraped</option>
              <option value="contacted">Contacted</option>
              <option value="responded">Responded</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              <option value="all">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex gap-2">
            <button className="btn-secondary">
              <Filter className="h-4 w-4" />
            </button>
            <button className="btn-primary">
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Company List */}
      <div className="bg-white rounded-xl shadow-sm border border-border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-foreground">
            Companies ({filteredCompanies.length})
          </h2>
          <div className="text-sm text-muted">
            {companiesWithTracking.length} leads being tracked
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted">Loading companies...</p>
            </div>
          ) : filteredCompanies.length > 0 ? (
            <div className="space-y-4">
              {filteredCompanies.map((company) => {
                const isExpanded = expandedCompanies.has(company.id)
                const filteredProjects = getFilteredProjects(company)
                
                return (
                  <div key={company.id} className="space-y-2">
                    <EntitySummaryCard
                      type="company"
                      data={company as any}
                      expanded={isExpanded}
                      onExpandClick={() => toggleCompanyExpansion(company.id)}
                      projectCount={company.projects.length}
                      totalPaid={company.totalPaid}
                      mode="expanded"
                      showActions={true}
                      trackingData={company.trackingData}
                      onContact={() => contactCompany(company)}
                      onSchedule={() => scheduleWithCompany(company)}
                      onNotes={() => viewCompanyNotes(company)}
                      onDelete={() => deleteCompany(company.id)}
                      onPhoneClick={() => handlePhoneClick(company)}
                      onEmailClick={() => handleEmailClick(company)}
                      onMessageClick={() => handleMessageClick(company)}
                      onMinervaDemo={() => handleMinervaDemo(company)}
                      onMinervaOutreach={() => handleMinervaOutreach(company)}
                      onMinervaInvoice={() => handleMinervaInvoice(company)}
                      onMinervaAnalytics={() => handleMinervaAnalytics(company)}
                    />
                    
                    {isExpanded && filteredProjects.length > 0 && (
                      <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                        {filteredProjects.map((project) => (
                          <EntitySummaryCard
                            key={project.id}
                            type="project"
                            data={project}
                            companyName={company.name}
                            mode="expanded"
                            showActions={true}
                            onContact={() => updateProject(project)}
                            onSchedule={() => scheduleWithCompany(company)}
                            onNotes={() => viewProjectNotes(project)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-muted">No companies found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Leads 