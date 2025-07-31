import React, { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, DollarSign, Users, Eye, MessageCircle, Calendar, Filter, Download, RefreshCw } from 'lucide-react'
import api from '../api'

interface AnalyticsData {
  overview: {
    totalRevenue: number
    revenueGrowth: number
    totalLeads: number
    leadsGrowth: number
    conversionRate: number
    conversionGrowth: number
    avgDealSize: number
    dealSizeGrowth: number
  }
  funnel: {
    scraped: number
    contacted: number
    interested: number
    quoted: number
    closed: number
  }
  campaigns: {
    smsPerformance: {
      sent: number
      delivered: number
      responded: number
      converted: number
    }
    emailPerformance: {
      sent: number
      opened: number
      clicked: number
      responded: number
    }
  }
  timeline: Array<{
    date: string
    leads: number
    revenue: number
    demos: number
    conversions: number
  }>
  topPerformers: {
    bestCampaigns: Array<{
      name: string
      type: 'sms' | 'email'
      responseRate: number
      conversions: number
    }>
    bestBusinessTypes: Array<{
      type: string
      leadsCount: number
      conversionRate: number
      avgRevenue: number
    }>
  }
}

interface AnalyticsDashboardProps {
  dateRange?: string
  showFilters?: boolean
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ 
  dateRange = '30d', 
  showFilters = true 
}) => {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState(dateRange)
  const [selectedMetric, setSelectedMetric] = useState<'leads' | 'revenue' | 'conversions'>('revenue')

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPeriod])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // Try to fetch real analytics data
      try {
        const response = await api.get(`/analytics?period=${selectedPeriod}`)
        setAnalyticsData(response.data)
      } catch (error) {
        console.log('No analytics data available yet')
        
        // Set empty analytics data
        const emptyAnalytics: AnalyticsData = {
          overview: {
            totalRevenue: 0,
            revenueGrowth: 0,
            totalLeads: 0,
            leadsGrowth: 0,
            conversionRate: 0,
            conversionGrowth: 0,
            avgDealSize: 0,
            dealSizeGrowth: 0
          },
          funnel: {
            scraped: 0,
            contacted: 0,
            interested: 0,
            quoted: 0,
            closed: 0
          },
          campaigns: {
            smsPerformance: {
              sent: 0,
              delivered: 0,
              responded: 0,
              converted: 0
            },
            emailPerformance: {
              sent: 0,
              opened: 0,
              clicked: 0,
              responded: 0
            }
          },
          timeline: [],
          topPerformers: {
            bestCampaigns: [],
            bestBusinessTypes: []
          }
        }
        
        setAnalyticsData(emptyAnalytics)
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600'
  }

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? '↗' : '↘'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading analytics...</div>
      </div>
    )
  }

  if (!analyticsData || !analyticsData.overview) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No analytics data available</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex justify-between items-center">
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Time Period</label>
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                  <option value="1y">Last Year</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Primary Metric</label>
                <select
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value as 'leads' | 'revenue' | 'conversions')}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="revenue">Revenue</option>
                  <option value="leads">Leads</option>
                  <option value="conversions">Conversions</option>
                </select>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={fetchAnalytics}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm">
                <Download className="h-4 w-4" />
                Export
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overview Cards */}
      {analyticsData?.overview && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.overview.totalRevenue)}</p>
                <p className={`text-sm ${getGrowthColor(analyticsData.overview.revenueGrowth)}`}>
                  {getGrowthIcon(analyticsData.overview.revenueGrowth)} {formatPercentage(Math.abs(analyticsData.overview.revenueGrowth))}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Leads</p>
              <p className="text-2xl font-bold text-gray-900">{analyticsData.overview.totalLeads}</p>
              <p className={`text-sm ${getGrowthColor(analyticsData.overview.leadsGrowth)}`}>
                {getGrowthIcon(analyticsData.overview.leadsGrowth)} {formatPercentage(Math.abs(analyticsData.overview.leadsGrowth))}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{formatPercentage(analyticsData.overview.conversionRate)}</p>
              <p className={`text-sm ${getGrowthColor(analyticsData.overview.conversionGrowth)}`}>
                {getGrowthIcon(analyticsData.overview.conversionGrowth)} {formatPercentage(Math.abs(analyticsData.overview.conversionGrowth))}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Deal Size</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(analyticsData.overview.avgDealSize)}</p>
              <p className={`text-sm ${getGrowthColor(analyticsData.overview.dealSizeGrowth)}`}>
                {getGrowthIcon(analyticsData.overview.dealSizeGrowth)} {formatPercentage(Math.abs(analyticsData.overview.dealSizeGrowth))}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
        </div>
      </div>

        {/* Conversion Funnel - Temporarily disabled due to syntax issues */}
      {/*<div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Sales Funnel</h3>
        <div className="space-y-4">
          {Object.entries(analyticsData.funnel).map(([stage, count], index) => {
            const totalLeads = analyticsData.funnel.scraped
            const percentage = (count / totalLeads) * 100
            const prevCount = index > 0 ? Object.values(analyticsData.funnel)[index - 1] : count
            const dropoffRate = index > 0 ? ((prevCount - count) / prevCount) * 100 : 0
            
            return (
              <div key={stage} className="flex items-center space-x-4">
                <div className="w-24 text-sm font-medium text-gray-700 capitalize">
                  {stage}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{count} leads</span>
                    <span className="text-sm text-gray-500">{formatPercentage(percentage)}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                {index > 0 && (
                  <div className="text-xs text-red-600">
                    -{formatPercentage(dropoffRate)} dropoff
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Campaign Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">SMS Campaign Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Messages Sent:</span>
              <span className="font-medium">{analyticsData.campaigns.smsPerformance.sent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Rate:</span>
              <span className="font-medium">{formatPercentage((analyticsData.campaigns.smsPerformance.delivered / analyticsData.campaigns.smsPerformance.sent) * 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Response Rate:</span>
              <span className="font-medium">{formatPercentage((analyticsData.campaigns.smsPerformance.responded / analyticsData.campaigns.smsPerformance.sent) * 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Conversion Rate:</span>
              <span className="font-medium text-green-600">{formatPercentage((analyticsData.campaigns.smsPerformance.converted / analyticsData.campaigns.smsPerformance.sent) * 100)}</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Email Campaign Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Emails Sent:</span>
              <span className="font-medium">{analyticsData.campaigns.emailPerformance.sent.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Open Rate:</span>
              <span className="font-medium">{formatPercentage((analyticsData.campaigns.emailPerformance.opened / analyticsData.campaigns.emailPerformance.sent) * 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Click Rate:</span>
              <span className="font-medium">{formatPercentage((analyticsData.campaigns.emailPerformance.clicked / analyticsData.campaigns.emailPerformance.sent) * 100)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Response Rate:</span>
              <span className="font-medium text-green-600">{formatPercentage((analyticsData.campaigns.emailPerformance.responded / analyticsData.campaigns.emailPerformance.sent) * 100)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Performing Campaigns</h3>
          <div className="space-y-3">
            {analyticsData.topPerformers.bestCampaigns.map((campaign, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{campaign.name}</p>
                  <p className="text-sm text-gray-600">{campaign.type.toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-green-600">{formatPercentage(campaign.responseRate)}</p>
                  <p className="text-sm text-gray-600">{campaign.conversions} conversions</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Business Types</h3>
          <div className="space-y-3">
            {analyticsData.topPerformers.bestBusinessTypes.map((type, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 capitalize">{type.type}</p>
                  <p className="text-sm text-gray-600">{type.leadsCount} leads</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-blue-600">{formatPercentage(type.conversionRate)}</p>
                  <p className="text-sm text-gray-600">{formatCurrency(type.avgRevenue)} avg</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>*/}
      )}
    </div>
  )
}

export default AnalyticsDashboard 