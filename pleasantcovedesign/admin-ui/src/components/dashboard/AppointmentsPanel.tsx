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

  const extractClientName = (appointment: Appointment): string => {
    // Try client_name first
    if (appointment.client_name) return appointment.client_name
    
    // Try firstName/lastName combination
    const fullName = `${appointment.firstName || ''} ${appointment.lastName || ''}`.trim()
    if (fullName) return fullName
    
    // Extract from notes if available
    if (appointment.notes) {
      const nameMatch = appointment.notes.match(/Name:\s*([^\n\r]+)/)
      if (nameMatch) return nameMatch[1].trim()
      
      const businessMatch = appointment.notes.match(/Business:\s*([^\n\r]+)/)
      if (businessMatch) return businessMatch[1].trim()
    }
    
    return 'Unknown Client'
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
          {appointments.map((appointment) => (
            <Link
              key={appointment.id}
              to="/schedule"
              className="block hover:bg-gray-50 -mx-2 px-2 py-2 rounded transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-2">
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  {appointment.appointmentTime || formatTime(appointment.datetime || appointment.appointment_time)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm">
                    <span className="font-medium">
                      {appointment.service_type || 'Consultation'}
                    </span>
                    {appointment.notes && (
                      <span className="text-gray-500"> (Regarding)</span>
                    )}
                    {' • '}
                    <span className="text-gray-700">
                      {extractClientName(appointment)}
                    </span>
                  </p>
                </div>
              </div>
            </Link>
          ))}
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