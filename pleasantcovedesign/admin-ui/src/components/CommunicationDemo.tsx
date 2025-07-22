import React from 'react';
import { Phone, Mail, MessageCircle, Video, Smartphone, Calendar } from 'lucide-react';

export default function CommunicationDemo() {
  const demoCompany = {
    name: "Demo Business Inc.",
    email: "demo@business.com",
    phone: "(555) 123-4567",
    hasProject: true
  };

  const handlePhoneClick = () => {
    alert('Phone clicked! In production this would:\n\n1. Open phone dialer with: ' + demoCompany.phone + '\n2. On Apple devices, offer FaceTime option');
  };

  const handleEmailClick = () => {
    alert('Email clicked! In production this would:\n\n1. Open email client\n2. Pre-fill professional template\n3. Include subject and body');
  };

  const handleMessageClick = () => {
    alert('Message clicked! In production this would:\n\n1. Open project messaging inbox\n2. Show real-time chat\n3. Allow file sharing');
  };

  const handleMeetingType = (type: string) => {
    const messages: Record<string, string> = {
      zoom: 'Zoom selected! A meeting would be automatically created with join link and password.',
      phone: 'Phone selected! You would call the client at the scheduled time.',
      facetime: 'FaceTime selected! You would FaceTime the client using their Apple device.',
      'in-person': 'In-Person selected! Location details would be included in confirmation.'
    };
    alert(messages[type]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h2 className="text-2xl font-bold mb-6">Communication Features Demo</h2>

      {/* Lead Card with Communication Icons */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Lead Card Communication</h3>
        
        <div className="border rounded-lg p-4">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h4 className="font-semibold">{demoCompany.name}</h4>
              <p className="text-sm text-gray-600">{demoCompany.email}</p>
              <p className="text-sm text-gray-600">{demoCompany.phone}</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handlePhoneClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Call"
              >
                <Phone className="h-5 w-5 text-green-600" />
              </button>
              
              <button
                onClick={handleEmailClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Email"
              >
                <Mail className="h-5 w-5 text-blue-600" />
              </button>
              
              <button
                onClick={handleMessageClick}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Message"
              >
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </button>
            </div>
          </div>
          
          <p className="text-sm text-gray-500">
            Click the icons above to see what happens in production!
          </p>
        </div>
      </div>

      {/* Meeting Type Selection */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">Meeting Type Selection</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={() => handleMeetingType('zoom')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
          >
            <Video className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <p className="text-sm font-medium">Zoom</p>
          </button>
          
          <button
            onClick={() => handleMeetingType('phone')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-green-500 hover:bg-green-50 transition-all"
          >
            <Phone className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p className="text-sm font-medium">Phone</p>
          </button>
          
          <button
            onClick={() => handleMeetingType('facetime')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition-all"
          >
            <Smartphone className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <p className="text-sm font-medium">FaceTime</p>
          </button>
          
          <button
            onClick={() => handleMeetingType('in-person')}
            className="p-4 border-2 border-gray-200 rounded-lg hover:border-orange-500 hover:bg-orange-50 transition-all"
          >
            <Calendar className="h-8 w-8 mx-auto mb-2 text-orange-600" />
            <p className="text-sm font-medium">In-Person</p>
          </button>
        </div>
      </div>

      {/* Feature Summary */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">What's Integrated</h3>
        
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Phone className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium">Phone & FaceTime</p>
              <p className="text-sm text-gray-600">Direct calling with FaceTime support on Apple devices</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Email Integration</p>
              <p className="text-sm text-gray-600">Pre-filled templates with professional follow-up content</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MessageCircle className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Project Messaging</p>
              <p className="text-sm text-gray-600">Real-time chat with file sharing capabilities</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <Video className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium">Zoom Integration</p>
              <p className="text-sm text-gray-600">Automatic meeting creation with one-click join</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 