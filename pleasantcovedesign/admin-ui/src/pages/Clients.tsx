import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Filter, Building2, DollarSign, Calendar, MessageCircle, TrendingUp, Eye, Plus } from 'lucide-react'
import api from '../api'
import { FEATURES } from '../config/featureFlags'

// Add Client Modal Component
function AddClientModal({ open, onClose, onCreated }: any) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", industry: "general" });
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const submit = async () => {
    if (!form.name.trim()) return;
    setBusy(true);
    try {
      const res = await api.post("/companies", { 
        ...form, 
        priority: "medium",
        stage: "new"
      });
      onCreated?.(res.data);
      onClose();
      setForm({ name: "", email: "", phone: "", industry: "general" });
    } catch (error) {
      console.error('Failed to create client:', error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md space-y-4">
        <h3 className="text-lg font-semibold">Add Client</h3>
        <input 
          className="w-full border rounded p-2" 
          placeholder="Company Name"
          value={form.name} 
          onChange={(e) => setForm({...form, name: e.target.value})}
        />
        <input 
          className="w-full border rounded p-2" 
          placeholder="Email"
          type="email"
          value={form.email} 
          onChange={(e) => setForm({...form, email: e.target.value})}
        />
        <input 
          className="w-full border rounded p-2" 
          placeholder="Phone"
          value={form.phone} 
          onChange={(e) => setForm({...form, phone: e.target.value})}
        />
        <select 
          className="w-full border rounded p-2"
          value={form.industry}
          onChange={(e) => setForm({...form, industry: e.target.value})}
        >
          <option value="general">General</option>
          <option value="restaurant">Restaurant</option>
          <option value="retail">Retail</option>
          <option value="healthcare">Healthcare</option>
          <option value="professional">Professional Services</option>
          <option value="other">Other</option>
        </select>
        <div className="flex gap-2 justify-end">
          <button className="px-3 py-2 text-gray-600" onClick={onClose}>Cancel</button>
          <button 
            className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50" 
            disabled={busy || !form.name.trim()} 
            onClick={submit}
          >
            {busy ? "Creating..." : "Create Client"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface Client {
  id: number;
  name: string;
  email: string;
  phone: string;
  industry: string;
  status: string;
  totalPaid: number;
  activeProjects: number;
  lastActivity: string;
  nextPayment?: string;
  projects: Project[];
  // Additional unified client properties
  source?: 'company' | 'scraped';
  stage?: string;
  priority?: string;
  website?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  hasConversations?: boolean;
  rating?: number;
  reviews?: number;
  mapsUrl?: string;
}

interface Project {
  id: number;
  name: string;
  status: string;
  progress: number;
  startDate: string;
  dueDate: string;
  value: number;
}

const Clients: React.FC = () => {
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [openAddClient, setOpenAddClient] = useState(false)

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      setLoading(true)
      
      // Fetch unified clients data (includes scraped leads + companies)
      const clientsRes = await api.get('/clients')
      
      // Transform the unified client data to match the component interface
      const clientsData = clientsRes.data.map((client: any) => ({
        id: client.originalId,
        name: client.name,
        email: client.email,
        phone: client.phone,
        industry: client.industry,
        status: client.status === 'active' ? 'Active Client' : 
                client.status === 'contacted' ? 'Contacted' : 
                client.source === 'scraped' ? 'Prospect' : 'Active',
        totalPaid: 0, // TODO: Calculate from orders if needed
        activeProjects: client.hasProjects ? 1 : 0, // Simplified for now
        lastActivity: client.createdAt?.split('T')[0] || new Date().toISOString().split('T')[0],
        nextPayment: undefined,
        projects: [], // TODO: Fetch projects if needed
        // Additional unified client data
        source: client.source,
        stage: client.stage,
        priority: client.priority,
        website: client.website,
        address: client.address,
        notes: client.notes,
        tags: client.tags,
        hasConversations: client.hasConversations,
        rating: client.rating,
        reviews: client.reviews,
        mapsUrl: client.mapsUrl
      }))

      console.log(`📊 [CLIENTS] Loaded ${clientsData.length} clients:`)
      console.log(`   - ${clientsData.filter((c: Client) => c.source === 'company').length} active clients`)
      console.log(`   - ${clientsData.filter((c: Client) => c.source === 'scraped').length} prospects (scraped)`)

      setClients(clientsData)
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || client.status.toLowerCase() === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-blue-100 text-blue-800'
      case 'on-hold': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalRevenue = clients.reduce((sum, client) => sum + client.totalPaid, 0)
  const activeClients = clients.filter(c => c.status === 'Active').length
  const totalProjects = clients.reduce((sum, client) => sum + client.projects.length, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading clients...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
          <p className="text-gray-600">Manage your active clients and projects</p>
        </div>
        {FEATURES.CLIENT_ADD && (
          <button
            onClick={() => setOpenAddClient(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Add Client</span>
          </button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">{clients.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">{activeClients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Projects</p>
              <p className="text-2xl font-bold text-gray-900">{totalProjects}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="on-hold">On Hold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Clients List */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-blue-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{client.name}</div>
                        <div className="text-sm text-gray-500">{client.email}</div>
                        <div className="text-sm text-gray-500">{client.phone}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(client.status)}`}>
                      {client.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <span className="font-medium">{client.activeProjects}</span>
                      <span className="text-gray-500 ml-1">active</span>
                      <span className="text-gray-400 mx-1">/</span>
                      <span className="text-gray-500">{client.projects.length} total</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${client.totalPaid.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {client.lastActivity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => navigate(`/clients/${client.id}`)}
                        className="text-blue-600 hover:text-blue-900 flex items-center"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </button>
                      <button
                        onClick={() => navigate(`/inbox?client=${client.id}`)}
                        className="text-green-600 hover:text-green-900 flex items-center"
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        Message
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredClients.length === 0 && (
        <div className="text-center py-12">
          <Building2 className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No clients found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm || statusFilter !== 'all' 
              ? 'Try adjusting your search or filter criteria.'
              : 'Clients will appear here once they have projects or paid orders.'
            }
          </p>
        </div>
      )}

      {/* Add Client Modal */}
      <AddClientModal
        open={openAddClient}
        onClose={() => setOpenAddClient(false)}
        onCreated={(newClient: any) => {
          setClients(prev => [newClient, ...prev]);
          console.log('New client created:', newClient);
        }}
      />
    </div>
  )
}

export default Clients 