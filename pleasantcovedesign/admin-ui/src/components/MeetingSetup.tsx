import React, { useState } from 'react';
import { Video, Phone, Smartphone, MapPin, Loader2 } from 'lucide-react';
import api from '../api';

interface MeetingSetupProps {
  appointment: {
    id: number;
    datetime: string;
    client_name?: string;
    companyName?: string;
    meetingType?: string;
  };
  onMeetingCreated: () => void;
}

export default function MeetingSetup({ appointment, onMeetingCreated }: MeetingSetupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<'zoom' | 'phone' | 'facetime' | 'in-person'>('zoom');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [facetimeContact, setFacetimeContact] = useState('');
  const [location, setLocation] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    
    try {
      const updateData: any = {
        meetingType: selectedType
      };

      // Add type-specific data
      switch (selectedType) {
        case 'phone':
          updateData.dialInNumber = phoneNumber;
          updateData.meetingInstructions = `We'll call you at ${phoneNumber} at the scheduled time.`;
          break;
        case 'facetime':
          updateData.meetingInstructions = `We'll FaceTime you at ${facetimeContact} at the scheduled time. Please ensure you're available on your Apple device.`;
          break;
        case 'in-person':
          updateData.meetingInstructions = `Meeting location: ${location}`;
          break;
        case 'zoom':
          // Zoom meeting will be created automatically by the backend
          break;
      }

      await api.put(`/appointments/${appointment.id}`, updateData);
      
      onMeetingCreated();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to update meeting type:', error);
      alert('Failed to set up meeting. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="text-sm text-blue-600 hover:text-blue-700 font-medium"
      >
        Set up meeting
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h3 className="text-lg font-semibold mb-4">
          Set Up Meeting for {appointment.client_name || appointment.companyName}
        </h3>
        
        <div className="space-y-4">
          {/* Meeting Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Meeting Type</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedType('zoom')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedType === 'zoom' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Video className="h-5 w-5 mx-auto mb-1 text-blue-600" />
                <span className="text-sm">Zoom</span>
              </button>
              
              <button
                onClick={() => setSelectedType('phone')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedType === 'phone' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Phone className="h-5 w-5 mx-auto mb-1 text-green-600" />
                <span className="text-sm">Phone</span>
              </button>
              
              <button
                onClick={() => setSelectedType('facetime')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedType === 'facetime' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className="h-5 w-5 mx-auto mb-1 text-purple-600" />
                <span className="text-sm">FaceTime</span>
              </button>
              
              <button
                onClick={() => setSelectedType('in-person')}
                className={`p-3 rounded-lg border-2 transition-colors ${
                  selectedType === 'in-person' 
                    ? 'border-orange-500 bg-orange-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <MapPin className="h-5 w-5 mx-auto mb-1 text-orange-600" />
                <span className="text-sm">In-Person</span>
              </button>
            </div>
          </div>

          {/* Type-specific fields */}
          {selectedType === 'phone' && (
            <div>
              <label className="block text-sm font-medium mb-1">Your Phone Number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="(555) 123-4567"
              />
            </div>
          )}

          {selectedType === 'facetime' && (
            <div>
              <label className="block text-sm font-medium mb-1">FaceTime Contact</label>
              <input
                type="text"
                value={facetimeContact}
                onChange={(e) => setFacetimeContact(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Phone or Apple ID email"
              />
            </div>
          )}

          {selectedType === 'in-person' && (
            <div>
              <label className="block text-sm font-medium mb-1">Meeting Location</label>
              <textarea
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
                placeholder="Enter the address or location details"
              />
            </div>
          )}

          {selectedType === 'zoom' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                A Zoom meeting will be automatically created and the details will be sent to the client.
              </p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || (selectedType === 'phone' && !phoneNumber) || (selectedType === 'facetime' && !facetimeContact) || (selectedType === 'in-person' && !location)}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                Setting up...
              </>
            ) : (
              'Set Up Meeting'
            )}
          </button>
        </div>
      </div>
    </div>
  );
} 