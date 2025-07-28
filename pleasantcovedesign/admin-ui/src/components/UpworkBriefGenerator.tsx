import React, { useState } from 'react';
import Card from './Card';

interface UpworkBriefGeneratorProps {
  orderId: string;
  orderData?: any;
}

interface MeetingNotes {
  date: string;
  type: string;
  business_description: string;
  tagline: string;
  value_prop_1: string;
  value_prop_2: string;
  value_prop_3: string;
  pain_points: string;
  success_metrics: string;
  timeline_constraints: string;
  special_instructions: string;
  project_folder_link: string;
  in_scope_pages: string;
  out_of_scope_notes: string;
  staging_url: string;
  deployment_platform: string;
}

export default function UpworkBriefGenerator({ orderId, orderData }: UpworkBriefGeneratorProps) {
  const [meetingNotes, setMeetingNotes] = useState<MeetingNotes>({
    date: new Date().toISOString().split('T')[0],
    type: 'Phone',
    business_description: '',
    tagline: '',
    value_prop_1: '',
    value_prop_2: '',
    value_prop_3: '',
    pain_points: '',
    success_metrics: '',
    timeline_constraints: '',
    special_instructions: '',
    project_folder_link: '',
    in_scope_pages: 'Homepage, About, Services, Contact',
    out_of_scope_notes: '',
    staging_url: '',
    deployment_platform: 'Railway'
  });

  const [generatedBrief, setGeneratedBrief] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  const updateMeetingNotes = (field: keyof MeetingNotes, value: string) => {
    setMeetingNotes(prev => ({ ...prev, [field]: value }));
  };

  const generateBrief = () => {
    setIsGenerating(true);
    
    const brief = `# 🚀 UPWORK PROJECT BRIEF
**Pleasant Cove Design - Website Development Handoff**

---

## 📋 PROJECT OVERVIEW

### Client Information
- **Business Name:** ${orderData?.business_name || 'NOT PROVIDED'}
- **Contact Name:** ${orderData?.client_name || 'NOT PROVIDED'}
- **Email:** ${orderData?.client_email || 'NOT PROVIDED'}
- **Industry:** ${orderData?.industry || 'NOT PROVIDED'}
- **Project ID:** ${orderId}
- **Order Date:** ${orderData?.created_at || 'NOT PROVIDED'}

### Selected Package
- **Site Type:** ${orderData?.site_type || 'NOT SPECIFIED'}
- **Selected Features:** ${orderData?.features?.join(', ') || 'NOT SPECIFIED'}
- **Demo URL Reference:** ${orderData?.demo_url || 'NOT PROVIDED'}

---

## 📁 FILE DIRECTORY & ACCESS LINKS

### Project Assets Organization
- **Main Project Folder:** ${meetingNotes.project_folder_link || 'TBD - Will be provided'}
  - /Branding/ - Logo files, brand guidelines, color palettes
  - /Assets/ - Photos, testimonials, business documents
  - /Copy/ - Website copy, headlines, service descriptions
  - /Reference/ - Demo links, competitor sites, inspiration
  - /Technical/ - Domain info, hosting details, integrations

### Access & Permissions
- **File Access:** View/Edit permissions granted to contractor
- **CMS Access:** Platform details provided separately
- **Hosting Access:** Domain registrar access if needed

---

## 🎯 PROJECT SCOPE DEFINITION

### ✅ IN-SCOPE (Included in Budget)
- **Pages Included:** ${meetingNotes.in_scope_pages}
- **Content Creation:** Copy editing, image optimization, basic SEO
- **Features Included:** ${orderData?.features?.join(', ') || 'Contact forms, basic functionality'}
- **Revisions Included:** 2 rounds of revisions included
- **Testing Included:** Cross-browser, mobile responsiveness, form testing
- **Launch Support:** Basic launch coordination and immediate bug fixes

### ❌ OUT-OF-SCOPE (Additional Cost)
- **Logo Design:** Not included - logo must be provided
- **Copywriting:** Major copy creation beyond editing
- **Advanced Features:** E-commerce, membership areas, custom applications
- **Content Migration:** Moving content from old site
- **Ongoing Maintenance:** Updates, backups, security monitoring
${meetingNotes.out_of_scope_notes ? '- **Additional Notes:** ' + meetingNotes.out_of_scope_notes : ''}

### 💰 Change Request Process
- **Minor Changes:** Under $50 - included in scope
- **Major Changes:** Require approval and additional billing
- **Timeline Impact:** Changes may affect launch date

---

## 📝 CONTENT REQUIREMENTS

### Business Information (From Client Meeting)
- **Business Description:** ${meetingNotes.business_description}
- **Headline/Tagline:** ${meetingNotes.tagline}

### Key Value Propositions:
1. ${meetingNotes.value_prop_1}
2. ${meetingNotes.value_prop_2}
3. ${meetingNotes.value_prop_3}

---

## 💬 CLIENT MEETING NOTES

**Date of Meeting:** ${meetingNotes.date}
**Meeting Type:** ${meetingNotes.type}

**Pain Points Client Mentioned:**
- ${meetingNotes.pain_points}

**Success Metrics Client Cares About:**
- ${meetingNotes.success_metrics}

**Timeline Constraints:**
- ${meetingNotes.timeline_constraints}

---

## 📞 COMMUNICATION PROTOCOL

### Escalation Path & Support
- **For Contractor Blockers:**
  - **Primary:** Ben Dickinson (Upwork Coordinator)
  - **Email:** ben@pleasantcovedesign.com
  - **Response Time:** Within 4 hours during business hours
- **For Technical Issues:**
  - **AI Assistant:** Minerva (available 24/7 via admin dashboard)
  - **Emergency Contact:** (207) 200-4281

---

## 🚀 DEVELOPER SANDBOX & DEPLOYMENT

### Development Environment
- **Staging URL:** ${meetingNotes.staging_url || 'TBD - Will be provided'}
- **Repository Access:** GitHub repo link if applicable
- **API Keys & Credentials:** Provided separately via secure channel

### Deployment Process
- **Platform:** ${meetingNotes.deployment_platform}
- **Domain Setup:** Ben handles domain pointing
- **Go-Live Approval:** Required from Ben before production deployment

### Post-Launch Support
- **Immediate Issues:** Contractor handles first 48 hours
- **Bug Fixes:** Included for 7 days post-launch
- **Performance Monitoring:** Ben handles ongoing monitoring

---

## 🚨 IMPORTANT NOTES & SPECIAL INSTRUCTIONS

${meetingNotes.special_instructions}

---

**Project Brief Generated:** ${new Date().toISOString().split('T')[0]}
**Pleasant Cove Project Manager:** Ben Dickinson
**Upwork Developer:** [TO BE ASSIGNED]

---

*This brief contains all requirements gathered through client meetings, messaging system interactions, and order specifications. Please confirm receipt and ask questions before beginning development.*`;

    setGeneratedBrief(brief);
    setIsGenerating(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedBrief);
  };

  const downloadBrief = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedBrief], { type: 'text/markdown' });
    element.href = URL.createObjectURL(file);
    element.download = `upwork_brief_${orderId}_${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-2">Generate Upwork Project Brief</h2>
          <p className="text-sm text-gray-600">
            Order ID: {orderId} | Fill in meeting notes to generate a comprehensive handoff brief
          </p>
        </div>

        <div className="space-y-6">
          {/* Meeting Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Meeting Date</label>
              <input
                type="date"
                value={meetingNotes.date}
                onChange={(e) => updateMeetingNotes('date', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Meeting Type</label>
              <select 
                value={meetingNotes.type} 
                onChange={(e) => updateMeetingNotes('type', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md"
              >
                <option value="Phone">Phone</option>
                <option value="Video">Video</option>
                <option value="In-person">In-person</option>
              </select>
            </div>
          </div>

          {/* Business Information */}
          <div>
            <label className="block text-sm font-medium mb-1">Business Description</label>
            <textarea
              placeholder="2-3 sentence summary of the business"
              value={meetingNotes.business_description}
              onChange={(e) => updateMeetingNotes('business_description', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md h-20"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Headline/Tagline</label>
            <input
              placeholder="What's their main message?"
              value={meetingNotes.tagline}
              onChange={(e) => updateMeetingNotes('tagline', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Value Propositions */}
          <div className="space-y-3">
            <h3 className="font-semibold">Value Propositions</h3>
            <input
              placeholder="What makes them unique?"
              value={meetingNotes.value_prop_1}
              onChange={(e) => updateMeetingNotes('value_prop_1', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            <input
              placeholder="Why do clients choose them?"
              value={meetingNotes.value_prop_2}
              onChange={(e) => updateMeetingNotes('value_prop_2', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
            <input
              placeholder="Special expertise or certifications?"
              value={meetingNotes.value_prop_3}
              onChange={(e) => updateMeetingNotes('value_prop_3', e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
            />
          </div>

          {/* Meeting Notes */}
          <div className="space-y-4">
            <h3 className="font-semibold">Meeting Notes</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1">Pain Points Mentioned</label>
              <textarea
                placeholder="What problems are they trying to solve?"
                value={meetingNotes.pain_points}
                onChange={(e) => updateMeetingNotes('pain_points', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Success Metrics</label>
              <textarea
                placeholder="What do they want the website to achieve?"
                value={meetingNotes.success_metrics}
                onChange={(e) => updateMeetingNotes('success_metrics', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Timeline Constraints</label>
              <textarea
                placeholder="Any specific deadlines or events?"
                value={meetingNotes.timeline_constraints}
                onChange={(e) => updateMeetingNotes('timeline_constraints', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md h-20"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Special Instructions</label>
              <textarea
                placeholder="Any other important notes for the developer?"
                value={meetingNotes.special_instructions}
                onChange={(e) => updateMeetingNotes('special_instructions', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md h-20"
              />
                          </div>
            </div>

            {/* Project Management */}
            <div className="space-y-4">
              <h3 className="font-semibold">Project Management</h3>
              
              <div>
                <label className="block text-sm font-medium mb-1">Project Folder Link</label>
                <input
                  placeholder="Google Drive or Dropbox folder URL"
                  value={meetingNotes.project_folder_link}
                  onChange={(e) => updateMeetingNotes('project_folder_link', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Pages In Scope</label>
                <input
                  placeholder="Homepage, About, Services, Contact"
                  value={meetingNotes.in_scope_pages}
                  onChange={(e) => updateMeetingNotes('in_scope_pages', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Additional Out-of-Scope Notes</label>
                <textarea
                  placeholder="Any specific exclusions or additional costs to note"
                  value={meetingNotes.out_of_scope_notes}
                  onChange={(e) => updateMeetingNotes('out_of_scope_notes', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md h-16"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Staging URL</label>
                  <input
                    placeholder="https://staging.clientdomain.com"
                    value={meetingNotes.staging_url}
                    onChange={(e) => updateMeetingNotes('staging_url', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Deployment Platform</label>
                  <select 
                    value={meetingNotes.deployment_platform} 
                    onChange={(e) => updateMeetingNotes('deployment_platform', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md"
                  >
                    <option value="Railway">Railway</option>
                    <option value="Vercel">Vercel</option>
                    <option value="Netlify">Netlify</option>
                    <option value="Squarespace">Squarespace</option>
                    <option value="WordPress">WordPress</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Generate Button */}
          <button 
            onClick={generateBrief}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isGenerating ? 'Generating Brief...' : 'Generate Upwork Brief'}
          </button>
        </div>
      </Card>

      {/* Generated Brief */}
      {generatedBrief && (
        <Card className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Generated Project Brief</h3>
            <div className="flex gap-2">
              <button
                onClick={copyToClipboard}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                Copy
              </button>
              <button
                onClick={downloadBrief}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
              >
                Download
              </button>
            </div>
          </div>
          <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg max-h-96 overflow-y-auto border">
            {generatedBrief}
          </pre>
        </Card>
      )}
    </div>
  );
} 