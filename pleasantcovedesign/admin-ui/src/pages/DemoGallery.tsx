import React, { useState, useEffect } from 'react'
import { Search, Eye, ExternalLink, Trash2, Plus, Globe, BarChart3, Calendar, Share } from 'lucide-react'
import api from '../api'

interface Demo {
  id: number
  companyId: number
  companyName: string
  businessType: string
  demoUrl: string
  previewImage?: string
  views: number
  lastViewed?: string
  createdAt: string
  status: 'active' | 'archived' | 'generating'
  template: string
  customizations: string[]
}

interface DemoStats {
  totalDemos: number
  totalViews: number
  averageViewsPerDemo: number
  topPerformingDemo: string
  recentActivity: Array<{
    demoId: number
    companyName: string
    action: string
    timestamp: string
  }>
}

const DemoGallery: React.FC = () => {
  const [demos, setDemos] = useState<Demo[]>([])
  const [stats, setStats] = useState<DemoStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBusinessType, setSelectedBusinessType] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [generatingDemo, setGeneratingDemo] = useState(false)

  useEffect(() => {
    fetchDemos()
    fetchStats()
  }, [])

  const fetchDemos = async () => {
    try {
      setLoading(true)
      
      // Try to fetch real demo data
      try {
        const response = await api.get('/demos')
        // Ensure we're setting an array
        if (Array.isArray(response.data)) {
          setDemos(response.data)
        } else {
          console.warn('API returned non-array data:', response.data)
          setDemos([])
        }
      } catch (error) {
        console.log('No demo data available yet')
        // Set empty array - will show empty state
        setDemos([])
      }
    } catch (error) {
      console.error('Error fetching demos:', error)
      // Ensure we always set demos to an array in case of error
      setDemos([])
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await api.get('/demos/stats')
      setStats(response.data)
    } catch (error) {
      // Set default empty stats when no data is available
      setStats({
        totalDemos: 0,
        totalViews: 0,
        averageViewsPerDemo: 0,
        topPerformingDemo: "No demos yet",
        recentActivity: []
      })
    }
  }

  const handleGenerateDemo = async (companyId: number, businessType: string, companyName: string) => {
    setGeneratingDemo(true)
    try {
      const response = await api.post('/demos/generate', {
        companyId,
        businessType,
        companyName,
        template: 'auto', // Let AI choose best template
        features: ['responsive', 'seo_optimized', 'contact_forms']
      })
      
      if (response.data.success) {
        alert(`✅ Demo generated successfully!\n\nDemo will be available at: ${response.data.demoUrl}`)
        fetchDemos() // Refresh the demo list
      } else {
        alert(`❌ Demo generation failed: ${response.data.error}`)
      }
    } catch (error) {
      console.error('Demo generation error:', error)
      alert('❌ Demo generation failed. Please try again.')
    } finally {
      setGeneratingDemo(false)
      setShowCreateModal(false)
    }
  }

  const handleDeleteDemo = async (demoId: number) => {
    if (!window.confirm('Are you sure you want to delete this demo? This action cannot be undone.')) return
    
    try {
      await api.delete(`/demos/${demoId}`)
      setDemos(prev => prev.filter(demo => demo.id !== demoId))
      alert('✅ Demo deleted successfully!')
    } catch (error) {
      console.error('Error deleting demo:', error)
      alert('❌ Failed to delete demo. Please try again.')
    }
  }

  const getBusinessTypeColor = (type: string) => {
    const colors = {
      restaurant: 'bg-orange-100 text-orange-800',
      automotive: 'bg-blue-100 text-blue-800',
      contractor: 'bg-green-100 text-green-800',
      healthcare: 'bg-purple-100 text-purple-800',
      retail: 'bg-pink-100 text-pink-800',
      default: 'bg-gray-100 text-gray-800'
    }
    return colors[type as keyof typeof colors] || colors.default
  }

  // Ensure demos is an array before filtering
  const demosArray = Array.isArray(demos) ? demos : [];
  
  const filteredDemos = demosArray.filter(demo => {
    const matchesSearch = searchTerm === '' || 
      demo.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      demo.businessType.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesBusinessType = selectedBusinessType === 'all' || demo.businessType === selectedBusinessType
    
    return matchesSearch && matchesBusinessType
  })

  const businessTypes = Array.isArray(demos) ? [...new Set(demos.map(demo => demo.businessType))] : []

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading demos...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demo Gallery</h1>
          <p className="text-gray-600">Manage AI-generated website demos and track performance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          disabled={generatingDemo}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="h-4 w-4" />
          {generatingDemo ? 'Generating...' : 'Generate Demo'}
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center">
              <Globe className="h-8 w-8 text-blue-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Demos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalDemos}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center">
              <Eye className="h-8 w-8 text-green-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total Views</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalViews}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-orange-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Avg Views</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageViewsPerDemo.toFixed(1)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-xl shadow-sm border p-4">
            <div className="flex items-center">
              <Calendar className="h-8 w-8 text-purple-600" />
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Top Demo</p>
                <p className="text-sm font-bold text-gray-900">{stats.topPerformingDemo}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search demos by company or business type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedBusinessType}
            onChange={(e) => setSelectedBusinessType(e.target.value)}
            className="w-full py-2 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Business Types</option>
            {businessTypes.map(type => (
              <option key={type} value={type}>
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Demo Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDemos.map((demo) => (
          <div key={demo.id} className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
            {/* Demo Preview */}
            <div className="relative h-48 bg-gray-200">
              {demo.previewImage ? (
                <img 
                  src={demo.previewImage} 
                  alt={`${demo.companyName} demo preview`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Globe className="h-16 w-16 text-gray-400" />
                </div>
              )}
              
              {/* Status Overlay */}
              {demo.status === 'generating' && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                  <div className="text-white text-sm">Generating...</div>
                </div>
              )}
            </div>

            {/* Demo Info */}
            <div className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900 truncate">{demo.companyName}</h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getBusinessTypeColor(demo.businessType)}`}>
                  {demo.businessType}
                </span>
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-3">
                <Eye className="h-4 w-4 mr-1" />
                <span>{demo.views} views</span>
                {demo.lastViewed && (
                  <>
                    <span className="mx-2">•</span>
                    <span>Last viewed {new Date(demo.lastViewed).toLocaleDateString()}</span>
                  </>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-4">
                Template: {demo.template.replace('_', ' ')}
                <br />
                Features: {demo.customizations.join(', ')}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <a
                  href={demo.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-center text-sm flex items-center justify-center gap-1"
                >
                  <ExternalLink className="h-3 w-3" />
                  View
                </a>
                <button
                  onClick={() => navigator.clipboard.writeText(window.location.origin + demo.demoUrl)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded text-sm flex items-center justify-center"
                >
                  <Share className="h-3 w-3" />
                </button>
                <button
                  onClick={() => handleDeleteDemo(demo.id)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded text-sm flex items-center justify-center"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredDemos.length === 0 && (
        <div className="text-center py-12">
          <Globe className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No demos found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || selectedBusinessType !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Generate your first demo to get started'
            }
          </p>
        </div>
      )}

      {/* Generate Demo Modal */}
      {showCreateModal && (
        <GenerateDemoModal
          onClose={() => setShowCreateModal(false)}
          onGenerate={handleGenerateDemo}
          isGenerating={generatingDemo}
        />
      )}
    </div>
  )
}

// Modal component for generating new demos
const GenerateDemoModal: React.FC<{
  onClose: () => void
  onGenerate: (companyId: number, businessType: string, companyName: string) => void
  isGenerating: boolean
}> = ({ onClose, onGenerate, isGenerating }) => {
  const [companyName, setCompanyName] = useState('')
  const [businessType, setBusinessType] = useState('restaurant')
  const [companyId, setCompanyId] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!companyName.trim() || !companyId.trim()) return
    
    onGenerate(parseInt(companyId), businessType, companyName)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Generate New Demo</h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company ID</label>
              <input
                type="number"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter company ID from leads"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="Enter company name"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Type</label>
              <select
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="restaurant">Restaurant</option>
                <option value="automotive">Automotive</option>
                <option value="contractor">Contractor</option>
                <option value="healthcare">Healthcare</option>
                <option value="retail">Retail</option>
                <option value="professional">Professional Services</option>
              </select>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                disabled={isGenerating}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isGenerating || !companyName.trim() || !companyId.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isGenerating ? 'Generating...' : 'Generate Demo'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default DemoGallery 