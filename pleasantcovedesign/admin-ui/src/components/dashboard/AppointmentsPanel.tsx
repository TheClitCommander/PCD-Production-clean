import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import Card from '../Card'
import api from '../../api'

interface Appointment {
  id: number
  datetime: string          // Main datetime field from database
  client_name?: string
  appointment_time?: string
  appointmentDate?: string  // Add this field to match actual API data
  appointmentTime?: string  // Add this field to match actual API data
  firstName?: string        // Add this field to match actual API data
  lastName?: string         // Add this field to match actual API data
  service_type?: string
  notes?: string
  status?: string
  company_id?: number
  project_id?: number
}

const AppointmentsPanel: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await api.get<Appointment[]>('/appointments')
        
        // Filter for upcoming appointments (today through next 6 months for demo purposes)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const sixMonthsFromNow = new Date(today)
        sixMonthsFromNow.setMonth(today.getMonth() + 6)
        
        // Handle both wrapped response format {success: true, appointments: [...]} and direct array
        const appointments = (response.data as any).appointments || response.data
        const upcomingAppointments = (appointments as Appointment[])
          .filter((apt: Appointment) => {
            // Use datetime field (main field from database) with fallbacks
            const aptDateTime = apt.datetime || apt.appointmentDate || apt.appointment_time
            if (!aptDateTime) return false
            
            const aptDate = new Date(aptDateTime)
            return aptDate >= today && aptDate <= sixMonthsFromNow && apt.status !== 'cancelled'
          })
          .sort((a: Appointment, b: Appointment) => {
            const aDateTime = a.datetime || a.appointmentDate || a.appointment_time;
            const bDateTime = b.datetime || b.appointmentDate || b.appointment_time;
            return new Date(aDateTime).getTime() - new Date(bDateTime).getTime();
          })
          .slice(0, 5) // Max 5 appointments
          
        setAppointments(upcomingAppointments)
      } catch (error) {
        console.error('Failed to fetch appointments:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAppointments()
  }, [])

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatAppointmentDate = (datetime: string | Date): string => {
    const date = new Date(datetime);
    const dateString = date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    const timeString = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return `${dateString} ${timeString}`;
  }

  // Parse structured appointment data from notes
  const parseAppointmentData = (appointment: Appointment) => {
    const notes = appointment.notes || ''
    
    // Extract key information using regex patterns
    const servicesMatch = notes.match(/Services Requested:\s*([^\n\r]+)/)
    const budgetMatch = notes.match(/Budget:\s*([^\n\r]+)/)
    const timelineMatch = notes.match(/Timeline:\s*([^\n\r]+)/)
    const nameMatch = notes.match(/Name:\s*([^\n\r]+)/)
    const emailMatch = notes.match(/Email:\s*([^\n\r]+)/)
    const phoneMatch = notes.match(/Phone:\s*([^\n\r]+)/)
    const businessMatch = notes.match(/Business:\s*([^\n\r]+)/)
    const sourceMatch = notes.match(/Booked via:\s*([^\n\r]+)/)
    const meetingTypeMatch = notes.match(/Meeting Type:\s*([^\n\r]+)/)
    
    // Extract project description (multiline)
    const projectDescMatch = notes.match(/Project Description:\s*\n([\s\S]*?)(?=\n\n|Contact Information:|Additional Notes:|$)/)
    
    return {
      services: servicesMatch?.[1]?.trim() || appointment.service_type || 'Consultation',
      budget: budgetMatch?.[1]?.trim(),
      timeline: timelineMatch?.[1]?.trim(),
      clientName: nameMatch?.[1]?.trim() || appointment.client_name || 'Unknown Client',
      email: emailMatch?.[1]?.trim() || appointment.email,
      phone: phoneMatch?.[1]?.trim() || appointment.phone,
      businessName: businessMatch?.[1]?.trim(),
      source: sourceMatch?.[1]?.trim(),
      meetingType: meetingTypeMatch?.[1]?.trim(),
      projectDescription: projectDescMatch?.[1]?.trim()
    }
  }

  const extractClientName = (appointment: Appointment): string => {
    const parsed = parseAppointmentData(appointment)
    return parsed.clientName
  }

  return (
    <Card>
      <Link to="/schedule" className="block">
        <div className="flex items-center gap-2 mb-4 hover:text-blue-600 transition-colors cursor-pointer">
          <Calendar className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            Appointments ({appointments.length} upcoming)
          </h3>
        </div>
      </Link>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No upcoming appointments</div>
      ) : (
        <div className="space-y-3">
          {appointments.map((appointment) => {
            const parsed = parseAppointmentData(appointment)
            return (
              <Link
                key={appointment.id}
                to="/schedule"
                className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                    {formatAppointmentDate(appointment.datetime || appointment.appointment_time)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">
                      <span className="font-medium">
                        {parsed.services}
                      </span>
                      {' • '}
                      <span className="text-gray-700">
                        {parsed.clientName}
                      </span>
                      {parsed.businessName && (
                        <span className="text-gray-500"> ({parsed.businessName})</span>
                      )}
                    </p>
                    {parsed.budget && parsed.timeline && (
                      <p className="text-xs text-gray-500 mt-1">
                        {parsed.budget} • {parsed.timeline}
                        {parsed.source && (
                          <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            {parsed.source.replace('_', ' ')}
                          </span>
                        )}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <Link
        to="/schedule"
        className="block mt-4 text-center text-blue-600 hover:text-blue-700 font-medium"
      >
        View Full Calendar →
      </Link>
    </Card>
  )
}

export default AppointmentsPanel 