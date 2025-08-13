import React, { useState } from 'react';
import { X, MapPin, Target, Settings } from 'lucide-react';
import api from '../api';

interface StartScrapeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScrapeStarted: (runId: string) => void;
}

const StartScrapeModal: React.FC<StartScrapeModalProps> = ({ isOpen, onClose, onScrapeStarted }) => {
  const [form, setForm] = useState({
    city: '',
    category: '',
    limit: 100
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    'restaurants',
    'plumbers',
    'dentists',
    'lawyers',
    'contractors',
    'real estate agents',
    'auto repair',
    'hair salons',
    'chiropractors',
    'accountants',
    'veterinarians',
    'electricians',
    'cleaning services',
    'fitness trainers',
    'photographers'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.city.trim() || !form.category.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.post('/scrape-runs', {
        city: form.city.trim(),
        category: form.category.trim(),
        limit: form.limit
      });

      if (response.data.runId) {
        onScrapeStarted(response.data.runId);
        onClose();
        // Reset form
        setForm({ city: '', category: '', limit: 100 });
      } else {
        throw new Error('No run ID returned from server');
      }
    } catch (err: any) {
      console.error('Failed to start scrape:', err);
      setError(err.response?.data?.error || 'Failed to start scrape. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Start Lead Scraping</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* City Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MapPin className="h-4 w-4 inline mr-1" />
              Target City *
            </label>
            <input
              type="text"
              value={form.city}
              onChange={(e) => setForm(prev => ({ ...prev, city: e.target.value }))}
              placeholder="e.g., Portland, Maine"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="h-4 w-4 inline mr-1" />
              Business Category *
            </label>
            <select
              value={form.category}
              onChange={(e) => setForm(prev => ({ ...prev, category: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Select a category...</option>
              {categories.map(category => (
                <option key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Limit Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Settings className="h-4 w-4 inline mr-1" />
              Number of Leads
            </label>
            <select
              value={form.limit}
              onChange={(e) => setForm(prev => ({ ...prev, limit: parseInt(e.target.value) }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={50}>50 leads</option>
              <option value={100}>100 leads</option>
              <option value={200}>200 leads</option>
              <option value={500}>500 leads</option>
            </select>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Starting...' : 'Start Scraping'}
            </button>
          </div>
        </form>

        {/* Info Note */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-600">
            💡 Leads will appear in real-time as they're processed. You can continue using the app while scraping runs in the background.
          </p>
        </div>
      </div>
    </div>
  );
};

export default StartScrapeModal;
