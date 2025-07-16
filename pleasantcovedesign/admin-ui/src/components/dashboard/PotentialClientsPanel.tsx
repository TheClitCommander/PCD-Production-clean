import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, Phone, Mail, MessageCircle, Check, X } from 'lucide-react'
import Card from '../Card'
import api from '../../api'
import type { Company } from '../../../../shared/schema'

const PotentialClientsPanel: React.FC = () => {
  const [leads, setLeads] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingApproval, setUpdatingApproval] = useState<Set<number>>(new Set())

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        console.log('🔍 [DASHBOARD] Fetching companies...');
        const response = await api.get<Company[]>('/companies')
        console.log('🔍 [DASHBOARD] Companies response:', response.data);
        
        // Get top 5 leads, prioritizing those without projects (new leads)
        const sortedLeads = response.data
          .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
          .slice(0, 5)
        console.log('🔍 [DASHBOARD] Sorted leads:', sortedLeads);
        setLeads(sortedLeads)
      } catch (error) {
        console.error('❌ [DASHBOARD] Failed to fetch leads:', error)
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

  const approvedCount = leads.filter(lead => lead.contactApproved).length

  const isNewLead = (lead: Company) => {
    const createdDate = new Date(lead.createdAt || '')
    const daysSinceCreation = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceCreation <= 7
  }

  const toggleApproval = async (leadId: number, currentStatus: boolean) => {
    if (!leadId) return
    
    setUpdatingApproval(prev => new Set(prev).add(leadId))
    
    try {
      console.log(`🔄 [APPROVAL] Toggling approval for lead ${leadId}: ${currentStatus} -> ${!currentStatus}`)
      
      const response = await api.patch(`/companies/${leadId}`, {
        contactApproved: !currentStatus
      })
      
      if (response.status === 200) {
        // Update the local state
        setLeads(prev => prev.map(lead => 
          lead.id === leadId 
            ? { ...lead, contactApproved: !currentStatus }
            : lead
        ))
        console.log(`✅ [APPROVAL] Lead ${leadId} approval updated`)
      }
    } catch (error) {
      console.error(`❌ [APPROVAL] Failed to update approval for lead ${leadId}:`, error)
    } finally {
      setUpdatingApproval(prev => {
        const newSet = new Set(prev)
        newSet.delete(leadId)
        return newSet
      })
    }
  }

  return (
    <Card>
      <Link to="/leads" className="block">
        <div className="flex items-center gap-2 mb-4 hover:text-blue-600 transition-colors cursor-pointer">
          <Search className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            Potential Clients ({newLeadsCount} new • {approvedCount} approved)
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
            <div key={lead.id} className="group">
              <div className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors">
                {/* Approval Toggle */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toggleApproval(lead.id!, lead.contactApproved || false)
                  }}
                  disabled={updatingApproval.has(lead.id!)}
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                    lead.contactApproved 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : 'border-gray-300 hover:border-green-400'
                  } ${updatingApproval.has(lead.id!) ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {updatingApproval.has(lead.id!) ? (
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
                  ) : lead.contactApproved ? (
                    <Check className="w-3 h-3" />
                  ) : null}
                </button>

                {/* Lead Info - Clickable */}
                <Link
                  to={`/leads/${lead.id}`}
                  className="flex-1 min-w-0 cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{lead.name}</p>
                        {isNewLead(lead) && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            NEW
                          </span>
                        )}
                        {lead.contactApproved && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            APPROVED
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        Source: {lead.industry || 'Unknown'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      {lead.phone && (
                        <Phone className="w-4 h-4 text-green-500" />
                      )}
                      {lead.email && (
                        <Mail className="w-4 h-4 text-blue-500" />
                      )}
                      
                      {/* Quick Outreach Button - Only show if approved */}
                      {lead.contactApproved ? (
                        <button
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            console.log('Quick outreach for:', lead.name)
                            // TODO: Implement quick outreach
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-100 rounded"
                        >
                          <MessageCircle className="w-4 h-4 text-blue-600" />
                        </button>
                      ) : (
                        <div 
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 cursor-not-allowed"
                          title="Approve lead to enable outreach"
                        >
                          <MessageCircle className="w-4 h-4 text-gray-300" />
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              </div>
            </div>
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