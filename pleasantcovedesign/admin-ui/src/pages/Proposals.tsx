import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Search, Filter, Plus, FileText, Send, Check, X, Eye, Edit, Trash2, Loader2, DollarSign, User, Calendar } from 'lucide-react'
import api from '../api'

interface ProposalLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Proposal {
  id: string;
  leadId: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  totalAmount: number;
  lineItems: ProposalLineItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Enriched data from API
  leadName?: string;
  leadEmail?: string;
  leadPhone?: string;
}

const Proposals: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchProposals()
  }, [])

  const fetchProposals = async () => {
    try {
      setLoading(true)
      const response = await api.get('/proposals')
      setProposals(response.data)
      console.log(`📄 [PROPOSALS] Loaded ${response.data.length} proposals`)
    } catch (error) {
      console.error('❌ [PROPOSALS] Error fetching proposals:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (proposalId: string, newStatus: string) => {
    try {
      setActionLoading(prev => new Set([...prev, proposalId]))
      
      const response = await api.patch(`/proposals/${proposalId}`, {
        status: newStatus
      })

      // Update local state
      setProposals(prev => prev.map(p => 
        p.id === proposalId ? { ...p, ...response.data } : p
      ))

      console.log(`✅ Proposal ${proposalId} status changed to ${newStatus}`)
    } catch (error) {
      console.error(`Error updating proposal status:`, error)
      alert(`Failed to ${newStatus} proposal. Please try again.`)
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(proposalId)
        return newSet
      })
    }
  }

  const deleteProposal = async (proposalId: string) => {
    if (!confirm('Are you sure you want to delete this proposal? This action cannot be undone.')) {
      return
    }

    try {
      await api.delete(`/proposals/${proposalId}`)
      setProposals(prev => prev.filter(p => p.id !== proposalId))
      console.log(`🗑️ Proposal ${proposalId} deleted`)
    } catch (error) {
      console.error('Error deleting proposal:', error)
      alert('Failed to delete proposal. Please try again.')
    }
  }

  // Filter proposals based on search and status
  const filteredProposals = proposals.filter(proposal => {
    const matchesSearch = !searchTerm || 
      proposal.leadName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.leadEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposal.id.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || proposal.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  // Status badge component
  const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const getStatusStyle = (status: string) => {
      switch (status) {
        case 'draft':
          return 'bg-gray-100 text-gray-800 border-gray-300'
        case 'sent':
          return 'bg-blue-100 text-blue-800 border-blue-300'
        case 'accepted':
          return 'bg-green-100 text-green-800 border-green-300'
        case 'rejected':
          return 'bg-red-100 text-red-800 border-red-300'
        default:
          return 'bg-gray-100 text-gray-800 border-gray-300'
      }
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    )
  }

  // Action buttons component
  const ActionButtons: React.FC<{ proposal: Proposal }> = ({ proposal }) => {
    const isLoading = actionLoading.has(proposal.id)

    return (
      <div className="flex items-center gap-2">
        {/* View/Edit button */}
        <button
          onClick={() => navigate(`/proposals/${proposal.id}`)}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="View details"
        >
          <Eye className="h-4 w-4" />
        </button>

        {/* Status-specific actions */}
        {proposal.status === 'draft' && (
          <button
            onClick={() => handleStatusChange(proposal.id, 'sent')}
            disabled={isLoading}
            className="inline-flex items-center px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
            title="Send proposal"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Send className="h-3 w-3 mr-1" />}
            Send
          </button>
        )}

        {proposal.status === 'sent' && (
          <>
            <button
              onClick={() => handleStatusChange(proposal.id, 'accepted')}
              disabled={isLoading}
              className="inline-flex items-center px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition-colors"
              title="Accept proposal"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Check className="h-3 w-3 mr-1" />}
              Accept
            </button>
            <button
              onClick={() => handleStatusChange(proposal.id, 'rejected')}
              disabled={isLoading}
              className="inline-flex items-center px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 transition-colors"
              title="Reject proposal"
            >
              {isLoading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <X className="h-3 w-3 mr-1" />}
              Reject
            </button>
          </>
        )}

        {/* Delete button (for drafts and rejected) */}
        {(proposal.status === 'draft' || proposal.status === 'rejected') && (
          <button
            onClick={() => deleteProposal(proposal.id)}
            className="p-1 text-red-400 hover:text-red-600 transition-colors"
            title="Delete proposal"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }

  const stats = {
    total: proposals.length,
    draft: proposals.filter(p => p.status === 'draft').length,
    sent: proposals.filter(p => p.status === 'sent').length,
    accepted: proposals.filter(p => p.status === 'accepted').length,
    rejected: proposals.filter(p => p.status === 'rejected').length,
    totalValue: proposals.reduce((sum, p) => sum + p.totalAmount, 0)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Proposals</h1>
          <p className="text-gray-600 mt-1">Manage and track your project proposals</p>
        </div>
        <button
          onClick={() => navigate('/proposals/new')}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Proposal
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-semibold">{stats.total}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Edit className="h-5 w-5 text-gray-400 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Draft</p>
              <p className="text-xl font-semibold">{stats.draft}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Send className="h-5 w-5 text-blue-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Sent</p>
              <p className="text-xl font-semibold">{stats.sent}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <Check className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-xl font-semibold">{stats.accepted}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <X className="h-5 w-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-xl font-semibold">{stats.rejected}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <DollarSign className="h-5 w-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm text-gray-600">Total Value</p>
              <p className="text-xl font-semibold">${stats.totalValue.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search proposals by lead name, email, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Proposals Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {filteredProposals.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No proposals found</h3>
            <p className="text-gray-600 mb-4">
              {proposals.length === 0 
                ? "Get started by creating your first proposal"
                : "Try adjusting your search or filter criteria"
              }
            </p>
            {proposals.length === 0 && (
              <button
                onClick={() => navigate('/proposals/new')}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create First Proposal
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proposal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProposals.map((proposal) => (
                  <tr key={proposal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <FileText className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {proposal.id.substring(0, 8)}...
                          </div>
                          <div className="text-sm text-gray-500">
                            {proposal.lineItems.length} item{proposal.lineItems.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {proposal.leadName || 'Unknown Lead'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {proposal.leadEmail || 'No email'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={proposal.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${proposal.totalAmount.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <div className="text-sm text-gray-900">
                          {new Date(proposal.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <ActionButtons proposal={proposal} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Proposals