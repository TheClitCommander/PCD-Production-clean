import React, { useState, useRef } from 'react';
import { Plus, TrendingUp, Users, Globe, CheckCircle } from 'lucide-react';
import { FEATURES } from '../config/featureFlags';
import LeadsTable from '../components/LeadsTable';
import StartScrapeModal from '../components/StartScrapeModal';
import ScrapeProgressPanel from '../components/ScrapeProgressPanel';

const LeadsUnified: React.FC = () => {
  const [showStartScrape, setShowStartScrape] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<any>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleScrapeStarted = (runId: string) => {
    setActiveRunId(runId);
    console.log('Scrape started with run ID:', runId);
  };

  const handleProgressClose = () => {
    setActiveRunId(null);
    // Force refresh the leads table when progress panel closes
    setRefreshTrigger(prev => prev + 1);
    console.log('🔄 Forcing leads table refresh after scrape completion');
  };

  const handleLeadSelect = (lead: any) => {
    setSelectedLead(lead);
    // TODO: Open lead details modal or navigate to detail page
    console.log('Lead selected:', lead);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lead Management</h1>
          <p className="text-gray-600 mt-1">
            Discover, verify, and manage leads from your target markets
          </p>
        </div>
        
        <div className="flex gap-3">
          {FEATURES.EXPORT_LEADS && (
            <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
              Export CSV
            </button>
          )}
          
          <button
            onClick={() => setShowStartScrape(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Start Scraping
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Leads</div>
              <div className="text-xl font-semibold text-gray-900">-</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Has Website</div>
              <div className="text-xl font-semibold text-gray-900">-</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Globe className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Contact Forms</div>
              <div className="text-xl font-semibold text-gray-900">-</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-sm text-gray-600">This Week</div>
              <div className="text-xl font-semibold text-gray-900">-</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-lg border">
        <LeadsTable key={refreshTrigger} onLeadSelect={handleLeadSelect} />
      </div>

      {/* Modals */}
      <StartScrapeModal
        isOpen={showStartScrape}
        onClose={() => setShowStartScrape(false)}
        onScrapeStarted={handleScrapeStarted}
      />

      {/* Progress Panel */}
      <ScrapeProgressPanel
        runId={activeRunId}
        onClose={handleProgressClose}
        onLeadUpdate={(lead) => {
          console.log('Lead updated:', lead);
          // TODO: Update the leads table in real-time
        }}
      />

      {/* Lead Details Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-xl">
            <h2 className="text-xl font-semibold mb-4">{selectedLead.name}</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Website Status
                </label>
                <div className="text-lg">{selectedLead.websiteStatus}</div>
                <div className="text-sm text-gray-500">
                  Confidence: {Math.round(selectedLead.websiteConfidence * 100)}%
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Location
                </label>
                <div>{selectedLead.city}, {selectedLead.region}</div>
              </div>
            </div>

            {selectedLead.verificationEvidence && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Evidence
                </label>
                <pre className="bg-gray-50 p-3 rounded text-xs overflow-auto">
                  {JSON.stringify(selectedLead.verificationEvidence, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                Convert to Client
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsUnified;
