import React from 'react'
import PotentialClientsPanel from '../components/dashboard/PotentialClientsPanel'
import AppointmentsPanel from '../components/dashboard/AppointmentsPanel'
import CurrentProjectsPanel from '../components/dashboard/CurrentProjectsPanel'
import MessagesPanel from '../components/dashboard/MessagesPanel'

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to Pleasant Cove Design</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PotentialClientsPanel />
        <AppointmentsPanel />
        <CurrentProjectsPanel />
        <MessagesPanel />
      </div>
    </div>
  )
}

export default Dashboard 