import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Calendar } from 'lucide-react'
import Card from '../Card'
import api from '../../api'

interface Appointment {
  id: number
  client_name: string
  appointment_time: string
  appointmentDate?: string  // Add this field to match actual API data
  appointmentTime?: string  // Add this field to match actual API data
  firstName?: string        // Add this field to match actual API data
  lastName?: string         // Add this field to match actual API data
  service_type?: string
  notes?: string
  status?: string
}

const AppointmentsPanel: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const response = await api.get<Appointment[]>('/appointments')
        
        // Filter for recent appointments (today and yesterday)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const yesterday = new Date(today)
        yesterday.setDate(today.getDate() - 1)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        // Handle both wrapped response format {success: true, appointments: [...]} and direct array
        const appointments = (response.data as any).appointments || response.data
        const recentAppointments = (appointments as Appointment[])
          .filter((apt: Appointment) => {
            // Use appointmentDate field (which exists) instead of appointment_time (which is null)
            const aptDate = new Date(apt.appointmentDate || apt.appointment_time)
            return aptDate >= yesterday && aptDate < tomorrow && apt.status !== 'cancelled'
          })
          .sort((a: Appointment, b: Appointment) => {
            const aDateTime = a.appointmentDate || a.appointment_time;
            const bDateTime = b.appointmentDate || b.appointment_time;
            return new Date(aDateTime).getTime() - new Date(bDateTime).getTime();
          })
          .slice(0, 5) // Max 5 appointments
          
        setAppointments(recentAppointments)
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

  return (
    <Card>
      <Link to="/schedule" className="block">
        <div className="flex items-center gap-2 mb-4 hover:text-blue-600 transition-colors cursor-pointer">
          <Calendar className="w-5 h-5" />
          <h3 className="text-lg font-semibold">
            Appointments ({appointments.length} recent)
          </h3>
        </div>
      </Link>

      {loading ? (
        <div className="text-center py-4 text-gray-500">Loading...</div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-4 text-gray-500">No recent appointments</div>
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
                  {appointment.appointmentTime || formatTime(appointment.appointment_time)}
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
                      {appointment.client_name || `${appointment.firstName || ''} ${appointment.lastName || ''}`.trim()}
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