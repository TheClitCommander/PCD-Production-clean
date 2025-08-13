import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  HelpCircle,
  Users,
  RefreshCw,
  Eye,
  Save,
  Trash2,
  Archive
} from 'lucide-react';
import api from '../api';

interface Lead {
  id: string;
  name: string;
  category?: string;
  city?: string;
  region?: string;
  phoneNormalized?: string;
  emailNormalized?: string;
  websiteUrl?: string;
  websiteStatus: 'HAS_SITE' | 'NO_SITE' | 'SOCIAL_ONLY' | 'UNSURE' | 'UNKNOWN';
  websiteConfidence: number;
  hasContactForm?: boolean;
  contactEmails?: string[];
  socialUrls?: string[];
  verificationEvidence?: any;
  createdAt: string;
}

interface LeadsTableProps {
  onLeadSelect?: (lead: Lead) => void;
}

const LeadsTable: React.FC<LeadsTableProps> = ({ onLeadSelect }) => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [websiteStatusFilter, setWebsiteStatusFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('');
  
  // Pagination
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  const fetchLeads = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: (page * limit).toString()
      });

      if (searchTerm.trim()) {
        params.append('query', searchTerm.trim());
      }

      if (websiteStatusFilter !== 'all') {
        params.append('websiteStatus', websiteStatusFilter);
      }

      if (cityFilter.trim()) {
        params.append('city', cityFilter.trim());
      }

      console.log('🔍 Fetching leads from:', `/leads?${params.toString()}`);
      const response = await api.get(`/leads?${params.toString()}`);
      console.log('📊 API Response:', response.data);
      
      const leadsData = response.data.leads || [];
      const totalData = response.data.total || 0;
      
      console.log(`📋 Setting ${leadsData.length} leads, total: ${totalData}`);
      setLeads(leadsData);
      setTotal(totalData);
      
      if (leadsData.length === 0) {
        console.log('⚠️ No leads found - check if scraper has run and saved data');
      }
    } catch (err: any) {
      console.error('❌ Failed to fetch leads:', err);
      console.error('❌ Error details:', err.response?.data);
      setError(err.response?.data?.error || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [page, searchTerm, websiteStatusFilter, cityFilter]);

  // Refresh leads when the page becomes visible (e.g., after navigating from scrape progress)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('🔄 Page became visible, refreshing leads...');
        fetchLeads();
      }
    };

    const handleFocus = () => {
      console.log('🔄 Window focused, refreshing leads...');
      fetchLeads();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const getWebsiteStatusBadge = (status: string, confidence: number) => {
    const badges = {
      'HAS_SITE': {
        icon: <CheckCircle className="h-3 w-3" />,
        text: 'Has Website',
        className: 'bg-green-100 text-green-800 border-green-200'
      },
      'NO_SITE': {
        icon: <XCircle className="h-3 w-3" />,
        text: 'No Website',
        className: 'bg-red-100 text-red-800 border-red-200'
      },
      'SOCIAL_ONLY': {
        icon: <Users className="h-3 w-3" />,
        text: 'Social Only',
        className: 'bg-blue-100 text-blue-800 border-blue-200'
      },
      'UNSURE': {
        icon: <AlertCircle className="h-3 w-3" />,
        text: 'Uncertain',
        className: 'bg-yellow-100 text-yellow-800 border-yellow-200'
      },
      'UNKNOWN': {
        icon: <HelpCircle className="h-3 w-3" />,
        text: 'Unknown',
        className: 'bg-gray-100 text-gray-800 border-gray-200'
      }
    };

    const badge = badges[status as keyof typeof badges] || badges.UNKNOWN;

    return (
      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs font-medium ${badge.className}`}>
        {badge.icon}
        {badge.text}
        {confidence > 0 && (
          <span className="ml-1 opacity-75">
            ({Math.round(confidence * 100)}%)
          </span>
        )}
      </div>
    );
  };

  const handleReverifyWebsite = async (leadId: string) => {
    try {
      const response = await api.post(`/leads/${leadId}/verify-website`);
      // Update the lead in our list
      setLeads(prev => prev.map(lead => 
        lead.id === leadId ? { ...lead, ...response.data } : lead
      ));
    } catch (err) {
      console.error('Failed to reverify website:', err);
    }
  };

  const handleSaveLead = async (leadId: string) => {
    try {
      console.log('Saving lead to main database:', leadId);
      const response = await api.post('/leads/save-from-scraper', { scrapedBusinessId: leadId });
      
      // Show success message and refresh
      alert('Lead saved to main database!');
      fetchLeads();
    } catch (err: any) {
      console.error('Failed to save lead:', err);
      alert(`Failed to save lead: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead? This cannot be undone.')) {
      return;
    }
    
    try {
      console.log('Deleting lead:', leadId);
      await api.delete(`/leads/${leadId}`);
      
      // Refresh leads after deletion
      fetchLeads();
    } catch (err: any) {
      console.error('Failed to delete lead:', err);
      alert(`Failed to delete lead: ${err.response?.data?.error || err.message}`);
    }
  };

  const handleArchiveLead = async (leadId: string) => {
    const reason = prompt('Reason for archiving (contacted/not_interested/duplicate/other):') || 'other';
    
    try {
      console.log('Archiving lead:', leadId, 'Reason:', reason);
      await api.put(`/leads/${leadId}/archive`, { reason });
      
      // Show success and refresh
      alert(`Lead archived: ${reason}`);
      fetchLeads();
    } catch (err: any) {
      console.error('Failed to archive lead:', err);
      alert(`Failed to archive lead: ${err.response?.data?.error || err.message}`);
    }
  };

  if (loading && leads.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading leads...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <XCircle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-600 font-medium">Failed to load leads</p>
        <p className="text-red-500 text-sm mt-1">{error}</p>
        <button
          onClick={() => fetchLeads()}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 bg-gray-50 rounded-lg">
        {/* Search */}
        <div className="flex-1 min-w-64">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search leads..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        {/* Website Status Filter */}
        <select
          value={websiteStatusFilter}
          onChange={(e) => setWebsiteStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Website Status</option>
          <option value="HAS_SITE">Has Website</option>
          <option value="NO_SITE">No Website</option>
          <option value="SOCIAL_ONLY">Social Only</option>
          <option value="UNSURE">Uncertain</option>
          <option value="UNKNOWN">Unknown</option>
        </select>

        {/* City Filter */}
        <input
          type="text"
          placeholder="Filter by city..."
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />

        {/* Refresh Button */}
        <button
          onClick={() => fetchLeads()}
          className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          title="Refresh leads"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {leads.length} of {total} leads
        </p>
        <div className="text-xs text-gray-500">
          Page {page + 1} of {Math.ceil(total / limit)}
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-white rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Website Status
                </th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leads.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-medium text-gray-900">{lead.name}</div>
                      {lead.category && (
                        <div className="text-sm text-gray-500 capitalize">{lead.category}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <MapPin className="h-3 w-3" />
                      {lead.city && lead.region ? `${lead.city}, ${lead.region}` : lead.city || lead.region || 'Unknown'}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {lead.phoneNormalized && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="h-3 w-3" />
                          <span className="truncate">{lead.phoneNormalized}</span>
                        </div>
                      )}
                      {lead.contactEmails && lead.contactEmails.length > 0 && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="h-3 w-3" />
                          <span className="truncate">{lead.contactEmails[0]}</span>
                          {lead.contactEmails.length > 1 && (
                            <span className="text-xs text-gray-400">+{lead.contactEmails.length - 1}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {getWebsiteStatusBadge(lead.websiteStatus, lead.websiteConfidence)}
                      {lead.websiteUrl && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Globe className="h-3 w-3" />
                          <a 
                            href={lead.websiteUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="truncate hover:text-blue-600 max-w-32"
                          >
                            {lead.websiteUrl.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSaveLead(lead.id)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        title="Save to Leads Database"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleArchiveLead(lead.id)}
                        className="p-1 text-gray-400 hover:text-yellow-600 transition-colors"
                        title="Archive Lead"
                      >
                        <Archive className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteLead(lead.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete Lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleReverifyWebsite(lead.id)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Re-verify website"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onLeadSelect?.(lead)}
                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage(prev => Math.max(0, prev - 1))}
            disabled={page === 0}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(prev => prev + 1)}
            disabled={(page + 1) * limit >= total}
            className="px-4 py-2 text-sm border rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Empty State */}
      {leads.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Search className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No leads found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || websiteStatusFilter !== 'all' || cityFilter
              ? "Try adjusting your filters or search terms."
              : "Start by scraping some leads from your target markets."}
          </p>
        </div>
      )}
    </div>
  );
};

export default LeadsTable;
