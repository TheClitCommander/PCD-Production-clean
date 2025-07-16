import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Hammer } from 'lucide-react'
import Card from '../Card'
import api from '../../api'
import type { Project, Company } from '../../../../shared/schema'

interface ProjectWithCompany extends Project {
  company?: Company
}

const CurrentProjectsPanel: React.FC = () => {
  const [projects, setProjects] = useState<ProjectWithCompany[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const [projectsRes, companiesRes] = await Promise.all([
          api.get<Project[]>('/projects'),
          api.get<Company[]>('/companies')
        ])
        
        // Create a map of companies for quick lookup
        const companyMap = new Map(
          companiesRes.data.map(company => [company.id, company])
        )
        
        // Filter active projects and add company info
        const activeProjects = projectsRes.data
          .filter(project => project.status === 'active')
          .map(project => ({
            ...project,
            company: companyMap.get(project.companyId)
          }))
          .sort((a, b) => {
            // Sort by scheduled time if available, otherwise by creation date
            const dateA = a.scheduledTime || a.createdAt || ''
            const dateB = b.scheduledTime || b.createdAt || ''
            return dateA.localeCompare(dateB)
          })
          .slice(0, 4) // Show max 4 projects
          
        setProjects(activeProjects)
      } catch (error) {
        console.error('Failed to fetch projects:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No due date'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    })
  }

  const activeCount = projects.length

  return (
    <Card>
      <Link to="/progress" className="block">
        <div className="flex items-center gap-2 mb-4 hover:text-blue-600 transition-colors cursor-pointer">
          <Hammer className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            Current Projects ({activeCount} active)
          </h3>
        </div>
      </Link>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No active projects</div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              to="/progress"
              className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors cursor-pointer"
            >
              <div className="space-y-1">
                <p className="font-medium truncate">
                  {project.title}
                  <span className="text-sm text-gray-500 ml-2">
                    ({project.stage})
                  </span>
                </p>
                <p className="text-sm text-gray-600">
                  {formatDate(project.scheduledTime)} • {project.company?.name || 'Unknown Client'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        to="/progress"
        className="block mt-4 text-center text-blue-600 hover:text-blue-700 font-medium"
      >
        View All Projects →
      </Link>
    </Card>
  )
}

export default CurrentProjectsPanel 