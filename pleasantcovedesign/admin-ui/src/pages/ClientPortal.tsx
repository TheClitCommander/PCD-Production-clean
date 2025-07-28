import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Eye, Download, MessageCircle, Calendar, DollarSign, CheckCircle, Clock, AlertCircle, Paperclip, Send } from 'lucide-react'
import api from '../api'

interface ClientProject {
  id: number
  name: string
  description: string
  status: 'active' | 'review' | 'completed' | 'on_hold'
  progress: number
  totalValue: number
  paidAmount: number
  nextPayment: number
  dueDate: string
  createdAt: string
  milestones: Array<{
    id: number
    title: string
    description: string
    status: 'pending' | 'in_progress' | 'completed'
    dueDate: string
    completedAt?: string
  }>
  files: Array<{
    id: number
    name: string
    size: number
    type: string
    uploadedAt: string
    uploadedBy: string
    url: string
  }>
  messages: Array<{
    id: number
    content: string
    sender: 'client' | 'team'
    timestamp: string
    senderName: string
  }>
}

interface ClientInfo {
  companyName: string
  contactName: string
  email: string
  phone: string
}

const ClientPortal: React.FC = () => {
  const { projectToken } = useParams<{ projectToken: string }>()
  const navigate = useNavigate()
  const [project, setProject] = useState<ClientProject | null>(null)
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'milestones' | 'files' | 'messages'>('overview')

  useEffect(() => {
    if (projectToken) {
      fetchProjectData()
    } else {
      setError('Invalid project access token')
      setLoading(false)
    }
  }, [projectToken])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      
      // Try to fetch real project data using token
      try {
        const response = await api.get(`/client/project/${projectToken}`)
        setProject(response.data.project)
        setClientInfo(response.data.client)
      } catch (error: any) {
        if (error.response?.status === 404) {
          setError('Project not found or access denied')
        } else {
          console.log('No real project data, using mock data for demonstration')
          
          // Mock data for demonstration
          const mockProject: ClientProject = {
            id: 1,
            name: "Professional Website Development",
            description: "Custom website with modern design, responsive layout, and content management system",
            status: "active",
            progress: 65,
            totalValue: 2497,
            paidAmount: 1200,
            nextPayment: 1297,
            dueDate: "2025-02-15",
            createdAt: "2025-01-10",
            milestones: [
              {
                id: 1,
                title: "Discovery & Planning",
                description: "Gathering requirements and creating project roadmap",
                status: "completed",
                dueDate: "2025-01-15",
                completedAt: "2025-01-14"
              },
              {
                id: 2,
                title: "Design & Wireframes",
                description: "Creating visual designs and user interface layouts",
                status: "completed",
                dueDate: "2025-01-22",
                completedAt: "2025-01-21"
              },
              {
                id: 3,
                title: "Development Phase 1",
                description: "Building core functionality and pages",
                status: "in_progress",
                dueDate: "2025-02-05"
              },
              {
                id: 4,
                title: "Content Integration",
                description: "Adding your content and optimizing for search engines",
                status: "pending",
                dueDate: "2025-02-10"
              },
              {
                id: 5,
                title: "Testing & Launch",
                description: "Final testing and website deployment",
                status: "pending",
                dueDate: "2025-02-15"
              }
            ],
            files: [
              {
                id: 1,
                name: "Website_Mockups_v2.pdf",
                size: 2400000,
                type: "application/pdf",
                uploadedAt: "2025-01-21",
                uploadedBy: "Design Team",
                url: "/api/files/download/1"
              },
              {
                id: 2,
                name: "Brand_Guidelines.pdf",
                size: 1800000,
                type: "application/pdf",
                uploadedAt: "2025-01-18",
                uploadedBy: "Design Team",
                url: "/api/files/download/2"
              },
              {
                id: 3,
                name: "Content_Requirements.docx",
                size: 450000,
                type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                uploadedAt: "2025-01-15",
                uploadedBy: "Project Manager",
                url: "/api/files/download/3"
              }
            ],
            messages: [
              {
                id: 1,
                content: "Welcome to your project! We're excited to work with you. Our team has reviewed your requirements and we'll begin with the discovery phase.",
                sender: "team",
                timestamp: "2025-01-10T10:00:00Z",
                senderName: "Sarah - Project Manager"
              },
              {
                id: 2,
                content: "Thank you! I'm looking forward to seeing the progress. When can we expect the first designs?",
                sender: "client",
                timestamp: "2025-01-10T14:30:00Z",
                senderName: "You"
              },
              {
                id: 3,
                content: "Great question! We'll have the initial wireframes ready by January 20th, followed by the visual designs. I've uploaded the project timeline for your reference.",
                sender: "team",
                timestamp: "2025-01-11T09:15:00Z",
                senderName: "Sarah - Project Manager"
              },
              {
                id: 4,
                content: "The design mockups are now ready! Please review the attached PDF and let us know your thoughts. We're particularly interested in your feedback on the color scheme and layout.",
                sender: "team",
                timestamp: "2025-01-21T16:45:00Z",
                senderName: "Mike - Lead Designer"
              }
            ]
          }
          
          const mockClientInfo: ClientInfo = {
            companyName: "Coastal Maine Restaurant",
            contactName: "John Smith",
            email: "john@coastalmainerestaurant.com",
            phone: "(207) 555-0123"
          }
          
          setProject(mockProject)
          setClientInfo(mockClientInfo)
        }
      }
    } catch (error) {
      console.error('Error fetching project data:', error)
      setError('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || sendingMessage) return
    
    setSendingMessage(true)
    try {
      const response = await api.post(`/client/project/${projectToken}/messages`, {
        content: newMessage.trim()
      })
      
      if (response.data.success) {
        // Add the new message to the local state
        const newMsg = {
          id: Date.now(),
          content: newMessage.trim(),
          sender: 'client' as const,
          timestamp: new Date().toISOString(),
          senderName: 'You'
        }
        
        setProject(prev => prev ? {
          ...prev,
          messages: [...prev.messages, newMsg]
        } : null)
        
        setNewMessage('')
      } else {
        alert('Failed to send message. Please try again.')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message. Please try again.')
    } finally {
      setSendingMessage(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'active': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'on_hold': return 'bg-gray-100 text-gray-800'
      case 'pending': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMilestoneIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-5 w-5 text-green-600" />
      case 'in_progress': return <Clock className="h-5 w-5 text-blue-600" />
      case 'pending': return <AlertCircle className="h-5 w-5 text-gray-400" />
      default: return <AlertCircle className="h-5 w-5 text-gray-400" />
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-lg">Loading your project...</div>
      </div>
    )
  }

  if (error || !project || !clientInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Error</h1>
          <p className="text-gray-600 mb-4">{error || 'Project not found'}</p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Go Back
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{clientInfo.companyName}</h1>
                <p className="text-gray-600">{project.name}</p>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(project.status)}`}>
                  {project.status.replace('_', ' ')}
                </span>
                <p className="text-sm text-gray-600 mt-1">Due: {new Date(project.dueDate).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation Tabs */}
        <div className="bg-white rounded-lg shadow-sm border mb-8">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'overview', label: 'Overview', icon: Eye },
                { id: 'milestones', label: 'Milestones', icon: CheckCircle },
                { id: 'files', label: 'Files', icon: Paperclip },
                { id: 'messages', label: 'Messages', icon: MessageCircle }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Progress Overview */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Project Progress</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                    <span className="text-sm font-medium">{project.progress}% Complete</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-blue-600 h-3 rounded-full transition-all duration-300" 
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-gray-600">{project.description}</p>
                </div>
              </div>

              {/* Payment Information */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Payment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Total Project Value</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(project.totalValue)}</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-600">Amount Paid</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(project.paidAmount)}</p>
                  </div>
                  {project.nextPayment > 0 && (
                    <div className="text-center p-4 bg-orange-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-600">Next Payment</p>
                      <p className="text-2xl font-bold text-orange-600">{formatCurrency(project.nextPayment)}</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'milestones' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Project Milestones</h3>
              <div className="space-y-4">
                {project.milestones.map((milestone, index) => (
                  <div key={milestone.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-shrink-0 mt-1">
                      {getMilestoneIcon(milestone.status)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900">{milestone.title}</h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(milestone.status)}`}>
                          {milestone.status.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                      <div className="flex items-center text-xs text-gray-500 mt-2">
                        <Calendar className="h-3 w-3 mr-1" />
                        <span>Due: {new Date(milestone.dueDate).toLocaleDateString()}</span>
                        {milestone.completedAt && (
                          <>
                            <span className="mx-2">•</span>
                            <span>Completed: {new Date(milestone.completedAt).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'files' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Project Files</h3>
              <div className="space-y-3">
                {project.files.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Paperclip className="h-5 w-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{file.name}</p>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.size)} • Uploaded by {file.uploadedBy} on {new Date(file.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <a
                      href={file.url}
                      download={file.name}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center space-x-1"
                    >
                      <Download className="h-3 w-3" />
                      <span>Download</span>
                    </a>
                  </div>
                ))}
                {project.files.length === 0 && (
                  <p className="text-center text-gray-500 py-8">No files available yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'messages' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-6">Project Communication</h3>
              
              {/* Messages */}
              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {project.messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'client' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.sender === 'client'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-900'
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <div className={`text-xs mt-1 ${message.sender === 'client' ? 'text-blue-100' : 'text-gray-500'}`}>
                        {message.senderName} • {new Date(message.timestamp).toLocaleDateString()} {new Date(message.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Message Input */}
              <div className="flex space-x-3">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={sendingMessage}
                />
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sendingMessage}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>{sendingMessage ? 'Sending...' : 'Send'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClientPortal 