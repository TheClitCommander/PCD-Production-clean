import React, { useState, useEffect } from 'react'
import { DollarSign, Users, TrendingUp, BarChart3, RefreshCw, Download } from 'lucide-react'
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

  useEffect(() => {
    fetchAnalytics()
  }, [selectedPeriod])

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      
      // Try to fetch real analytics data
      try {
        const response = await api.get(`/analytics?period=${selectedPeriod}`)
        if (response.data && response.data.metrics) {
          // Transform the API response to match our interface
          setAnalyticsData({
            overview: {
              totalRevenue: response.data.metrics.totalRevenue || 0,
              revenueGrowth: 0,
              totalLeads: response.data.metrics.totalClients || 0,
              leadsGrowth: 0,
              conversionRate: response.data.metrics.conversionRate || 0,
              conversionGrowth: 0,
              avgDealSize: response.data.metrics.totalRevenue > 0 && response.data.metrics.totalClients > 0 
                ? response.data.metrics.totalRevenue / response.data.metrics.totalClients 
                : 0,
              dealSizeGrowth: 0
            }
          })
        } else {
          setAnalyticsData(getEmptyAnalytics())
        }
      } catch (error) {
        console.log('No analytics data available yet')
        setAnalyticsData(getEmptyAnalytics())
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
      setAnalyticsData(getEmptyAnalytics())
    } finally {
      setLoading(false)
    }
  }

  const getEmptyAnalytics = (): AnalyticsData => ({
    overview: {
      totalRevenue: 0,
      revenueGrowth: 0,
      totalLeads: 0,
      leadsGrowth: 0,
      conversionRate: 0,
      conversionGrowth: 0,
      avgDealSize: 0,
      dealSizeGrowth: 0
    }
  })

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const formatPercentage = (percentage: number) => {
    return `${percentage.toFixed(1)}%`
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
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Period
                </label>
                <select 
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last year</option>
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
      )}

      {/* Placeholder for future analytics */}
      <div className="bg-white rounded-lg shadow-sm border p-8 text-center">
        <div className="text-gray-400 mb-4">
          <BarChart3 className="h-12 w-12 mx-auto" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Advanced Analytics Coming Soon</h3>
        <p className="text-gray-500">
          Detailed charts, funnel analysis, and campaign performance metrics will be available in the next update.
        </p>
      </div>
    </div>
  )
}

export default AnalyticsDashboard