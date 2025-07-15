import { useState, useCallback, useMemo, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Calendar, momentLocalizer, Event, View } from "react-big-calendar";
import moment from "moment";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  Calendar as CalendarIcon, Clock, User, Phone, MapPin, 
  TrendingUp, Settings, ChevronRight, Loader2, AlertCircle, Globe, Link2,
  Ban, X, UserX, CheckCircle2
} from "lucide-react";
import type { Business, AvailabilityConfig, InsertAvailabilityConfig, BlockedDate, InsertBlockedDate } from "@shared/schema";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

interface CalendarEvent extends Event {
  id: number;
  businessId: number;
  business?: Business;
  businessName: string;
  isAutoScheduled: boolean;
  phone?: string;
  score?: number;
  appointmentStatus?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

export default function Scheduling() {
  const [view, setView] = useState<View>("week");
  const [date, setDate] = useState(new Date());
  const [selectedLead, setSelectedLead] = useState<Business | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAvailabilityModal, setShowAvailabilityModal] = useState(false);
  const [showBlockDateModal, setShowBlockDateModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [showQuickScheduleModal, setShowQuickScheduleModal] = useState(false);
  const [quickScheduleDate, setQuickScheduleDate] = useState<Date>(new Date());
  const [rescheduleForm, setRescheduleForm] = useState<{
    businessId: number;
    businessName: string;
    date: string;
    time: string;
  }>({
    businessId: 0,
    businessName: '',
    date: moment().format('YYYY-MM-DD'),
    time: '08:30'
  });
  const [blockDateForm, setBlockDateForm] = useState<{
    date: string;
    timeOption: 'whole' | 'specific';
    startTime: string;
    endTime: string;
    reason: string;
  }>({
    date: moment().format('YYYY-MM-DD'),
    timeOption: 'whole',
    startTime: '08:30',
    endTime: '09:30',
    reason: ''
  });
  const [draggedLead, setDraggedLead] = useState<Business | null>(null);
  const [draggedEvent, setDraggedEvent] = useState<CalendarEvent | null>(null);
  const [schedulingLead, setSchedulingLead] = useState<Business | null>(null);
  const draggedLeadRef = useRef<Business | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Fetch pending leads
  const { data: pendingLeads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["/api/leads/pending"],
    queryFn: api.getPendingLeads,
  });

  // Fetch all appointments (manual and auto-scheduled)
  const { data: appointments = [], isLoading: loadingAppointments } = useQuery({
    queryKey: ["/api/scheduling/appointments"],
    queryFn: api.getSchedulingAppointments,
  });

  // Fetch scheduled meetings (for backward compatibility)
  const { data: scheduledMeetings = [], isLoading: loadingSchedule } = useQuery({
    queryKey: ["/api/schedule"],
    queryFn: api.getScheduledMeetings,
  });

  // Fetch availability config
  const { data: availabilityConfig = [], isLoading: loadingAvailability } = useQuery({
    queryKey: ["/api/availability"],
    queryFn: api.getAvailabilityConfig,
  });

  // Fetch blocked dates
  const { data: blockedDates = [], isLoading: loadingBlocked } = useQuery({
    queryKey: ["/api/blocked-dates"],
    queryFn: api.getBlockedDates,
  });

  // Schedule mutation
  const scheduleMutation = useMutation({
    mutationFn: ({ businessId, datetime }: { businessId: number; datetime: string }) =>
      api.createAppointment({
        businessId,
        datetime,
        isAutoScheduled: false,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      toast({
        title: "Meeting scheduled",
        description: "The consultation has been scheduled successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to schedule meeting. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: (configs: InsertAvailabilityConfig[]) =>
      api.updateAvailabilityConfig(configs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/availability"] });
      setShowAvailabilityModal(false);
      toast({
        title: "Availability updated",
        description: "Your availability settings have been saved.",
      });
    },
  });

  // Create blocked date mutation
  const createBlockedDateMutation = useMutation({
    mutationFn: (data: InsertBlockedDate) => api.createBlockedDate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/slots"] });
      setShowBlockDateModal(false);
      toast({
        title: "Date blocked",
        description: "The selected time has been blocked successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to block date. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete blocked date mutation
  const deleteBlockedDateMutation = useMutation({
    mutationFn: (id: number) => api.deleteBlockedDate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/blocked-dates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/slots"] });
      toast({
        title: "Block removed",
        description: "The date block has been removed.",
      });
    },
  });

  // Update appointment status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ appointmentId, status }: { appointmentId: number; status: 'confirmed' | 'completed' | 'no-show' }) =>
      api.updateAppointment(appointmentId, { status }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      
      const statusMessages = {
        'no-show': 'Marked as no-show. Reschedule message sent.',
        'completed': 'Marked as completed.',
        'confirmed': 'Marked as confirmed.'
      };
      
      toast({
        title: "Status updated",
        description: statusMessages[variables.status],
      });
      
      // Close modal after status update
      setSelectedEvent(null);
      setSelectedLead(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appointment status.",
        variant: "destructive",
      });
    },
  });

  // Cancel appointment mutation
  const cancelAppointmentMutation = useMutation({
    mutationFn: (appointmentId: number) =>
      api.cancelAppointment(appointmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leads/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      
      toast({
        title: "Appointment cancelled",
        description: "The appointment has been cancelled.",
      });
      
      // Close modal
      setSelectedEvent(null);
      setSelectedLead(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel appointment.",
        variant: "destructive",
      });
    },
  });

  // Reschedule appointment mutation
  const rescheduleMutation = useMutation({
    mutationFn: ({ appointmentId, datetime }: { appointmentId: number; datetime: string }) =>
      api.updateAppointment(appointmentId, { datetime }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/scheduling/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/schedule"] });
      queryClient.invalidateQueries({ queryKey: ["/api/businesses"] });
      
      const datetime = moment(variables.datetime);
      toast({
        title: "Appointment rescheduled",
        description: `Successfully rescheduled to ${datetime.format("MMMM D, YYYY at h:mm A")}`,
      });
      
      // Close modals
      setShowRescheduleModal(false);
      setSelectedEvent(null);
      setSelectedLead(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reschedule appointment.",
        variant: "destructive",
      });
    },
  });

  // Convert appointments to calendar events
  const events: CalendarEvent[] = useMemo(() => {
    return appointments.map(appointment => ({
      id: appointment.id,
      businessId: appointment.businessId,
      businessName: appointment.businessName,
      title: appointment.businessName,
      start: new Date(appointment.datetime),
      end: moment(appointment.datetime).add(30, "minutes").toDate(),
      isAutoScheduled: appointment.isAutoScheduled,
      phone: appointment.phone,
      score: appointment.score,
      appointmentStatus: appointment.appointmentStatus || 'confirmed',
    }));
  }, [appointments]);

  // Convert blocked dates to calendar events for display
  const blockedEvents = useMemo(() => {
    return blockedDates.map(blocked => {
      const startDateTime = blocked.startTime 
        ? moment(`${blocked.date} ${blocked.startTime}`, 'YYYY-MM-DD HH:mm').toDate()
        : moment(blocked.date).startOf('day').toDate();
      
      const endDateTime = blocked.endTime
        ? moment(`${blocked.date} ${blocked.endTime}`, 'YYYY-MM-DD HH:mm').toDate()
        : moment(blocked.date).endOf('day').toDate();

      return {
        id: `blocked-${blocked.id}`,
        title: blocked.reason || 'Blocked',
        start: startDateTime,
        end: endDateTime,
        resource: { type: 'blocked', blockedId: blocked.id }
      };
    });
  }, [blockedDates]);

  // Combine all events
  const allEvents = useMemo(() => {
    return [...events, ...blockedEvents];
  }, [events, blockedEvents]);

  // Get occupied time slots for double-booking prevention
  const occupiedSlots = useMemo(() => {
    const slots = new Set<string>();
    allEvents.forEach(event => {
      const slotKey = moment(event.start).format("YYYY-MM-DD HH:mm");
      slots.add(slotKey);
    });
    return slots;
  }, [allEvents]);

  // Handle drag start for pending leads
  const handleDragStart = (lead: Business) => {
    setDraggedLead(lead);
    draggedLeadRef.current = lead; // Store in ref as well
    setDraggedEvent(null);
  };

  // Handle drag start for existing events (for rescheduling)
  const handleEventDragStart = (event: CalendarEvent) => {
    setDraggedEvent(event);
    setDraggedLead(null);
  };

  // Check if a slot is available (updated to check blocked dates)
  const isSlotAvailable = (start: Date, excludeEventId?: number) => {
    const slotKey = moment(start).format("YYYY-MM-DD HH:mm");
    const dateStr = moment(start).format("YYYY-MM-DD");
    const timeStr = moment(start).format("HH:mm");
    
    // Check if slot is occupied by another event
    const isOccupied = events.some(event => {
      if (excludeEventId && event.id === excludeEventId) return false;
      const eventSlotKey = moment(event.start).format("YYYY-MM-DD HH:mm");
      return eventSlotKey === slotKey;
    });
    
    if (isOccupied) return false;
    
    // Check if slot is blocked
    const isBlocked = blockedDates.some(blocked => {
      if (blocked.date !== dateStr) return false;
      
      // Whole day blocked
      if (!blocked.startTime && !blocked.endTime) return true;
      
      // Specific time blocked
      if (blocked.startTime && blocked.endTime) {
        const slotMoment = moment(start);
        const blockedStart = moment(`${dateStr} ${blocked.startTime}`, 'YYYY-MM-DD HH:mm');
        const blockedEnd = moment(`${dateStr} ${blocked.endTime}`, 'YYYY-MM-DD HH:mm');
        return slotMoment.isBetween(blockedStart, blockedEnd, null, '[)');
      }
      
      return false;
    });
    
    return !isBlocked;
  };

  // Handle event drag and drop
  const handleEventDrop = ({ event, start, end }: { event: CalendarEvent; start: Date; end: Date }) => {
    const hour = moment(start).hour();
    const minute = moment(start).minute();
    
    // Validate that the selected time is either 8:30 AM or 9:00 AM
    if (!((hour === 8 && minute === 30) || (hour === 9 && minute === 0))) {
      toast({
        title: "Invalid Time Slot",
        description: "Consultations can only be scheduled at 8:30 AM or 9:00 AM.",
        variant: "destructive",
      });
      return;
    }

    // Check if slot is available (excluding the current event)
    if (!isSlotAvailable(start, event.id)) {
      toast({
        title: "Slot Unavailable",
        description: "That time slot is already booked.",
        variant: "destructive",
      });
      return;
    }

    scheduleMutation.mutate({
      businessId: event.businessId,
      datetime: start.toISOString(),
    });
    
    toast({
      title: "Meeting rescheduled",
      description: `${event.businessName} has been moved to ${moment(start).format("MMMM D, YYYY at h:mm A")}`,
    });
  };

  // Handle drop on calendar
  const handleSelectSlot = useCallback(({ start }: { start: Date }) => {
    const hour = moment(start).hour();
    const minute = moment(start).minute();
    
    // Validate that the selected time is either 8:30 AM or 9:00 AM
    if (!((hour === 8 && minute === 30) || (hour === 9 && minute === 0))) {
      toast({
        title: "Invalid Time Slot",
        description: "Consultations can only be scheduled at 8:30 AM or 9:00 AM.",
        variant: "destructive",
      });
      setDraggedLead(null);
      setDraggedEvent(null);
      return;
    }

    // Handle new lead scheduling
    if (draggedLead) {
      // Check if slot is available
      if (!isSlotAvailable(start)) {
        toast({
          title: "Slot Unavailable",
          description: "That time slot is already booked by another lead.",
          variant: "destructive",
        });
        setDraggedLead(null);
        return;
      }

      scheduleMutation.mutate({
        businessId: draggedLead.id,
        datetime: start.toISOString(),
      });
      setDraggedLead(null);
    }
    
    // Handle event rescheduling
    else if (draggedEvent) {
      // Check if slot is available (excluding the current event)
      if (!isSlotAvailable(start, draggedEvent.id)) {
        toast({
          title: "Slot Unavailable",
          description: "That time slot is already booked by another lead.",
          variant: "destructive",
        });
        setDraggedEvent(null);
        return;
      }

      scheduleMutation.mutate({
        businessId: draggedEvent.businessId,
        datetime: start.toISOString(),
      });
      setDraggedEvent(null);
      
      toast({
        title: "Meeting rescheduled",
        description: `${draggedEvent.businessName} has been moved to ${moment(start).format("h:mm A")}`,
      });
    }
  }, [draggedLead, draggedEvent, scheduleMutation, toast]);

  // Handle event click (updated to handle blocked dates)
  const handleSelectEvent = (event: any) => {
    if (event.resource?.type === 'blocked') {
      // Handle blocked date click - could show details or allow deletion
      return;
    }
    
    setSelectedEvent(event as CalendarEvent);
    // Try to find the full business details
    const business = scheduledMeetings.find(b => b.id === event.businessId);
    if (business) {
      setSelectedLead(business);
    }
  };

  // Custom event style (updated to style blocked dates and status)
  const eventStyleGetter = (event: any) => {
    const isBlocked = event.resource?.type === 'blocked';
    
    if (isBlocked) {
      return {
        style: {
          backgroundColor: "#ef4444",
          borderRadius: "4px",
          opacity: 0.8,
          color: "white",
          border: "2px solid #dc2626",
          display: "block",
          cursor: "not-allowed",
        }
      };
    }
    
    const calendarEvent = event as CalendarEvent;
    const isAutoScheduled = calendarEvent.isAutoScheduled;
    const status = calendarEvent.appointmentStatus;
    
    // Style based on status
    let backgroundColor = isAutoScheduled ? "#6b7280" : "#3b82f6";
    let opacity = 0.9;
    
    if (status === 'no-show') {
      backgroundColor = "#f87171"; // Light red for no-shows
      opacity = 0.7;
    } else if (status === 'completed') {
      backgroundColor = "#4ade80"; // Green for completed
    }
    
    const style = {
      backgroundColor,
      borderRadius: "4px",
      opacity,
      color: "white",
      border: isAutoScheduled ? "2px dashed #4b5563" : "0px",
      display: "block",
      cursor: status === 'no-show' ? "default" : "move",
    };
    return { style };
  };

  // Custom slot style to highlight available times
  const slotPropGetter = (date: Date) => {
    const hour = moment(date).hour();
    const minute = moment(date).minute();
    const slotKey = moment(date).format("YYYY-MM-DD HH:mm");
    const isOccupied = occupiedSlots.has(slotKey);
    
    // Highlight 8:30 AM and 9:00 AM slots
    if ((hour === 8 && minute === 30) || (hour === 9 && minute === 0)) {
      return {
        style: {
          backgroundColor: isOccupied ? "#fee2e2" : "#e0f2fe",
          borderLeft: isOccupied ? "3px solid #ef4444" : "3px solid #0ea5e9",
        }
      };
    }
    
    return {};
  };

  // Availability editor
  const AvailabilityEditor = () => {
    const [localConfig, setLocalConfig] = useState<Record<number, { start: string; end: string; active: boolean }>>(() => {
      const config: Record<number, { start: string; end: string; active: boolean }> = {};
      DAYS_OF_WEEK.forEach(day => {
        const existing = availabilityConfig.find(c => c.dayOfWeek === day.value);
        config[day.value] = {
          start: existing?.startTime || "08:30",
          end: existing?.endTime || "09:30",
          active: existing?.isActive ?? true,
        };
      });
      return config;
    });

    const handleSave = () => {
      const configs = Object.entries(localConfig)
        .filter(([_, config]) => config.active)
        .map(([dayOfWeek, config]) => ({
          dayOfWeek: parseInt(dayOfWeek),
          startTime: config.start,
          endTime: config.end,
          isActive: config.active,
        }));
      updateAvailabilityMutation.mutate(configs);
    };

    return (
      <Dialog open={showAvailabilityModal} onOpenChange={setShowAvailabilityModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Set Your Weekly Availability</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {DAYS_OF_WEEK.map(day => (
              <div key={day.value} className="flex items-center space-x-4">
                <div className="w-24">
                  <Label>{day.label}</Label>
                </div>
                <Switch
                  checked={localConfig[day.value].active}
                  onCheckedChange={(checked) =>
                    setLocalConfig(prev => ({
                      ...prev,
                      [day.value]: { ...prev[day.value], active: checked }
                    }))
                  }
                />
                {localConfig[day.value].active && (
                  <>
                    <input
                      type="time"
                      value={localConfig[day.value].start}
                      onChange={(e) =>
                        setLocalConfig(prev => ({
                          ...prev,
                          [day.value]: { ...prev[day.value], start: e.target.value }
                        }))
                      }
                      className="px-3 py-1 border rounded"
                    />
                    <span>to</span>
                    <input
                      type="time"
                      value={localConfig[day.value].end}
                      onChange={(e) =>
                        setLocalConfig(prev => ({
                          ...prev,
                          [day.value]: { ...prev[day.value], end: e.target.value }
                        }))
                      }
                      className="px-3 py-1 border rounded"
                    />
                  </>
                )}
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAvailabilityModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateAvailabilityMutation.isPending}>
              {updateAvailabilityMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Availability
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Block Date Modal
  const BlockDateModal = () => (
    <Dialog open={showBlockDateModal} onOpenChange={setShowBlockDateModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Block Date/Time</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label>Date</Label>
            <Input
              type="date"
              value={blockDateForm.date}
              onChange={(e) => setBlockDateForm(prev => ({ ...prev, date: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label>Time Option</Label>
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="whole"
                  checked={blockDateForm.timeOption === 'whole'}
                  onChange={(e) => setBlockDateForm(prev => ({ ...prev, timeOption: 'whole' }))}
                />
                <span>Whole Day</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  value="specific"
                  checked={blockDateForm.timeOption === 'specific'}
                  onChange={(e) => setBlockDateForm(prev => ({ ...prev, timeOption: 'specific' }))}
                />
                <span>Specific Time</span>
              </label>
            </div>
          </div>
          
          {blockDateForm.timeOption === 'specific' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input
                  type="time"
                  value={blockDateForm.startTime}
                  onChange={(e) => setBlockDateForm(prev => ({ ...prev, startTime: e.target.value }))}
                />
              </div>
              <div>
                <Label>End Time</Label>
                <Input
                  type="time"
                  value={blockDateForm.endTime}
                  onChange={(e) => setBlockDateForm(prev => ({ ...prev, endTime: e.target.value }))}
                />
              </div>
            </div>
          )}
          
          <div>
            <Label>Reason (optional)</Label>
            <Textarea
              placeholder="e.g., Personal appointment, Holiday, etc."
              value={blockDateForm.reason}
              onChange={(e) => setBlockDateForm(prev => ({ ...prev, reason: e.target.value }))}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowBlockDateModal(false)}>
            Cancel
          </Button>
          <Button 
            onClick={() => {
              const data: InsertBlockedDate = {
                date: blockDateForm.date,
                startTime: blockDateForm.timeOption === 'specific' ? blockDateForm.startTime : null,
                endTime: blockDateForm.timeOption === 'specific' ? blockDateForm.endTime : null,
                reason: blockDateForm.reason || null
              };
              createBlockedDateMutation.mutate(data);
            }}
            disabled={createBlockedDateMutation.isPending}
          >
            {createBlockedDateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Block Date
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (loadingLeads || loadingSchedule || loadingAvailability || loadingAppointments || loadingBlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <a href="/" className="flex items-center space-x-2 hover:opacity-80 transition-opacity">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Globe className="text-white w-4 h-4" />
              </div>
              <span className="font-bold text-xl text-gray-900">LocalBiz Pro</span>
            </a>
            <div className="hidden md:flex space-x-6 ml-8">
              <a href="/" className="text-gray-600 hover:text-gray-900">Dashboard</a>
              <a href="/prospects" className="text-gray-600 hover:text-gray-900">Prospects</a>
              <a href="/inbox" className="text-gray-600 hover:text-gray-900">Inbox</a>
              <a href="/scheduling" className="text-primary border-b-2 border-primary pb-2 font-medium">Scheduling</a>
              <a href="/clients" className="text-gray-600 hover:text-gray-900">Clients</a>
              <a href="/templates" className="text-gray-600 hover:text-gray-900">Templates</a>
              <a href="/analytics" className="text-gray-600 hover:text-gray-900">Analytics</a>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Scheduling Dashboard</h1>
              <p className="text-gray-600 mt-1">
                {draggedLead 
                  ? "Drop anywhere on the calendar to choose a time" 
                  : "Drag leads to calendar or click Schedule • Available times: 8:30 AM & 9:00 AM only"}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => setShowBlockDateModal(true)}>
                <Ban className="mr-2 h-4 w-4" />
                Block Date
              </Button>
              <Button onClick={() => setShowAvailabilityModal(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Set Availability
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar - Pending Leads + Blocked Dates */}
            <div className="col-span-3 space-y-4">
              {/* Pending Leads Card */}
              <Card className="h-[400px]">
                <CardHeader>
                  <CardTitle className="text-lg">Pending Leads ({pendingLeads.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 max-h-[340px] overflow-y-auto">
                  {pendingLeads.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>No high-scoring leads to schedule</p>
                    </div>
                  ) : (
                    pendingLeads.map(lead => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={() => handleDragStart(lead)}
                        className={`p-3 bg-gray-50 rounded-lg cursor-move hover:bg-gray-100 transition-colors ${
                          draggedLead?.id === lead.id ? 'opacity-50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium text-sm">{lead.name}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {lead.score || 0}
                          </Badge>
                        </div>
                        <div className="space-y-1 text-xs text-gray-600">
                          <div className="flex items-center">
                            <Phone className="h-3 w-3 mr-1" />
                            {lead.phone}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1" />
                            {lead.city}, {lead.state}
                          </div>
                          {lead.tags && (
                            <div className="flex items-center">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              {lead.businessType}
                            </div>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => {
                            setRescheduleForm({
                              businessId: lead.id,
                              businessName: lead.name,
                              date: moment().format('YYYY-MM-DD'),
                              time: '08:30'
                            });
                            setShowRescheduleModal(true);
                          }}
                        >
                          <CalendarIcon className="h-3 w-3 mr-1" />
                          Schedule
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Blocked Dates Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center justify-between">
                    <span>Blocked Times</span>
                    <Ban className="h-4 w-4 text-red-500" />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 max-h-[250px] overflow-y-auto">
                  {blockedDates.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No blocked dates
                    </p>
                  ) : (
                    blockedDates.map(blocked => (
                      <div key={blocked.id} className="bg-red-50 p-2 rounded-lg border border-red-200">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-medium text-sm">
                              {moment(blocked.date).format('MMM D, YYYY')}
                            </p>
                            <p className="text-xs text-gray-600">
                              {!blocked.startTime && !blocked.endTime 
                                ? 'Whole day' 
                                : `${blocked.startTime} - ${blocked.endTime}`}
                            </p>
                            {blocked.reason && (
                              <p className="text-xs text-gray-500 mt-1">{blocked.reason}</p>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBlockedDateMutation.mutate(blocked.id!)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Calendar */}
            <div className="col-span-9">
              <Card className="h-[700px]">
                <CardContent 
                  className="p-0 h-full relative"
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    console.log('Drop event fired, draggedLead:', draggedLead, 'ref:', draggedLeadRef.current);
                    
                    if (!draggedLeadRef.current) return;
                    
                    // Find which date was dropped on
                    let dropDate = date;
                    
                    if ((view as string) === 'week') {
                      // Try to find the date by using the date headers directly
                      const allHeaders = document.querySelectorAll('.rbc-header .rbc-date-cell');
                      console.log('Date headers:', allHeaders.length, Array.from(allHeaders).map(h => h.textContent));
                      
                      // Find which column was dropped on by X position
                      let dropColumnIndex = -1;
                      for (let i = 0; i < allHeaders.length; i++) {
                        const header = allHeaders[i] as HTMLElement;
                        const rect = header.getBoundingClientRect();
                        if (e.clientX >= rect.left && e.clientX <= rect.right) {
                          dropColumnIndex = i;
                          break;
                        }
                      }
                      
                      if (dropColumnIndex >= 0 && dropColumnIndex < allHeaders.length) {
                        // Extract the date from the header text (usually format like "Mon 02")
                        const headerText = allHeaders[dropColumnIndex].textContent || '';
                        const dayMatch = headerText.match(/\d+/);
                        
                        if (dayMatch) {
                          const dayNum = parseInt(dayMatch[0]);
                          dropDate = moment(date).date(dayNum).toDate();
                          console.log('Drop date from header:', {
                            columnIndex: dropColumnIndex,
                            headerText,
                            dayNum,
                            dropDate: moment(dropDate).format('YYYY-MM-DD dddd')
                          });
                        }
                      }
                    } else if ((view as string) === 'month') {
                      // For month view, try to extract from the clicked cell
                      const dropTarget = document.elementFromPoint(e.clientX, e.clientY);
                      const monthCell = dropTarget?.closest('.rbc-date-cell');
                      if (monthCell && monthCell.textContent) {
                        const dayNum = parseInt(monthCell.textContent);
                        if (!isNaN(dayNum)) {
                          dropDate = moment(date).date(dayNum).toDate();
                        }
                      }
                    }
                    
                    // Set the date for scheduling
                    setQuickScheduleDate(dropDate);
                    
                    // Store the lead being scheduled
                    console.log('Setting schedulingLead:', draggedLeadRef.current);
                    setSchedulingLead(draggedLeadRef.current);
                    
                    // Open the quick schedule modal
                    setShowQuickScheduleModal(true);
                  }}
                >
                  <Calendar
                    localizer={localizer}
                    events={allEvents}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: "100%" }}
                    view={view}
                    onView={setView}
                    date={date}
                    onNavigate={setDate}
                    onSelectSlot={handleSelectSlot}
                    onSelectEvent={handleSelectEvent}
                    selectable
                    eventPropGetter={eventStyleGetter}
                    slotPropGetter={slotPropGetter}
                    min={moment().hours(8).minutes(30).toDate()}
                    max={moment().hours(9).minutes(30).toDate()}
                    step={30}
                    timeslots={1}
                    components={{
                      event: ({ event }) => {
                        if (event.resource?.type === 'blocked') {
                          return (
                            <div className="p-1">
                              <div className="font-medium text-xs flex items-center">
                                <Ban className="w-3 h-3 mr-1" />
                                {event.title}
                              </div>
                            </div>
                          );
                        }
                        
                        const calendarEvent = event as CalendarEvent;
                        return (
                          <div className="p-1 cursor-move">
                            <div className="font-medium text-xs flex items-center">
                              {calendarEvent.isAutoScheduled && (
                                <Link2 className="w-3 h-3 mr-1" />
                              )}
                              {event.title}
                            </div>
                            <div className="text-xs opacity-75">
                              {moment(event.start).format("h:mm A")}
                            </div>
                          </div>
                        );
                      },
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Lead/Event Details Modal */}
          {(selectedLead || selectedEvent) && (
            <Dialog open={!!(selectedLead || selectedEvent)} onOpenChange={() => {
              setSelectedLead(null);
              setSelectedEvent(null);
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{selectedLead?.name || selectedEvent?.businessName}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <Label className="text-sm text-gray-600">Scheduled Time</Label>
                    <p className="font-medium">
                      {(selectedLead?.scheduledTime || selectedEvent?.start)
                        ? moment(selectedLead?.scheduledTime || selectedEvent?.start).format("MMMM D, YYYY at h:mm A")
                        : "Not scheduled"}
                    </p>
                  </div>
                  
                  {selectedEvent && (
                    <div>
                      <Label className="text-sm text-gray-600">Status</Label>
                      <div className="flex items-center space-x-2 mt-1">
                        {selectedEvent.appointmentStatus === 'confirmed' && (
                          <Badge className="bg-blue-100 text-blue-700">
                            <Clock className="w-3 h-3 mr-1" />
                            Confirmed
                          </Badge>
                        )}
                        {selectedEvent.appointmentStatus === 'completed' && (
                          <Badge className="bg-green-100 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Completed
                          </Badge>
                        )}
                        {selectedEvent.appointmentStatus === 'no-show' && (
                          <Badge className="bg-red-100 text-red-700">
                            <UserX className="w-3 h-3 mr-1" />
                            No Show
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {selectedEvent?.isAutoScheduled && (
                    <div>
                      <Label className="text-sm text-gray-600">Booking Type</Label>
                      <div className="flex items-center space-x-2">
                        <Link2 className="w-4 h-4 text-gray-500" />
                        <p className="font-medium text-gray-700">Auto-Scheduled via Booking Link</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm text-gray-600">Contact</Label>
                    <p className="font-medium">{selectedLead?.phone || selectedEvent?.phone}</p>
                    {selectedLead?.email && <p className="text-sm text-gray-600">{selectedLead.email}</p>}
                  </div>
                  {selectedLead && (
                    <div>
                      <Label className="text-sm text-gray-600">Location</Label>
                      <p className="font-medium">
                        {selectedLead.address}, {selectedLead.city}, {selectedLead.state}
                      </p>
                    </div>
                  )}
                  {selectedLead?.notes && (
                    <div>
                      <Label className="text-sm text-gray-600">Notes</Label>
                      <p className="text-sm whitespace-pre-wrap">{selectedLead.notes}</p>
                    </div>
                  )}
                  
                  {selectedEvent && selectedEvent.appointmentStatus !== 'no-show' && (
                    <div className="border-t pt-4">
                      <Label className="text-sm text-gray-600 mb-2 block">Update Status</Label>
                      <div className="flex items-center space-x-2">
                        {selectedEvent.appointmentStatus !== 'completed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatusMutation.mutate({
                              appointmentId: selectedEvent.id,
                              status: 'completed'
                            })}
                            disabled={updateStatusMutation.isPending}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            Mark Complete
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => updateStatusMutation.mutate({
                            appointmentId: selectedEvent.id,
                            status: 'no-show'
                          })}
                          disabled={updateStatusMutation.isPending}
                        >
                          <UserX className="w-4 h-4 mr-1" />
                          Mark No-Show
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  {selectedEvent && (
                    <div className="bg-blue-50 p-3 rounded-lg">
                      <p className="text-sm text-blue-700">
                        <strong>Tip:</strong> You can drag this appointment to reschedule it to 8:30 AM or 9:00 AM on any available day.
                      </p>
                    </div>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setSelectedLead(null);
                    setSelectedEvent(null);
                  }}>
                    Close
                  </Button>
                  {selectedEvent && (
                    <>
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setRescheduleForm({
                            businessId: selectedEvent.businessId,
                            businessName: selectedEvent.businessName,
                            date: moment().format('YYYY-MM-DD'),
                            time: '08:30'
                          });
                          setShowRescheduleModal(true);
                        }}
                      >
                        Reschedule
                      </Button>
                      <Button 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          if (confirm("Are you sure you want to cancel this appointment? The lead will be moved back to pending.")) {
                            cancelAppointmentMutation.mutate(selectedEvent.id);
                          }
                        }}
                        disabled={cancelAppointmentMutation.isPending}
                      >
                        {cancelAppointmentMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Cancel Appointment
                      </Button>
                    </>
                  )}
                  {(selectedLead || selectedEvent) && (
                    <Button onClick={() => window.location.href = `/business/${selectedLead?.id || selectedEvent?.businessId}`}>
                      View Full Profile
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}

          <AvailabilityEditor />
          <BlockDateModal />
          
          {/* Quick Schedule Modal - shown after drag and drop */}
          {/* Force reload - updated button layout */}
          <Dialog open={showQuickScheduleModal} onOpenChange={(open) => {
            console.log('Quick schedule modal change:', { open, schedulingLead, draggedLead });
            setShowQuickScheduleModal(open);
            if (!open) {
              setDraggedLead(null);
              draggedLeadRef.current = null; // Clear ref
              setSchedulingLead(null);
              setSelectedTime(null);
            }
          }}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Choose Appointment Time</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm text-gray-600">Scheduling for:</Label>
                  <p className="font-medium">{schedulingLead?.name || 'Unknown Lead'}</p>
                  {!schedulingLead && <p className="text-red-500 text-sm">Error: No lead selected</p>}
                  <p className="text-sm text-gray-500">
                    {moment(quickScheduleDate).format('dddd, MMMM D, YYYY')}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Button
                    className={`w-full justify-start ${selectedTime === '08:30' ? 'ring-2 ring-blue-500' : ''}`}
                    variant={selectedTime === '08:30' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setSelectedTime('08:30')}
                  >
                    <Clock className="mr-2 h-5 w-5" />
                    8:30 AM
                  </Button>
                  
                  <Button
                    className={`w-full justify-start ${selectedTime === '09:00' ? 'ring-2 ring-blue-500' : ''}`}
                    variant={selectedTime === '09:00' ? 'default' : 'outline'}
                    size="lg"
                    onClick={() => setSelectedTime('09:00')}
                  >
                    <Clock className="mr-2 h-5 w-5" />
                    9:00 AM
                  </Button>
                </div>
                
                {/* Show selected time confirmation */}
                {selectedTime && (
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-sm text-blue-700">
                      Selected time: <strong>{selectedTime} AM</strong>
                    </p>
                  </div>
                )}
                
                {/* Buttons directly in content area */}
                <div className="flex justify-between gap-3 pt-4 border-t">
                  <Button 
                    type="button"
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      console.log('Cancel clicked');
                      setShowQuickScheduleModal(false);
                      setDraggedLead(null);
                      draggedLeadRef.current = null; // Clear ref
                      setSchedulingLead(null);
                      setSelectedTime(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="default"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={!selectedTime || scheduleMutation.isPending}
                    onClick={() => {
                      console.log('Save clicked', { schedulingLead, selectedTime, quickScheduleDate });
                      
                      if (!schedulingLead || !selectedTime) {
                        console.error('Missing required data:', { schedulingLead, selectedTime });
                        toast({
                          title: "Error",
                          description: "Missing scheduling data. Please try again.",
                          variant: "destructive",
                        });
                        return;
                      }
                      
                      const [hour, minute] = selectedTime.split(':').map(Number);
                      const datetime = moment(quickScheduleDate)
                        .hour(hour)
                        .minute(minute)
                        .second(0)
                        .toISOString();
                      
                      console.log('Scheduling appointment:', { 
                        businessId: schedulingLead.id, 
                        datetime,
                        formattedTime: moment(datetime).format('YYYY-MM-DD HH:mm:ss')
                      });
                      
                      scheduleMutation.mutate({
                        businessId: schedulingLead.id,
                        datetime,
                      }, {
                        onSuccess: () => {
                          console.log('Schedule mutation successful');
                          setShowQuickScheduleModal(false);
                          setDraggedLead(null);
                          draggedLeadRef.current = null; // Clear ref
                          setSchedulingLead(null);
                          setSelectedTime(null);
                        },
                        onError: (error) => {
                          console.error('Schedule mutation failed:', error);
                        }
                      });
                    }}
                  >
                    {scheduleMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Scheduling...
                      </>
                    ) : (
                      'Save Appointment'
                    )}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Reschedule Modal */}
          <Dialog open={showRescheduleModal} onOpenChange={setShowRescheduleModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {selectedEvent ? 'Reschedule Appointment' : 'Schedule Appointment'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label className="text-sm text-gray-600">Business</Label>
                  <p className="font-medium">{rescheduleForm.businessName}</p>
                </div>
                
                <div>
                  <Label>{selectedEvent ? 'New Date' : 'Date'}</Label>
                  <Input
                    type="date"
                    value={rescheduleForm.date}
                    min={moment().format('YYYY-MM-DD')}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, date: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label>{selectedEvent ? 'New Time' : 'Time'}</Label>
                  <select
                    className="w-full px-3 py-2 border rounded-md"
                    value={rescheduleForm.time}
                    onChange={(e) => setRescheduleForm(prev => ({ ...prev, time: e.target.value }))}
                  >
                    <option value="08:30">8:30 AM</option>
                    <option value="09:00">9:00 AM</option>
                  </select>
                </div>
                
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> Appointments can only be scheduled at 8:30 AM or 9:00 AM.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRescheduleModal(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    const datetime = moment(`${rescheduleForm.date} ${rescheduleForm.time}`, 'YYYY-MM-DD HH:mm').toISOString();
                    const datetimeMoment = moment(datetime);
                    
                    // Check if the slot is available
                    if (!isSlotAvailable(datetimeMoment.toDate(), rescheduleForm.businessId)) {
                      toast({
                        title: "Slot Unavailable",
                        description: "That time slot is already booked or blocked.",
                        variant: "destructive",
                      });
                      return;
                    }
                    
                    rescheduleMutation.mutate({
                      appointmentId: selectedEvent?.id || 0,
                      datetime
                    });
                  }}
                  disabled={rescheduleMutation.isPending}
                >
                  {rescheduleMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {selectedEvent ? 'Confirm Reschedule' : 'Schedule Appointment'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
} 