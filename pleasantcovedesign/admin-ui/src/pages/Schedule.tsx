import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Calendar, dateFnsLocalizer, Event, View } from 'react-big-calendar';
import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import { enUS } from 'date-fns/locale';
import { useSearchParams } from 'react-router-dom';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import ProjectAwareClientModal from '../components/ProjectAwareClientModal';
import api from '../api';

// Define basic types to avoid import errors
interface Company {
  id: number;
  name: string;
  email: string;
}

interface Project {
  id: number;
  title: string;
  companyId: number;
}

// Setup the localizer for React Big Calendar
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

// Create the drag and drop calendar with error boundary protection
const DragAndDropCalendar = withDragAndDrop(Calendar);

interface Appointment {
  id?: number;
  companyId?: number;
  projectId?: number;
  businessId?: number;
  datetime: string;
  status: string;
  notes: string;
  isAutoScheduled?: boolean;
  squarespaceId?: string;
  client_name?: string;
  phone?: string;
  email?: string;
  businessType?: string;
  clientStage?: string;
  clientScore?: number;
  clientPriority?: string;
  companyName?: string;
  projectTitle?: string;
  projectType?: string;
  meetingType?: 'zoom' | 'facetime' | 'phone' | 'in-person';
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string;
  meetingInstructions?: string;
}

interface PendingAppointment {
  id: string;
  client_id: number;
  client_name: string;
  phone: string;
  email: string;
  notes: string;
  businessType: string;
  stage: string;
  score: number;
  priority: string;
  status: 'pending';
}

interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource?: {
    appointmentId: number;
    companyId?: number;
    projectId?: number;
    businessId?: number;
    status?: string;
    notes: string;
    clientName: string;
    phone: string;
    email: string;
    businessType: string;
    clientStage: string;
    clientScore: number;
    clientPriority: string;
    isAutoScheduled?: boolean;
    squarespaceId?: string;
    companyName?: string;
    projectTitle?: string;
    projectType?: string;
    meetingType?: 'zoom' | 'facetime' | 'phone' | 'in-person';
    meetingLink?: string;
    meetingId?: string;
    meetingPassword?: string;
    meetingInstructions?: string;
  };
}

interface AppointmentModalData {
  id?: number;
  title: string;
  start: string;
  end: string;
  notes: string;
  clientName: string;
  phone: string;
  email: string;
  client_id?: number;
  isEdit: boolean;
  meetingType?: 'zoom' | 'facetime' | 'phone' | 'in-person';
  meetingLink?: string;
  meetingId?: string;
  meetingPassword?: string;
  meetingInstructions?: string;
}

// Error Boundary Component
class DragDropErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    console.warn('🛡️ DragDrop Error Boundary caught:', error);
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('🛡️ DragDrop Error Boundary details:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Reset error state after a delay
      setTimeout(() => {
        this.setState({ hasError: false });
      }, 1000);
      
      return (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800">⚠️ Drag operation interrupted. Refreshing...</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function Schedule() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showProjectAwareModal, setShowProjectAwareModal] = useState(false);
  const [pendingSlotData, setPendingSlotData] = useState<{start: string; end: string} | null>(null);
  const [modalData, setModalData] = useState<AppointmentModalData>({
    title: '',
    start: '',
    end: '',
    notes: '',
    clientName: '',
    phone: '',
    email: '',
    isEdit: false
  });
  
  const [draggedAppointment, setDraggedAppointment] = useState<PendingAppointment | null>(null);
  const [currentView, setCurrentView] = useState<View>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isDragging, setIsDragging] = useState(false);
  const [highlightedClientId, setHighlightedClientId] = useState<string | null>(null);
  
  // URL parameters handling for client pre-selection
  const [searchParams] = useSearchParams();
  const clientIdFromUrl = searchParams.get('client');
  
  // Refs for DOM manipulation safety
  const calendarRef = useRef<HTMLDivElement>(null);
  const pendingContainerRef = useRef<HTMLDivElement>(null);
  const dragTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightedClientRef = useRef<HTMLDivElement>(null);

  // Handle URL parameter for client highlighting
  useEffect(() => {
    if (clientIdFromUrl && pendingAppointments.length > 0) {
      const targetClient = pendingAppointments.find(
        apt => apt.client_id.toString() === clientIdFromUrl
      );
      
      if (targetClient) {
        setHighlightedClientId(targetClient.id);
        
        // Scroll to highlighted client after a brief delay
        setTimeout(() => {
          if (highlightedClientRef.current) {
            highlightedClientRef.current.scrollIntoView({
              behavior: 'smooth',
              block: 'center'
            });
          }
        }, 500);
        
        // Remove highlight after 5 seconds
        setTimeout(() => {
          setHighlightedClientId(null);
        }, 5000);
      }
    }
  }, [clientIdFromUrl, pendingAppointments]);

  // Valid time slots
  const validTimeSlots = [
    { time: '08:30:00', label: '8:30 AM' },
    { time: '09:00:00', label: '9:00 AM' }
  ];

  // Fetch appointments with error handling
  const fetchAppointments = useCallback(async () => {
    try {
      const response = await api.get('/appointments');
      if (response.status !== 200) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      // Handle both wrapped response format {success: true, appointments: [...]} and direct array
      const appointments = response.data.appointments || response.data;
      
      const mapped: CalendarEvent[] = (await Promise.all(
        appointments.map(async (apt: any) => {
          // Handle different client name formats
          let companyName = apt.client_name || `${apt.firstName || ''} ${apt.lastName || ''}`.trim() || 'Unknown Company';
          let projectTitle = '';
          let projectType = '';

          if (apt.projectId) {
            try {
              const projectResponse = await api.get(`/projects/${apt.projectId}`);
              if (projectResponse.status === 200) {
                const projectData = projectResponse.data;
                projectTitle = projectData.title || '';
                projectType = projectData.type || '';
                companyName = projectData.company?.name || companyName;
              }
            } catch (error) {
              console.warn('Failed to fetch project details for appointment:', apt.id);
            }
          }

          const title = projectTitle 
            ? `${projectTitle} – ${companyName}`
            : apt.client_name || apt.notes || 'Appointment';

          // Handle both datetime field and separate appointmentDate/appointmentTime fields
          let appointmentDateTime;
          if (apt.datetime) {
            appointmentDateTime = new Date(apt.datetime);
          } else if (apt.appointmentDate && apt.appointmentTime) {
            // Combine appointmentDate and appointmentTime into a proper datetime
            const dateStr = apt.appointmentDate; // "2025-07-17"
            const timeStr = apt.appointmentTime; // "8:30 AM"
            appointmentDateTime = new Date(`${dateStr} ${timeStr}`);
          } else {
            console.warn('Appointment missing datetime information:', apt);
            return null; // Skip this appointment
          }

          return {
            id: apt.id.toString(),
            title,
            start: appointmentDateTime,
            end: new Date(appointmentDateTime.getTime() + 25 * 60000),
            resource: {
              appointmentId: apt.id,
              companyId: apt.companyId,
              projectId: apt.projectId,
              businessId: apt.businessId,
              status: apt.status,
              notes: apt.notes,
              clientName: companyName,
              phone: apt.phone || 'No phone',
              email: apt.email || '',
              businessType: apt.businessType || 'unknown',
              clientStage: apt.clientStage || 'unknown',
              clientScore: apt.clientScore || 0,
              clientPriority: apt.clientPriority || 'medium',
              isAutoScheduled: apt.isAutoScheduled,
              squarespaceId: apt.squarespaceId,
              companyName,
              projectTitle,
              projectType,
              meetingType: apt.meetingType,
              meetingLink: apt.meetingLink,
              meetingId: apt.meetingId,
              meetingPassword: apt.meetingPassword,
              meetingInstructions: apt.meetingInstructions
            }
          };
        })
      )).filter(event => event !== null) as CalendarEvent[];
      
      setEvents(mapped);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    }
  }, []);

  // Fetch pending appointments with error handling
  const fetchPendingAppointments = useCallback(async () => {
    try {
      const response = await api.get('/appointments/pending');
      if (response.status !== 200) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      const data = response.data;
      setPendingAppointments(data);
    } catch (err) {
      console.error("Failed to fetch pending appointments:", err);
      setPendingAppointments([]);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchAppointments(),
        fetchPendingAppointments()
      ]);
      setLoading(false);
    };
    
    loadData();
  }, [fetchAppointments, fetchPendingAppointments]);

  // Cleanup effects
  useEffect(() => {
    return () => {
      setDraggedAppointment(null);
      setIsDragging(false);
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    };
  }, []);

  // Time slot utilities
  const isValidTimeSlot = useCallback((dateTime: Date) => {
    const time = dateTime.toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    return validTimeSlots.some(slot => slot.time === time);
  }, []);

  const snapToValidSlot = useCallback((dateTime: Date) => {
    const date = new Date(dateTime);
    const hour = date.getHours();
    const minute = date.getMinutes();
    
    if (hour < 9 || (hour === 8 && minute < 45)) {
      date.setHours(8, 30, 0, 0);
    } else {
      date.setHours(9, 0, 0, 0);
    }
    
    return date;
  }, []);

  const isSlotBooked = useCallback((dateTime: Date) => {
    const targetTime = snapToValidSlot(dateTime);
    return events.some((event) => {
      return event.start.getTime() === targetTime.getTime();
    });
  }, [events, snapToValidSlot]);

  // Handle slot selection for new appointments
  const handleSelectSlot = useCallback(({ start, end }: { start: Date; end: Date }) => {
    const snappedStart = snapToValidSlot(start);
    
    if (isSlotBooked(snappedStart)) {
      alert('This time slot is already booked. Please choose another time.');
      return;
    }
    
    const snappedEnd = new Date(snappedStart.getTime() + 30 * 60000);
    
    setPendingSlotData({
      start: snappedStart.toISOString(),
      end: snappedEnd.toISOString()
    });
    setShowProjectAwareModal(true);
  }, [snapToValidSlot, isSlotBooked]);

  // Handle project selection from modal
  const handleProjectSelect = useCallback(async (company: Company, project: Project) => {
    if (!pendingSlotData) return;

    try {
      const appointmentData = {
        companyId: company.id,
        projectId: project.id,
        datetime: pendingSlotData.start,
        status: 'scheduled',
        notes: `${project.title} consultation with ${company.name}`,
        isAutoScheduled: false
      };

      const response = await api.post('/appointments', appointmentData);

      if (response.status !== 200) {
        const errorText = response.data;
        throw new Error(`Failed to create appointment: ${response.status} ${errorText}`);
      }

      await Promise.all([fetchAppointments(), fetchPendingAppointments()]);
      alert(`Appointment scheduled successfully for ${project.title} – ${company.name}!`);
    } catch (error) {
      console.error('❌ Failed to create appointment:', error);
      alert(`Failed to create appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPendingSlotData(null);
      setShowProjectAwareModal(false);
    }
  }, [pendingSlotData, fetchAppointments, fetchPendingAppointments]);

  // Format phone number for display
  const formatPhoneNumber = (phone: string) => {
    if (!phone) return phone
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
    }
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`
    }
    return phone // Return original if format doesn't match
  }

  // Parse customer data from appointment notes
  const parseCustomerDataFromNotes = (notes: string) => {
    if (!notes) return {}
    
    const nameMatch = notes.match(/Name:\s*([^\n\r]+)/)
    const emailMatch = notes.match(/Email:\s*([^\n\r]+)/)
    const phoneMatch = notes.match(/Phone:\s*([^\n\r]+)/)
    const businessMatch = notes.match(/Business:\s*([^\n\r]+)/)
    
    const rawPhone = phoneMatch?.[1]?.trim() || ''
    
    return {
      clientName: nameMatch?.[1]?.trim() || '',
      email: emailMatch?.[1]?.trim() || '',
      phone: formatPhoneNumber(rawPhone),
      businessName: businessMatch?.[1]?.trim() || ''
    }
  }

  // Handle clicking on existing event
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    const notes = event.resource?.notes || ''
    const parsedCustomerData = parseCustomerDataFromNotes(notes)
    
    setModalData({
      id: event.resource?.appointmentId,
      title: event.title,
      start: event.start.toISOString(),
      end: event.end.toISOString(),
      notes: notes,
      // Use parsed customer data with fallbacks
      clientName: parsedCustomerData.clientName || event.resource?.clientName || 'Unknown Client',
      phone: parsedCustomerData.phone || event.resource?.phone || '',
      email: parsedCustomerData.email || event.resource?.email || '',
      client_id: event.resource?.businessId,
      isEdit: true,
      meetingType: event.resource?.meetingType,
      meetingLink: event.resource?.meetingLink,
      meetingId: event.resource?.meetingId,
      meetingPassword: event.resource?.meetingPassword,
      meetingInstructions: event.resource?.meetingInstructions
    });
    setShowModal(true);
  }, []);

  // Enhanced drag handlers with error protection
  const handleDragStart = useCallback((apt: PendingAppointment, e: React.DragEvent) => {
    try {
      setIsDragging(true);
      setDraggedAppointment(apt);
      
      e.dataTransfer.setData('text/plain', JSON.stringify(apt));
      e.dataTransfer.setData('application/json', JSON.stringify(apt));
      e.dataTransfer.effectAllowed = 'move';
      
      // Safe style updates
      const target = e.currentTarget as HTMLElement;
      if (target) {
        target.style.opacity = '0.5';
        target.style.transform = 'scale(0.98)';
      }
      
      console.log('🚀 Drag started:', apt.client_name);
    } catch (error) {
      console.error('Error in drag start:', error);
      setIsDragging(false);
      setDraggedAppointment(null);
    }
  }, []);

  const handleDragEnd = useCallback((apt: PendingAppointment, e: React.DragEvent) => {
    try {
      // Safe style restoration
      const target = e.currentTarget as HTMLElement;
      if (target) {
        target.style.opacity = '1';
        target.style.transform = 'scale(1)';
      }
      
      // Clear drag state after a delay to ensure drop handler completes
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
      
      dragTimeoutRef.current = setTimeout(() => {
        setIsDragging(false);
        if (draggedAppointment?.id === apt.id) {
          setDraggedAppointment(null);
        }
      }, 1000);
      
      console.log('🏁 Drag ended:', apt.client_name);
    } catch (error) {
      console.error('Error in drag end:', error);
      setIsDragging(false);
      setDraggedAppointment(null);
    }
  }, [draggedAppointment]);

  // Handle external drop with robust error handling
  const handleDropFromOutside = useCallback(async (args: any) => {
    if (!draggedAppointment || !isDragging) {
      console.warn('❌ No valid drag data for drop');
      return;
    }

    try {
      const { start } = args;
      if (!start || !draggedAppointment.client_id) {
        throw new Error('Invalid drop data');
      }

      const dropDate = new Date(start);
      const snappedStart = snapToValidSlot(dropDate);
      
      if (isSlotBooked(snappedStart)) {
        alert('This time slot is already booked. Please choose another time.');
        return;
      }

      const newAppointmentData = {
        client_id: draggedAppointment.client_id,
        datetime: snappedStart.toISOString(),
        notes: draggedAppointment.notes || `Consultation with ${draggedAppointment.client_name}`,
        status: 'scheduled',
        isAutoScheduled: false
      };

      const response = await api.post('/appointments', newAppointmentData);

      if (response.status !== 200) {
        const errorText = response.data;
        throw new Error(`Failed to create appointment: ${response.status} ${errorText}`);
      }

      await Promise.all([fetchAppointments(), fetchPendingAppointments()]);
      alert(`Appointment scheduled successfully for ${draggedAppointment.client_name}!`);
      
    } catch (error) {
      console.error('❌ Failed to schedule appointment:', error);
      alert(`Failed to schedule appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsDragging(false);
      setDraggedAppointment(null);
      if (dragTimeoutRef.current) {
        clearTimeout(dragTimeoutRef.current);
      }
    }
  }, [draggedAppointment, isDragging, snapToValidSlot, isSlotBooked, fetchAppointments, fetchPendingAppointments]);

  // Handle moving existing events
  const handleEventDrop = useCallback(async (args: any) => {
    try {
      const { event, start } = args;
      const snappedStart = snapToValidSlot(new Date(start));
      
      const isNewSlotBooked = events.some(e => 
        e.id !== event.id && e.start.getTime() === snappedStart.getTime()
      );
      
      if (isNewSlotBooked) {
        alert('This time slot is already booked. Please choose another time.');
        await fetchAppointments();
        return;
      }

      const calendarEvent = events.find(e => e.id === event.id);
      if (!calendarEvent?.resource?.appointmentId) {
        console.error('Could not find appointment ID for event:', event);
        return;
      }

      const appointmentData = {
        datetime: snappedStart.toISOString(),
        status: calendarEvent.resource.status || 'scheduled',
        notes: calendarEvent.resource.notes || ''
      };

      const response = await api.put(`/appointments/${calendarEvent.resource.appointmentId}`, appointmentData);

      if (response.status !== 200) {
        const errorText = response.data;
        throw new Error(`Failed to update appointment: ${response.status} ${errorText}`);
      }

      await fetchAppointments();
    } catch (error) {
      console.error('❌ Failed to move appointment:', error);
      alert(`Failed to move appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      await fetchAppointments();
    }
  }, [events, snapToValidSlot, fetchAppointments]);

  // Prevent event resizing
  const handleEventResize = useCallback(async () => {
    alert('Appointments have a fixed 25-minute duration and cannot be resized.');
    await fetchAppointments();
  }, [fetchAppointments]);

  // Priority color utilities
  const getPriorityColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'border-red-300 bg-red-50';
      case 'medium': return 'border-yellow-300 bg-yellow-50';
      case 'low': return 'border-green-300 bg-green-50';
      default: return 'border-gray-300 bg-gray-50';
    }
  }, []);

  const getPriorityTextColor = useCallback((priority: string) => {
    switch (priority) {
      case 'high': return 'text-red-800';
      case 'medium': return 'text-yellow-800';
      case 'low': return 'text-green-800';
      default: return 'text-gray-800';
    }
  }, []);

  // Save appointment
  const handleSaveAppointment = useCallback(async () => {
    if (!modalData.clientName.trim()) {
      alert('Please enter a client name');
      return;
    }

    try {
      const appointmentData = {
        datetime: modalData.start,
        notes: modalData.notes || modalData.clientName,
        status: 'scheduled',
        isAutoScheduled: false
      };

      if (!modalData.isEdit || typeof modalData.id !== 'number') {
        alert('Please use the project-aware modal to create new appointments');
        return;
      }

      const response = await api.put(`/appointments/${modalData.id}`, appointmentData);

      if (response.status !== 200) {
        throw new Error('Failed to save appointment');
      }

      await Promise.all([fetchAppointments(), fetchPendingAppointments()]);
      setShowModal(false);
      setModalData({
        title: '',
        start: '',
        end: '',
        notes: '',
        clientName: '',
        phone: '',
        email: '',
        isEdit: false
      });
    } catch (error) {
      console.error('Failed to save appointment:', error);
      alert('Failed to save appointment. Please try again.');
    }
  }, [modalData, fetchAppointments, fetchPendingAppointments]);

  // Delete appointment
  const handleDeleteAppointment = useCallback(async () => {
    if (!modalData.id || typeof modalData.id !== 'number') return;

    const eventToMove = events.find((event) => 
      event.resource?.appointmentId === modalData.id || event.id === modalData.id!.toString()
    );

    if (!eventToMove) {
      alert('Error: Could not find the appointment on the calendar.');
      return;
    }

    const clientName = eventToMove.resource?.clientName || eventToMove.title || 'Unknown Client';
    
    if (!confirm(`Delete ${clientName}'s appointment?`)) return;

    try {
      const response = await api.delete(`/appointments/${modalData.id}`);

      if (response.status !== 200) {
        const errorText = response.data;
        throw new Error(`Failed to delete appointment: ${errorText}`);
      }

      await Promise.all([fetchAppointments(), fetchPendingAppointments()]);
      setShowModal(false);
      alert(`${clientName}'s appointment has been deleted.`);
    } catch (error) {
      console.error('❌ Failed to delete appointment:', error);
      alert(`Failed to delete appointment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [modalData.id, events, fetchAppointments, fetchPendingAppointments]);

  // Event style getter
  const eventStyleGetter = useCallback((event: any) => {
    const backgroundColor = event.resource?.isAutoScheduled ? '#3b82f6' : '#10b981';
    const borderColor = event.resource?.status === 'scheduled' ? '#059669' : '#dc2626';
    
    return {
      style: {
        backgroundColor,
        borderColor,
        color: 'white'
      }
    };
  }, []);

  // Slot prop getter
  const slotPropGetter = useCallback((date: Date) => {
    const hour = date.getHours();
    const minute = date.getMinutes();
    const isValidSlot = (hour === 8 && minute === 30) || (hour === 9 && minute === 0);
    
    if (!isValidSlot) {
      return {
        style: {
          backgroundColor: '#f3f4f6',
          pointerEvents: 'none' as const,
          opacity: 0.5
        }
      };
    }
    
    return {};
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="flex h-screen">
        <div className="w-64 p-4 border-r bg-gray-50">
          <div className="text-gray-600">Loading...</div>
        </div>
        <div className="flex-1 p-4">
          <h1 className="text-xl font-bold text-blue-600 mb-4">📅 Schedule & Appointments</h1>
          <div className="bg-white p-8 rounded shadow text-center">
            <div className="text-gray-600">Loading appointments...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex h-screen">
        <div className="w-64 p-4 border-r bg-gray-50">
          <div className="text-red-600">Error</div>
        </div>
        <div className="flex-1 p-4">
          <h1 className="text-xl font-bold text-red-600 mb-4">🚨 Schedule Error</h1>
          <div className="bg-red-50 p-4 rounded border border-red-200">
            <p className="text-red-800">Error loading appointments: {error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Pending Appointments Sidebar */}
      <div className="w-64 p-4 border-r bg-white">
        <h3 className="font-bold mb-4 text-gray-800">📋 Pending Appointments ({pendingAppointments.length})</h3>
        
        <div ref={pendingContainerRef} className="space-y-2">
          {pendingAppointments.length === 0 ? (
            <div className="text-gray-500 text-sm text-center py-4">
              No pending appointments.<br />All leads have been scheduled!
            </div>
          ) : (
            pendingAppointments.map((apt) => (
              <div
                key={`pending-${apt.id}-${apt.client_id}`}
                ref={highlightedClientId === apt.id ? highlightedClientRef : undefined}
                className={`pending-appointment border p-3 rounded-lg cursor-grab hover:shadow-md transition-all select-none ${getPriorityColor(apt.priority)} ${
                  highlightedClientId === apt.id 
                    ? 'ring-4 ring-blue-500 ring-opacity-50 bg-blue-100 border-blue-500' 
                    : ''
                }`}
                title="Drag to schedule this appointment"
                draggable={!isDragging}
                style={{ 
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  MozUserSelect: 'none',
                  msUserSelect: 'none'
                }}
                onDragStart={(e) => handleDragStart(apt, e)}
                onDragEnd={(e) => handleDragEnd(apt, e)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`font-medium text-sm pointer-events-none ${getPriorityTextColor(apt.priority)} ${
                    highlightedClientId === apt.id ? 'text-blue-900' : ''
                  }`}>
                    {apt.client_name}
                    {highlightedClientId === apt.id && (
                      <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded-full">
                        Selected from Lead
                      </span>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      apt.priority === 'high' ? 'bg-red-100 text-red-700' : 
                      apt.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {apt.priority.toUpperCase()}
                    </span>
                    <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-700">
                      Score: {apt.score}
                    </span>
                  </div>
                </div>
                
                <div className="text-xs text-gray-600 pointer-events-none space-y-1">
                  {apt.phone && <div>📞 {apt.phone}</div>}
                  {apt.email && <div>📧 {apt.email}</div>}
                  {apt.businessType && <div>🏢 {apt.businessType}</div>}
                  <div>📊 Stage: {apt.stage}</div>
                </div>
                
                <div className="text-xs text-gray-500 mt-2 pointer-events-none italic">
                  {apt.notes}
                </div>
                
                <div className="text-xs text-blue-600 mt-2 pointer-events-none font-medium">
                  👆 Drag to calendar to schedule
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="mt-6 p-3 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-sm text-blue-800 mb-2">💡 Instructions:</h4>
          <ul className="text-xs text-blue-700 space-y-1">
            <li>• Click empty time slots to search for clients</li>
            <li>• Drag pending clients to calendar slots</li>
            <li>• Only 8:30 AM & 9:00 AM slots available</li>
            <li>• Click appointments to view/edit details</li>
          </ul>
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 p-4">
        <h1 className="text-xl font-bold text-blue-600 mb-4">
          📅 Schedule & Appointments ({events.length} scheduled)
        </h1>

        <DragDropErrorBoundary>
          <div className="bg-white p-4 rounded shadow">
            <div ref={calendarRef} style={{ height: 600 }}>
              <DragAndDropCalendar
                localizer={localizer}
                events={events}
                startAccessor={(event: any) => event.start}
                endAccessor={(event: any) => event.end}
                style={{ height: '100%' }}
                onSelectSlot={handleSelectSlot}
                onSelectEvent={(event: any) => handleSelectEvent(event as CalendarEvent)}
                onEventDrop={handleEventDrop}
                onEventResize={handleEventResize}
                onDropFromOutside={handleDropFromOutside}
                selectable
                eventPropGetter={eventStyleGetter}
                slotPropGetter={slotPropGetter}
                view={currentView}
                onView={setCurrentView}
                date={currentDate}
                onNavigate={setCurrentDate}
                views={['week', 'day']}
                min={new Date(0, 0, 0, 8, 30, 0)}
                max={new Date(0, 0, 0, 9, 30, 0)}
                step={30}
                timeslots={1}
                popup
                dragFromOutsideItem={() => draggedAppointment || {}}
              />
            </div>
          </div>
        </DragDropErrorBoundary>
      </div>

      {/* Enhanced Appointment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold mb-4">
              {modalData.isEdit ? '✏️ Edit Appointment' : '📅 New Appointment'}
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Left Column - Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-800 border-b pb-2">Contact Information</h3>
                
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    👤 Client Name
                  </label>
                  <input
                    type="text"
                    className={`w-full border rounded px-3 py-2 ${modalData.isEdit ? 'bg-gray-100' : ''}`}
                    value={modalData.clientName}
                    onChange={(e) => setModalData({...modalData, clientName: e.target.value})}
                    placeholder="Enter client name"
                    readOnly={modalData.isEdit}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    📞 Phone Number
                  </label>
                  <input
                    type="tel"
                    className="w-full border rounded px-3 py-2"
                    value={modalData.phone}
                    onChange={(e) => setModalData({...modalData, phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>
                 
                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    ✉️ Email
                  </label>
                  <input
                    type="email"
                    className="w-full border rounded px-3 py-2"
                    value={modalData.email}
                    onChange={(e) => setModalData({...modalData, email: e.target.value})}
                    placeholder="Enter email"
                  />
                </div>

                {/* Business Name Field */}
                {(() => {
                  const notes = modalData.notes || ''
                  const businessMatch = notes.match(/Business:\s*([^\n\r]+)/)
                  const businessName = businessMatch?.[1]?.trim()
                  
                  if (businessName) {
                    return (
                      <div>
                        <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                          🏢 Business Name
                        </label>
                        <input
                          type="text"
                          className="w-full border rounded px-3 py-2 bg-blue-50 border-blue-200 font-medium"
                          value={businessName}
                          readOnly
                          title="Business information from appointment booking"
                        />
                      </div>
                    )
                  }
                  return null
                })()}
                
                <div>
                  <label className="block text-sm font-medium mb-1">📅 Date & Time</label>
                  <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                    <div className="font-medium">
                      {new Date(modalData.start).toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div className="text-blue-600 font-medium">
                      {new Date(modalData.start).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })} - {new Date(modalData.end).toLocaleTimeString('en-US', { 
                        hour: 'numeric', 
                        minute: '2-digit',
                        hour12: true 
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Appointment Details & Notes */}
              <div className="space-y-4">
              
              {/* Appointment Details Section */}
              {modalData.notes && modalData.notes.includes('Services Requested:') && (
                <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-gray-50 border-blue-200">
                  <h3 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                    📋 Appointment Details
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {(() => {
                      const notes = modalData.notes || ''
                      const servicesMatch = notes.match(/Services Requested:\s*([^\n\r]+)/)
                      const budgetMatch = notes.match(/Budget:\s*([^\n\r]+)/)
                      const timelineMatch = notes.match(/Timeline:\s*([^\n\r]+)/)
                      const businessMatch = notes.match(/Business:\s*([^\n\r]+)/)
                      const sourceMatch = notes.match(/Booked via:\s*([^\n\r]+)/)
                      const projectDescMatch = notes.match(/Project Description:\s*\n([\s\S]*?)(?=\n\n|Contact Information:|Additional Notes:|$)/)
                      
                      // Format services for better display
                      const formatServices = (services: string) => {
                        return services.split(',').map(service => {
                          const trimmed = service.trim()
                          if (trimmed.toLowerCase() === 'seo') return 'SEO'
                          if (trimmed.toLowerCase() === 'other') return 'Other Services'
                          return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
                        }).join(', ')
                      }
                      
                      // Format timeline for better display
                      const formatTimeline = (timeline: string) => {
                        const lower = timeline.toLowerCase()
                        if (lower === 'asap') return 'ASAP'
                        if (lower.includes('month')) return timeline.charAt(0).toUpperCase() + timeline.slice(1)
                        return timeline
                      }
                      
                      return (
                        <>
                          {servicesMatch && (
                            <div>
                              <span className="font-medium text-gray-600">Services:</span>
                              <p className="text-gray-800 font-medium">{formatServices(servicesMatch[1].trim())}</p>
                            </div>
                          )}
                          {budgetMatch && (
                            <div>
                              <span className="font-medium text-gray-600">Budget:</span>
                              <p className="text-gray-800 font-medium text-green-700">{budgetMatch[1].trim()}</p>
                            </div>
                          )}
                          {timelineMatch && (
                            <div>
                              <span className="font-medium text-gray-600">Timeline:</span>
                              <p className="text-gray-800 font-medium">{formatTimeline(timelineMatch[1].trim())}</p>
                            </div>
                          )}
                          {businessMatch && (
                            <div>
                              <span className="font-medium text-gray-600">Business:</span>
                              <p className="text-gray-800 font-medium">{businessMatch[1].trim()}</p>
                            </div>
                          )}
                          {sourceMatch && (
                            <div>
                              <span className="font-medium text-gray-600">Source:</span>
                              <span className="ml-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {sourceMatch[1].trim().replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </div>
                          )}
                          {projectDescMatch && projectDescMatch[1].trim() && (
                            <div className="md:col-span-2">
                              <span className="font-medium text-gray-600">Project Description:</span>
                              <p className="text-gray-800 mt-1 whitespace-pre-wrap bg-gray-50 p-2 rounded border">{projectDescMatch[1].trim()}</p>
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )}

                <div>
                  <label className="block text-sm font-medium mb-1 flex items-center gap-1">
                    📝 Notes & Additional Information
                  </label>
                  <textarea
                    className="w-full border rounded px-3 py-2 resize-y"
                    rows={12}
                    value={modalData.notes}
                    onChange={(e) => setModalData({...modalData, notes: e.target.value})}
                    placeholder="Add any notes or details about the appointment..."
                  />
                  <div className="text-xs text-gray-500 mt-1">
                    Original appointment data is preserved above. Add additional notes as needed.
                  </div>
                </div>
              </div>
            </div>

            {/* Meeting Details Section - Full Width */}
            {modalData.meetingType && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Meeting Details</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Type:</span>
                      <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {modalData.meetingType === 'zoom' ? '📹 Zoom' : 
                         modalData.meetingType === 'phone' ? '📞 Phone' : 
                         modalData.meetingType === 'facetime' ? '📱 FaceTime' : 
                         '🏢 In-Person'}
                      </span>
                    </div>
                    
                    {modalData.meetingLink && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Meeting Link:</label>
                        <a 
                          href={modalData.meetingLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline text-sm break-all"
                        >
                          {modalData.meetingLink}
                        </a>
                      </div>
                    )}
                    
                    {modalData.meetingPassword && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Password:</label>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">{modalData.meetingPassword}</code>
                      </div>
                    )}
                    
                    {modalData.meetingInstructions && (
                      <div>
                        <label className="block text-sm font-medium mb-1">Instructions:</label>
                        <pre className="text-sm bg-gray-50 p-2 rounded whitespace-pre-wrap">{modalData.meetingInstructions}</pre>
                      </div>
                    )}
                  </div>
                </div>
              )}
            
            <div className="flex justify-between mt-6">
              <div>
                {modalData.isEdit && (
                  <button
                    onClick={handleDeleteAppointment}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded mr-2"
                  >
                    🗑️ Delete
                  </button>
                )}
              </div>
              <div className="space-x-2">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveAppointment}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  {modalData.isEdit ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project-Aware Client Modal */}
      {showProjectAwareModal && (
        <ProjectAwareClientModal
          isOpen={showProjectAwareModal}
          onClose={() => setShowProjectAwareModal(false)}
          onProjectSelect={handleProjectSelect}
          datetime={pendingSlotData?.start || ''}
        />
      )}
    </div>
  );
}