import React, { useState, useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Loader2, Activity } from 'lucide-react';
import api from '../api';

interface ScrapeRun {
  id: string;
  city: string;
  category: string;
  limitRequested: number;
  status: 'running' | 'completed' | 'failed';
  leadsFound: number;
  leadsProcessed: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ScrapeProgressPanelProps {
  runId: string | null;
  onClose: () => void;
  onLeadUpdate?: (lead: any) => void;
}

const ScrapeProgressPanel: React.FC<ScrapeProgressPanelProps> = ({ 
  runId, 
  onClose, 
  onLeadUpdate 
}) => {
  const [scrapeRun, setScrapeRun] = useState<ScrapeRun | null>(null);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!runId) return;

    const fetchScrapeRun = async () => {
      try {
        const response = await api.get(`/scrape-runs/${runId}`);
        setScrapeRun(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch scrape run:', error);
        setLoading(false);
      }
    };

    // Fetch initial state
    fetchScrapeRun();

    // Poll for updates every 2 seconds
    const interval = setInterval(fetchScrapeRun, 2000);

    return () => clearInterval(interval);
  }, [runId]);

  // Socket.IO listeners for real-time updates
  useEffect(() => {
    if (!runId) return;

    // Note: In a real implementation, you'd connect to Socket.IO here
    // For now, we'll rely on polling above
    console.log('Setting up Socket.IO listeners for runId:', runId);

    return () => {
      console.log('Cleaning up Socket.IO listeners');
    };
  }, [runId]);

  if (!runId) return null;

  if (loading) {
    return (
      <div className="fixed top-4 right-4 w-80 bg-white rounded-xl shadow-lg border p-4 z-40">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          <span className="text-sm text-gray-600">Loading scrape progress...</span>
        </div>
      </div>
    );
  }

  if (!scrapeRun) {
    return (
      <div className="fixed top-4 right-4 w-80 bg-white rounded-xl shadow-lg border p-4 z-40">
        <div className="flex items-center justify-between">
          <span className="text-sm text-red-600">Failed to load scrape progress</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  const progressPercent = scrapeRun.limitRequested > 0 
    ? Math.round((scrapeRun.leadsProcessed / scrapeRun.limitRequested) * 100)
    : 0;

  const getStatusIcon = () => {
    switch (scrapeRun.status) {
      case 'running':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = () => {
    switch (scrapeRun.status) {
      case 'running':
        return 'Scraping in progress...';
      case 'completed':
        return 'Scraping completed!';
      case 'failed':
        return 'Scraping failed';
      default:
        return 'Unknown status';
    }
  };

  return (
    <div className="fixed top-4 right-4 w-80 bg-white rounded-xl shadow-lg border z-40">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          {getStatusIcon()}
          <span className="font-medium text-gray-900">Lead Scraping</span>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress Content */}
      <div className="p-4 space-y-4">
        {/* Target Info */}
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm text-gray-600">Target</div>
          <div className="font-medium text-gray-900">
            {scrapeRun.category} in {scrapeRun.city}
          </div>
          <div className="text-xs text-gray-500">
            Goal: {scrapeRun.limitRequested} leads
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">
              {scrapeRun.leadsProcessed} / {scrapeRun.limitRequested} ({progressPercent}%)
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">{getStatusText()}</span>
          {scrapeRun.status === 'running' && (
            <div className="flex items-center gap-1 text-xs text-blue-600">
              <div className="animate-pulse">●</div>
              Live
            </div>
          )}
        </div>

        {/* Error Message */}
        {scrapeRun.status === 'failed' && scrapeRun.errorMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="text-sm text-red-600">
              <strong>Error:</strong> {scrapeRun.errorMessage}
            </div>
          </div>
        )}

        {/* Completion Info */}
        {scrapeRun.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="text-sm text-green-600">
              ✅ Found {scrapeRun.leadsFound} leads successfully!
            </div>
            {scrapeRun.completedAt && (
              <div className="text-xs text-green-500 mt-1">
                Completed at {new Date(scrapeRun.completedAt).toLocaleTimeString()}
              </div>
            )}
          </div>
        )}

        {/* Action Button */}
        {scrapeRun.status === 'completed' && (
          <button
            onClick={() => {
              // Close the progress panel and navigate to leads page to show real data
              onClose();
              window.location.href = '/leads';
            }}
            className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            View Results ({scrapeRun.leadsFound} leads)
          </button>
        )}
      </div>
    </div>
  );
};

export default ScrapeProgressPanel;
