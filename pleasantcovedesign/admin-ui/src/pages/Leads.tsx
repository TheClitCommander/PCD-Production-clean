import React, { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { Search, Filter, Plus, Building2, Eye, MousePointer, MessageCircle, TrendingUp } from 'lucide-react'
import EntitySummaryCard from '../components/EntitySummaryCard'
import api from '../api'
import { deviceDetection, communicationFallbacks, urlUtils } from '../utils/deviceDetection'

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
    if (company.projects && company.projects.length > 0) {
      // Navigate to the project inbox
      const project = company.projects[0]
      if (project.accessToken) {
        navigate(`/inbox/${project.accessToken}`)
      } else {
        alert('No project conversation available. Create a project first.')
      }
    } else {
      // No projects yet - prompt to create one
      if (window.confirm(`No projects exist for ${company.name} yet.\n\nWould you like to create a project to start messaging?`)) {
        // TODO: Implement project creation flow
        alert('Project creation coming soon! For now, use the "Schedule" option to book an appointment which creates a project.')
      }
    }
  }

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