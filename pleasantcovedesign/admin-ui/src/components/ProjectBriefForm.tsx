import React, { useState } from 'react';
import { 
  Save, Calendar, Users, Palette, Camera, Globe, 
  Clock, CheckCircle, FileText, MessageCircle,
  Plus, X, Upload, ExternalLink
} from 'lucide-react';

interface ProjectBriefFormProps {
  orderId: string;
  companyId: string;
  companyName: string;
  onClose: () => void;
  onSaved: (briefId: string) => void;
}

export default function ProjectBriefForm({ 
  orderId, 
  companyId, 
  companyName, 
  onClose, 
  onSaved 
}: ProjectBriefFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('meeting');
  
  // Form state matching ProjectBrief interface
  const [formData, setFormData] = useState({
    // Meeting Information
    meetingDate: new Date().toISOString().split('T')[0],
    attendees: [''],
    meetingNotes: '',
    
    // Brand & Design
    brandColors: {
      primary: '',
      secondary: '',
      accent: '',
      preferences: ''
    },
    logoInfo: {
      hasExistingLogo: false,
      logoStyle: 'modern' as const,
      logoNotes: ''
    },
    designStyle: {
      overall: 'modern' as const,
      inspiration: [''],
      competitorSites: [''],
      avoidStyles: '',
      designNotes: ''
    },
    
    // Content & Functionality
    contentPlan: {
      copyWriter: 'client' as const,
      photography: 'client' as const,
      videoNeeds: false,
      contentDeadline: '',
      contentNotes: ''
    },
    siteStructure: {
      pages: [{ name: 'Home', purpose: 'Main landing page', priority: 'must-have' as const }],
      navigation: '',
      specialFeatures: [''],
      integrations: ['']
    },
    
    // Timeline & Communication
    timeline: {
      launchGoal: '',
      urgency: 'standard' as const,
      timelineNotes: ''
    },
    stakeholders: {
      decisionMaker: '',
      primaryContact: '',
      reviewers: [''],
      approvalProcess: ''
    }
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/project-briefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          companyId,
          ...formData,
          completedBy: 'Admin', // TODO: Get from auth context
          status: 'draft'
        })
      });
      
      if (!response.ok) throw new Error('Failed to save project brief');
      
      const result = await response.json();
      onSaved(result.id);
    } catch (error) {
      console.error('Error saving project brief:', error);
      alert('Failed to save project brief. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addArrayItem = (path: string) => {
    const pathParts = path.split('.');
    const newData = { ...formData };
    let current: any = newData;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    
    const lastKey = pathParts[pathParts.length - 1];
    if (Array.isArray(current[lastKey])) {
      current[lastKey].push('');
    }
    
    setFormData(newData);
  };

  const removeArrayItem = (path: string, index: number) => {
    const pathParts = path.split('.');
    const newData = { ...formData };
    let current: any = newData;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }
    
    const lastKey = pathParts[pathParts.length - 1];
    if (Array.isArray(current[lastKey])) {
      current[lastKey].splice(index, 1);
    }
    
    setFormData(newData);
  };

  const updateNestedValue = (path: string, value: any) => {
    const pathParts = path.split('.');
    const newData = { ...formData };
    let current: any = newData;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      if (!current[pathParts[i]]) {
        current[pathParts[i]] = {};
      }
      current = current[pathParts[i]];
    }
    
    current[pathParts[pathParts.length - 1]] = value;
    setFormData(newData);
  };

  const tabs = [
    { id: 'meeting', name: 'Meeting Info', icon: Calendar },
    { id: 'brand', name: 'Brand & Design', icon: Palette },
    { id: 'content', name: 'Content & Features', icon: FileText },
    { id: 'timeline', name: 'Timeline & Team', icon: Clock },
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-2xl font-semibold text-gray-900">Project Brief</h2>
            <p className="text-gray-600">{companyName} - Order #{orderId.slice(-8)}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b">
          <nav className="flex space-x-8 px-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{tab.name}</span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Meeting Info Tab */}
          {activeTab === 'meeting' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Date
                  </label>
                  <input
                    type="date"
                    value={formData.meetingDate}
                    onChange={(e) => setFormData({...formData, meetingDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meeting Attendees
                  </label>
                  {formData.attendees.map((attendee, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={attendee}
                        onChange={(e) => {
                          const newAttendees = [...formData.attendees];
                          newAttendees[index] = e.target.value;
                          setFormData({...formData, attendees: newAttendees});
                        }}
                        placeholder="Name and role"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.attendees.length > 1 && (
                        <button
                          onClick={() => removeArrayItem('attendees', index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('attendees')}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Attendee
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Notes & Key Points
                </label>
                <textarea
                  value={formData.meetingNotes}
                  onChange={(e) => setFormData({...formData, meetingNotes: e.target.value})}
                  rows={6}
                  placeholder="Key discussion points, decisions made, client concerns, special requests..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Brand & Design Tab */}
          {activeTab === 'brand' && (
            <div className="space-y-6">
              {/* Brand Colors */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Palette className="h-5 w-5 mr-2" />
                  Brand Colors
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Primary Color</label>
                    <input
                      type="color"
                      value={formData.brandColors.primary}
                      onChange={(e) => updateNestedValue('brandColors.primary', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Secondary Color</label>
                    <input
                      type="color"
                      value={formData.brandColors.secondary}
                      onChange={(e) => updateNestedValue('brandColors.secondary', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Accent Color</label>
                    <input
                      type="color"
                      value={formData.brandColors.accent}
                      onChange={(e) => updateNestedValue('brandColors.accent', e.target.value)}
                      className="w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Color Preferences & Notes</label>
                  <input
                    type="text"
                    value={formData.brandColors.preferences}
                    onChange={(e) => updateNestedValue('brandColors.preferences', e.target.value)}
                    placeholder="e.g., warm tones, professional blues, avoid bright colors..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Logo Information */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Logo Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.logoInfo.hasExistingLogo}
                        onChange={(e) => updateNestedValue('logoInfo.hasExistingLogo', e.target.checked)}
                        className="mr-2"
                      />
                      Client has existing logo
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo Style Preference</label>
                      <select
                        value={formData.logoInfo.logoStyle}
                        onChange={(e) => updateNestedValue('logoInfo.logoStyle', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="modern">Modern</option>
                        <option value="classic">Classic</option>
                        <option value="minimal">Minimal</option>
                        <option value="playful">Playful</option>
                        <option value="professional">Professional</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Logo Notes</label>
                      <input
                        type="text"
                        value={formData.logoInfo.logoNotes}
                        onChange={(e) => updateNestedValue('logoInfo.logoNotes', e.target.value)}
                        placeholder="Special requirements, inspiration..."
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Design Style */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Design Style</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Overall Style</label>
                    <select
                      value={formData.designStyle.overall}
                      onChange={(e) => updateNestedValue('designStyle.overall', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="modern">Modern</option>
                      <option value="classic">Classic</option>
                      <option value="minimal">Minimal</option>
                      <option value="bold">Bold</option>
                      <option value="elegant">Elegant</option>
                      <option value="playful">Playful</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Inspiration Sites/References</label>
                    {formData.designStyle.inspiration?.map((site, index) => (
                      <div key={index} className="flex items-center space-x-2 mb-2">
                        <input
                          type="url"
                          value={site}
                          onChange={(e) => {
                            const newSites = [...(formData.designStyle.inspiration || [])];
                            newSites[index] = e.target.value;
                            updateNestedValue('designStyle.inspiration', newSites);
                          }}
                          placeholder="https://example.com"
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {formData.designStyle.inspiration && formData.designStyle.inspiration.length > 1 && (
                          <button
                            onClick={() => removeArrayItem('designStyle.inspiration', index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addArrayItem('designStyle.inspiration')}
                      className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Inspiration Site
                    </button>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Design Notes</label>
                    <textarea
                      value={formData.designStyle.designNotes}
                      onChange={(e) => updateNestedValue('designStyle.designNotes', e.target.value)}
                      rows={3}
                      placeholder="Style preferences, things to avoid, specific requests..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Content & Features Tab */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Content Plan */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Content Plan
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Who writes the copy?</label>
                    <select
                      value={formData.contentPlan.copyWriter}
                      onChange={(e) => updateNestedValue('contentPlan.copyWriter', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="client">Client provides copy</option>
                      <option value="pcd">Pleasant Cove Design writes</option>
                      <option value="hybrid">Collaborative approach</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Photography approach?</label>
                    <select
                      value={formData.contentPlan.photography}
                      onChange={(e) => updateNestedValue('contentPlan.photography', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="client">Client provides photos</option>
                      <option value="pcd">Professional photography</option>
                      <option value="stock">Stock photography</option>
                      <option value="hybrid">Mix of approaches</option>
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 mb-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.contentPlan.videoNeeds}
                      onChange={(e) => updateNestedValue('contentPlan.videoNeeds', e.target.checked)}
                      className="mr-2"
                    />
                    Video content needed
                  </label>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Content Notes</label>
                  <textarea
                    value={formData.contentPlan.contentNotes}
                    onChange={(e) => updateNestedValue('contentPlan.contentNotes', e.target.value)}
                    rows={3}
                    placeholder="Content strategy, tone, special requirements..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Site Structure */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Site Structure & Features
                </h3>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Pages Needed</label>
                  {formData.siteStructure.pages?.map((page, index) => (
                    <div key={index} className="grid grid-cols-3 gap-2 mb-2">
                      <input
                        type="text"
                        value={page.name}
                        onChange={(e) => {
                          const newPages = [...(formData.siteStructure.pages || [])];
                          newPages[index] = { ...newPages[index], name: e.target.value };
                          updateNestedValue('siteStructure.pages', newPages);
                        }}
                        placeholder="Page name"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <input
                        type="text"
                        value={page.purpose}
                        onChange={(e) => {
                          const newPages = [...(formData.siteStructure.pages || [])];
                          newPages[index] = { ...newPages[index], purpose: e.target.value };
                          updateNestedValue('siteStructure.pages', newPages);
                        }}
                        placeholder="Purpose/content"
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center space-x-2">
                        <select
                          value={page.priority}
                          onChange={(e) => {
                            const newPages = [...(formData.siteStructure.pages || [])];
                            newPages[index] = { ...newPages[index], priority: e.target.value as 'must-have' | 'nice-to-have' };
                            updateNestedValue('siteStructure.pages', newPages);
                          }}
                          className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="must-have">Must Have</option>
                          <option value="nice-to-have">Nice to Have</option>
                        </select>
                        {formData.siteStructure.pages && formData.siteStructure.pages.length > 1 && (
                          <button
                            onClick={() => removeArrayItem('siteStructure.pages', index)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      const newPages = [...(formData.siteStructure.pages || [])];
                      newPages.push({ name: '', purpose: '', priority: 'must-have' });
                      updateNestedValue('siteStructure.pages', newPages);
                    }}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Page
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Special Features Needed</label>
                  {formData.siteStructure.specialFeatures?.map((feature, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={feature}
                        onChange={(e) => {
                          const newFeatures = [...(formData.siteStructure.specialFeatures || [])];
                          newFeatures[index] = e.target.value;
                          updateNestedValue('siteStructure.specialFeatures', newFeatures);
                        }}
                        placeholder="e.g., contact forms, booking system, e-commerce..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.siteStructure.specialFeatures && formData.siteStructure.specialFeatures.length > 1 && (
                        <button
                          onClick={() => removeArrayItem('siteStructure.specialFeatures', index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('siteStructure.specialFeatures')}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Feature
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Timeline & Team Tab */}
          {activeTab === 'timeline' && (
            <div className="space-y-6">
              {/* Timeline */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Project Timeline
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Launch Goal Date</label>
                    <input
                      type="date"
                      value={formData.timeline.launchGoal}
                      onChange={(e) => updateNestedValue('timeline.launchGoal', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Project Urgency</label>
                    <select
                      value={formData.timeline.urgency}
                      onChange={(e) => updateNestedValue('timeline.urgency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="standard">Standard Timeline</option>
                      <option value="priority">Priority Project</option>
                      <option value="rush">Rush Job</option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Timeline Notes</label>
                  <textarea
                    value={formData.timeline.timelineNotes}
                    onChange={(e) => updateNestedValue('timeline.timelineNotes', e.target.value)}
                    rows={3}
                    placeholder="Special deadlines, constraints, flexibility..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Stakeholders */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Project Stakeholders
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Decision Maker</label>
                    <input
                      type="text"
                      value={formData.stakeholders.decisionMaker}
                      onChange={(e) => updateNestedValue('stakeholders.decisionMaker', e.target.value)}
                      placeholder="Who makes final decisions?"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Contact</label>
                    <input
                      type="text"
                      value={formData.stakeholders.primaryContact}
                      onChange={(e) => updateNestedValue('stakeholders.primaryContact', e.target.value)}
                      placeholder="Day-to-day contact person"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Additional Reviewers</label>
                  {formData.stakeholders.reviewers?.map((reviewer, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={reviewer}
                        onChange={(e) => {
                          const newReviewers = [...(formData.stakeholders.reviewers || [])];
                          newReviewers[index] = e.target.value;
                          updateNestedValue('stakeholders.reviewers', newReviewers);
                        }}
                        placeholder="Name and role"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {formData.stakeholders.reviewers && formData.stakeholders.reviewers.length > 1 && (
                        <button
                          onClick={() => removeArrayItem('stakeholders.reviewers', index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => addArrayItem('stakeholders.reviewers')}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Reviewer
                  </button>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Approval Process</label>
                  <textarea
                    value={formData.stakeholders.approvalProcess}
                    onChange={(e) => updateNestedValue('stakeholders.approvalProcess', e.target.value)}
                    rows={3}
                    placeholder="How decisions are made, who needs to approve what..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t px-6 py-4 bg-gray-50 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Complete this form based on your meeting notes. The client will review and confirm these details.
          </div>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save & Send to Client
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 