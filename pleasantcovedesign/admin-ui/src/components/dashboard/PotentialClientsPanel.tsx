import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Phone, Mail } from 'lucide-react'
import Card from '../Card'
import api from '../../api'
import type { Company } from '../../../../shared/schema'

const PotentialClientsPanel: React.FC = () => {
  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        const response = await api.get<Company[]>('/companies')
        // Get top 5 leads, prioritizing those without projects (new leads)
        const sortedLeads = response.data
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 5)
        setLeads(sortedLeads)
      } catch (error) {
        console.error('Failed to fetch leads:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchLeads()
  }, [])

  const newLeadsCount = leads.filter(lead => {
    const createdDate = new Date(lead.createdAt || '')
    const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceCreation <= 7 // Consider leads from last 7 days as "new"
  }).length

  return (
    <Card>
      <Link to="/leads" className="block">
        <div className="flex items-center gap-2 mb-4 hover:text-blue-600 transition-colors cursor-pointer">
          <Search className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            Potential Clients ({newLeadsCount} new leads)
          </h3>
        </div>
      </Link>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : leads.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No leads yet</div>
      ) : (
        <div className="space-y-3">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              to={`/leads/${lead.id}`}
              className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{lead.name}</p>
                  <p className="text-sm text-gray-500">
                    Source: {lead.industry || 'Unknown'}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {lead.phone && (
                    <Phone className="w-4 h-4 text-gray-400" />
                  )}
                  {lead.email && (
                    <Mail className="w-4 h-4 text-gray-400" />
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <Link
        to="/leads"
        className="block mt-4 text-center text-blue-600 hover:text-blue-700 font-medium"
      >
        View All Leads →
      </Link>
    </Card>
  )
}

export default PotentialClientsPanel 