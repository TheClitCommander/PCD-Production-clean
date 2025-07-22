import React from 'react';
import { Video, Phone, Smartphone, MapPin, Calendar, Clock, Copy, ExternalLink } from 'lucide-react';

interface MeetingDetailsProps {
  appointment: {
    datetime: string;
    duration?: number;
    meetingType?: 'zoom' | 'facetime' | 'phone' | 'in-person';
    meetingLink?: string;
    meetingId?: string;
    meetingPassword?: string;
    meetingInstructions?: string;
    dialInNumber?: string;
  };
  isClientView?: boolean;
}

export default function MeetingDetails({ appointment, isClientView = false }: MeetingDetailsProps) {
  const meetingDate = new Date(appointment.datetime);
  const endTime = new Date(meetingDate.getTime() + (appointment.duration || 30) * 60000);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    alert(`${label} copied to clipboard!`);
  };

  const getMeetingIcon = () => {
    switch (appointment.meetingType) {
      case 'zoom':
        return <Video className="h-5 w-5 text-blue-600" />;
      case 'phone':
        return <Phone className="h-5 w-5 text-green-600" />;
      case 'facetime':
        return <Smartphone className="h-5 w-5 text-purple-600" />;
      case 'in-person':
        return <MapPin className="h-5 w-5 text-orange-600" />;
      default:
        return <Calendar className="h-5 w-5 text-gray-600" />;
    }
  };

  const getMeetingTypeLabel = () => {
    switch (appointment.meetingType) {
      case 'zoom':
        return 'Zoom Video Call';
      case 'phone':
        return 'Phone Call';
      case 'facetime':
        return 'FaceTime';
      case 'in-person':
        return 'In-Person Meeting';
      default:
        return 'Meeting';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        {getMeetingIcon()}
        <div>
          <h3 className="text-lg font-semibold">{getMeetingTypeLabel()}</h3>
          <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {meetingDate.toLocaleDateString('en-US', { 
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              {meetingDate.toLocaleTimeString('en-US', { 
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })} - {endTime.toLocaleTimeString('en-US', { 
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>
      </div>

      {/* Zoom Meeting Details */}
      {appointment.meetingType === 'zoom' && appointment.meetingLink && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-3">Join Your Meeting</h4>
            
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-blue-800">Meeting Link:</label>
                <div className="flex items-center gap-2 mt-1">
                  <a
                    href={appointment.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-blue-600 hover:text-blue-800 underline text-sm break-all"
                  >
                    {appointment.meetingLink}
                  </a>
                  {isClientView && (
                    <a
                      href={appointment.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Join Meeting
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>

              {appointment.meetingId && (
                <div>
                  <label className="text-sm font-medium text-blue-800">Meeting ID:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-white px-3 py-1 rounded border border-blue-200">
                      {appointment.meetingId}
                    </code>
                    <button
                      onClick={() => copyToClipboard(appointment.meetingId!, 'Meeting ID')}
                      className="text-blue-600 hover:text-blue-800"
                      title="Copy Meeting ID"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}

              {appointment.meetingPassword && (
                <div>
                  <label className="text-sm font-medium text-blue-800">Password:</label>
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-sm bg-white px-3 py-1 rounded border border-blue-200">
                      {appointment.meetingPassword}
                    </code>
                    <button
                      onClick={() => copyToClipboard(appointment.meetingPassword!, 'Password')}
                      className="text-blue-600 hover:text-blue-800"
                      title="Copy Password"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {appointment.meetingInstructions && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-2">Additional Instructions</h4>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans">
                {appointment.meetingInstructions}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Phone Meeting Details */}
      {appointment.meetingType === 'phone' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-medium text-green-900 mb-3">Phone Call Details</h4>
          <p className="text-sm text-green-800">
            We'll call you at the scheduled time on the phone number you provided.
          </p>
          {appointment.dialInNumber && (
            <div className="mt-3">
              <label className="text-sm font-medium text-green-800">Or you can call us at:</label>
              <div className="flex items-center gap-2 mt-1">
                <a
                  href={`tel:${appointment.dialInNumber}`}
                  className="text-green-600 hover:text-green-800 font-medium"
                >
                  {appointment.dialInNumber}
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FaceTime Meeting Details */}
      {appointment.meetingType === 'facetime' && (
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <h4 className="font-medium text-purple-900 mb-3">FaceTime Details</h4>
          <p className="text-sm text-purple-800">
            We'll FaceTime you at the scheduled time. Please ensure you're available on your Apple device.
          </p>
          <p className="text-sm text-purple-700 mt-2">
            <strong>Note:</strong> FaceTime requires an Apple device (iPhone, iPad, or Mac).
          </p>
        </div>
      )}

      {/* In-Person Meeting Details */}
      {appointment.meetingType === 'in-person' && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-medium text-orange-900 mb-3">In-Person Meeting</h4>
          {appointment.meetingInstructions ? (
            <div className="text-sm text-orange-800 whitespace-pre-wrap">
              {appointment.meetingInstructions}
            </div>
          ) : (
            <p className="text-sm text-orange-800">
              Location details will be provided separately.
            </p>
          )}
        </div>
      )}

      {/* General Tips */}
      {isClientView && (
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">Meeting Tips</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            {appointment.meetingType === 'zoom' && (
              <>
                <li>• Test your audio and video before the meeting</li>
                <li>• Join 5 minutes early to ensure everything works</li>
                <li>• Have a stable internet connection</li>
              </>
            )}
            {appointment.meetingType === 'phone' && (
              <>
                <li>• Find a quiet location for the call</li>
                <li>• Have any relevant documents ready</li>
                <li>• Ensure your phone is charged</li>
              </>
            )}
            {appointment.meetingType === 'facetime' && (
              <>
                <li>• Ensure your Apple device is updated</li>
                <li>• Test FaceTime with a friend beforehand</li>
                <li>• Have good lighting for video</li>
              </>
            )}
            <li>• Prepare any questions you'd like to discuss</li>
            <li>• Have a pen and paper ready for notes</li>
          </ul>
        </div>
      )}
    </div>
  );
} 