import React, { useState, useEffect } from 'react'
import { DollarSign, Clock, CheckCircle, Upload, Paperclip, Eye, MessageCircle, Calendar } from 'lucide-react'
import ProgressTracker from '../components/ProgressTracker'
import api from '../api'

interface ProjectFile {
  id: number
  name: string
  size: number
  uploadedAt: string
  uploadedBy: string
  url: string
}

interface Project {
  id: number
  name: string
  status: string
  progress: number
  totalValue: number
  paidAmount: number
  nextPayment: number
  dueDate: string
  clientName: string
  description: string
  files: ProjectFile[]
}

const Progress: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [uploadingFiles, setUploadingFiles] = useState<Set<number>>(new Set())

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      
      // Try to fetch real projects
      try {
        const [projectsRes, companiesRes] = await Promise.all([
          api.get('/projects'),
          api.get('/companies')
        ])
        
        const companiesMap = companiesRes.data.reduce((acc: any, company: any) => {
          acc[company.id] = company
          return acc
        }, {})
        
        const projectsWithDetails = projectsRes.data.map((project: any) => {
          const company = companiesMap[project.companyId]
          return {
            id: project.id,
            name: project.name || `${company?.name} Website`,
            status: project.status || 'active',
            progress: project.progress || 25,
            totalValue: project.totalValue || 2497,
            paidAmount: project.paidAmount || 1200,
            nextPayment: project.nextPayment || 1297,
            dueDate: project.dueDate || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            clientName: company?.name || 'Unknown Client',
            description: project.description || 'Professional website development',
            files: project.files || []
          }
        })
        
        setProjects(projectsWithDetails)
      } catch (error) {
        console.log('No real project data, using enhanced mock data')
        
        // Enhanced mock data for demonstration
        const mockProjects: Project[] = [
          {
            id: 1,
            name: "Coastal Maine Restaurant Website",
            status: "in_progress",
            progress: 65,
            totalValue: 2497,
            paidAmount: 1200,
            nextPayment: 1297,
            dueDate: "2024-02-15",
            clientName: "Coastal Maine Restaurant",
            description: "Professional restaurant website with online ordering",
            files: [
              {
                id: 1,
                name: "restaurant_logo.png",
                size: 245000,
                uploadedAt: "2024-01-15",
                uploadedBy: "Client",
                url: "#"
              },
              {
                id: 2,
                name: "menu_items.pdf",
                size: 1200000,
                uploadedAt: "2024-01-18",
                uploadedBy: "Client",
                url: "#"
              }
            ]
          },
          {
            id: 2,
            name: "AutoFix Garage Website",
            status: "review",
            progress: 85,
            totalValue: 1997,
            paidAmount: 1997,
            nextPayment: 0,
            dueDate: "2024-02-10",
            clientName: "AutoFix Garage",
            description: "Automotive service website with appointment booking",
            files: [
              {
                id: 3,
                name: "service_photos.zip",
                size: 15600000,
                uploadedAt: "2024-01-20",
                uploadedBy: "Developer",
                url: "#"
              }
            ]
          }
        ]
        
        setProjects(mockProjects)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (projectId: number, file: File) => {
    setUploadingFiles(prev => new Set(prev).add(projectId))
    
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('projectId', projectId.toString())
      
      const response = await api.post('/projects/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.success) {
        // Update project files in local state
        setProjects(prev => prev.map(project => 
          project.id === projectId 
            ? { 
                ...project, 
                files: [...project.files, {
                  id: Date.now(),
                  name: file.name,
                  size: file.size,
                  uploadedAt: new Date().toISOString().split('T')[0],
                  uploadedBy: 'You',
                  url: response.data.fileUrl || '#'
                }]
              }
            : project
        ))
        
        alert('✅ File uploaded successfully!')
      } else {
        alert('❌ Upload failed. Please try again.')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('❌ Upload failed. Please try again.')
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(projectId)
        return newSet
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'review': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'on_hold': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalRevenue = projects.reduce((sum, project) => sum + project.totalValue, 0)
  const totalPaid = projects.reduce((sum, project) => sum + project.paidAmount, 0)
  const totalPending = projects.reduce((sum, project) => sum + project.nextPayment, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading projects...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Project Progress</h1>
        <p className="text-muted mt-1">Track your active projects and payments</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Total Revenue</p>
              <p className="text-2xl font-bold text-foreground">${totalRevenue.toLocaleString()}</p>
            </div>
            <DollarSign className="h-8 w-8 text-primary-500" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Payments Received</p>
              <p className="text-2xl font-bold text-success">${totalPaid.toLocaleString()}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-success" />
          </div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted">Pending Payments</p>
              <p className="text-2xl font-bold text-warning">${totalPending.toLocaleString()}</p>
            </div>
            <Clock className="h-8 w-8 text-warning" />
          </div>
        </div>
      </div>

      {/* Active Projects */}
      <div className="bg-white rounded-xl shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <h3 className="text-lg font-semibold text-foreground">Active Projects</h3>
        </div>
        <div className="p-6">
          {projects.length > 0 ? (
            <div className="space-y-6">
              {projects.map((project) => (
                <ProgressTracker key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Clock className="h-16 w-16 mx-auto" />
              </div>
              <h4 className="text-lg font-medium text-gray-900 mb-2">No Active Projects</h4>
              <p className="text-gray-500">Projects will appear here when you start working with clients.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Progress 