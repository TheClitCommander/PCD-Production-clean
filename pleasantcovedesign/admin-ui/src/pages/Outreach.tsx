import React, { useState, useEffect } from 'react'
import { Search, Plus, Play, Pause, BarChart3, Mail, MessageSquare, Eye, TrendingUp } from 'lucide-react'
import api from '../api'

interface Campaign {
  id: number;
  name: string;
  type: 'sms' | 'email';
  status: 'draft' | 'active' | 'paused' | 'completed';
  leadsTargeted: number;
  messagesSent: number;
  responses: number;
  conversions: number;
  createdAt: string;
  lastActivity?: string;
}

interface OutreachStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalLeadsContacted: number;
  responseRate: number;
  conversionRate: number;
  recentActivity: any[];
}

const Outreach: React.FC = () => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [stats, setStats] = useState<OutreachStats>({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeadsContacted: 0,
    responseRate: 0,
    conversionRate: 0,
    recentActivity: []
  })
  const [loading, setLoading] = useState(true)
  const [showNewCampaign, setShowNewCampaign] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchOutreachData()
  }, [])

  const fetchOutreachData = async () => {
    try {
      setLoading(true)
      
      // Try to fetch real campaign data from backend
      let campaigns: Campaign[] = []
      
      try {
        const campaignsResponse = await api.get('/outreach/campaigns')
        campaigns = campaignsResponse.data
      } catch (error) {
        console.log('No campaign data available yet')
        
        // Set empty campaigns array - will show empty state
        campaigns = []
      }

      setCampaigns(campaigns)

      // Calculate comprehensive stats
      const totalMessagesSent = campaigns.reduce((sum, c) => sum + c.messagesSent, 0)
      const totalResponses = campaigns.reduce((sum, c) => sum + c.responses, 0)
      const totalConversions = campaigns.reduce((sum, c) => sum + c.conversions, 0)
      
      // Generate recent activity from campaign data
      const recentActivity = campaigns
        .filter(c => c.lastActivity)
        .sort((a, b) => new Date(b.lastActivity!).getTime() - new Date(a.lastActivity!).getTime())
        .slice(0, 5)
        .map(c => ({
          message: `${c.name}: ${c.responses} responses received`,
          time: new Date(c.lastActivity!).toLocaleDateString(),
          campaign: c.name,
          type: c.type
        }))

      setStats({
        totalCampaigns: campaigns.length,
        activeCampaigns: campaigns.filter(c => c.status === 'active').length,
        totalLeadsContacted: totalMessagesSent,
        responseRate: totalMessagesSent > 0 ? (totalResponses / totalMessagesSent) * 100 : 0,
        conversionRate: totalResponses > 0 ? (totalConversions / totalResponses) * 100 : 0,
        recentActivity
      })

    } catch (error) {
      console.error('Error fetching outreach data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStartCampaign = async (campaignId: number) => {
    try {
      const campaign = campaigns.find(c => c.id === campaignId)
      if (!campaign) return

      // Show confirmation dialog
      const confirmed = window.confirm(
        `Start "${campaign.name}" campaign?\n\n` +
        `Type: ${campaign.type.toUpperCase()}\n` +
        `Targets: ${campaign.leadsTargeted} leads\n\n` +
        `This will trigger the Python automation system.`
      )
      
      if (!confirmed) return

      console.log('Starting campaign via bot integration:', campaignId)
      
      // Call the bot CLI integration
      const response = await api.post('/bot/outreach', {
        campaignId,
        type: campaign.type,
        leadsTargeted: campaign.leadsTargeted,
        testMode: false
      })
      
      if (response.data.success) {
        // Update campaign status
        setCampaigns(campaigns.map(c => 
          c.id === campaignId ? { 
            ...c, 
            status: 'active' as const,
            lastActivity: new Date().toISOString().split('T')[0]
          } : c
        ))
        
        alert(`✅ Campaign "${campaign.name}" started successfully!\n\nMessages are being sent via ${campaign.type.toUpperCase()}.`)
      } else {
        alert(`❌ Failed to start campaign: ${response.data.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error starting campaign:', error)
      alert('❌ Failed to start campaign. Please try again.')
    }
  }

  const handlePauseCampaign = async (campaignId: number) => {
    try {
      setCampaigns(campaigns.map(c => 
        c.id === campaignId ? { ...c, status: 'paused' as const } : c
      ))
    } catch (error) {
      console.error('Error pausing campaign:', error)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'draft': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getTypeIcon = (type: string) => {
    return type === 'sms' ? MessageSquare : Mail
  }

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading outreach data...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Outreach</h1>
          <p className="text-gray-600">Manage your SMS and email campaigns</p>
        </div>
        <button
          onClick={() => setShowNewCampaign(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Play className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeCampaigns}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Mail className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Leads Contacted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalLeadsContacted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Response Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.responseRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Campaigns List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Campaign
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredCampaigns.map((campaign) => {
                const TypeIcon = getTypeIcon(campaign.type)
                const responseRate = campaign.messagesSent > 0 ? (campaign.responses / campaign.messagesSent * 100) : 0
                const conversionRate = campaign.responses > 0 ? (campaign.conversions / campaign.responses * 100) : 0
                
                return (
                  <tr key={campaign.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TypeIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{campaign.name}</div>
                          <div className="text-sm text-gray-500">Created {campaign.createdAt}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-900 capitalize">{campaign.type}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(campaign.status)}`}>
                        {campaign.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {campaign.messagesSent} / {campaign.leadsTargeted} sent
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${(campaign.messagesSent / campaign.leadsTargeted) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {campaign.responses} responses ({responseRate.toFixed(1)}%)
                      </div>
                      <div className="text-sm text-gray-500">
                        {campaign.conversions} conversions ({conversionRate.toFixed(1)}%)
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {campaign.status === 'draft' || campaign.status === 'paused' ? (
                          <button
                            onClick={() => handleStartCampaign(campaign.id)}
                            className="text-green-600 hover:text-green-900 flex items-center"
                          >
                            <Play className="h-4 w-4 mr-1" />
                            Start
                          </button>
                        ) : campaign.status === 'active' ? (
                          <button
                            onClick={() => handlePauseCampaign(campaign.id)}
                            className="text-yellow-600 hover:text-yellow-900 flex items-center"
                          >
                            <Pause className="h-4 w-4 mr-1" />
                            Pause
                          </button>
                        ) : null}
                        <button className="text-blue-600 hover:text-blue-900 flex items-center">
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredCampaigns.length === 0 && (
        <div className="text-center py-12">
          <Mail className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No campaigns found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating your first outreach campaign.
          </p>
          <button
            onClick={() => setShowNewCampaign(true)}
            className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </button>
        </div>
      )}

      {/* New Campaign Modal - Placeholder */}
      {showNewCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Campaign</h3>
            <p className="text-gray-600 mb-4">
              Campaign creation interface coming soon. This will connect to your lead scraping and outreach automation.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowNewCampaign(false)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowNewCampaign(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Outreach 