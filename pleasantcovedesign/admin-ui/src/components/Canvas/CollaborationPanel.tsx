import React, { useState } from 'react'
import { Users, MessageCircle, Video, Share2, Bell, Crown, Eye } from 'lucide-react'

interface Collaborator {
  id: string
  name: string
  email: string
  role: 'owner' | 'editor' | 'viewer'
  status: 'online' | 'offline' | 'away'
  avatar?: string
  cursor?: { x: number; y: number }
  lastActivity?: string
}

interface CollaborationPanelProps {
  collaborators: Array<{
    id: string
    name: string
    color: string
    cursor?: { x: number; y: number }
  }>
  projectId: string
}

const CollaborationPanel: React.FC<CollaborationPanelProps> = ({
  collaborators,
  projectId
}) => {
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('viewer')

  // Mock expanded collaborator data
  const expandedCollaborators: Collaborator[] = [
    {
      id: 'current-user',
      name: 'You',
      email: 'admin@pleasantcove.com',
      role: 'owner',
      status: 'online',
      lastActivity: 'Active now'
    },
    {
      id: 'sarah-wilson',
      name: 'Sarah Wilson',
      email: 'sarah@client.com',
      role: 'editor',
      status: 'online',
      lastActivity: '2 minutes ago'
    },
    {
      id: 'mike-chen',
      name: 'Mike Chen',
      email: 'mike@client.com',
      role: 'viewer',
      status: 'away',
      lastActivity: '1 hour ago'
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500'
      case 'away': return 'bg-yellow-500'
      case 'offline': return 'bg-gray-400'
      default: return 'bg-gray-400'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-3 h-3 text-yellow-600" />
      case 'editor': return <Users className="w-3 h-3 text-blue-600" />
      case 'viewer': return <Eye className="w-3 h-3 text-gray-600" />
      default: return null
    }
  }

  const handleInvite = () => {
    if (!inviteEmail.trim()) return
    
    // TODO: Implement invitation logic
    console.log('Invite user:', { email: inviteEmail, role: inviteRole, projectId })
    
    setInviteEmail('')
    setShowInviteForm(false)
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Collaboration</h3>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            {expandedCollaborators.filter(c => c.status === 'online').length} online
          </span>
        </div>
      </div>

      {/* Active Collaborators */}
      <div className="space-y-3 mb-6">
        {expandedCollaborators.map((collaborator) => (
          <div
            key={collaborator.id}
            className="flex items-center space-x-3 p-2 rounded hover:bg-gray-50"
          >
            {/* Avatar */}
            <div className="relative">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                {collaborator.name.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${getStatusColor(collaborator.status)}`} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900 truncate">
                  {collaborator.name}
                </span>
                {getRoleIcon(collaborator.role)}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {collaborator.email}
              </div>
              <div className="text-xs text-gray-400">
                {collaborator.lastActivity}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-1">
              {collaborator.status === 'online' && collaborator.id !== 'current-user' && (
                <>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Start video call"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Send message"
                  >
                    <MessageCircle className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite Section */}
      <div className="border-t border-gray-200 pt-4">
        {!showInviteForm ? (
          <button
            onClick={() => setShowInviteForm(true)}
            className="w-full px-3 py-2 text-sm text-blue-600 border border-blue-200 rounded hover:bg-blue-50 flex items-center justify-center space-x-2"
          >
            <Share2 className="w-4 h-4" />
            <span>Invite Collaborator</span>
          </button>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Enter email address"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Permission Level
              </label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="viewer">Viewer - Can view and comment</option>
                <option value="editor">Editor - Can edit and modify</option>
              </select>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => {
                  setShowInviteForm(false)
                  setInviteEmail('')
                }}
                className="flex-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInvite}
                disabled={!inviteEmail.trim()}
                className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Send Invite
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Collaboration Features */}
      <div className="mt-6 space-y-3">
        <button className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded hover:bg-gray-50 flex items-center space-x-2">
          <MessageCircle className="w-4 h-4" />
          <span>Project Chat</span>
        </button>
        
        <button className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded hover:bg-gray-50 flex items-center space-x-2">
          <Video className="w-4 h-4" />
          <span>Start Video Call</span>
        </button>
        
        <button className="w-full px-3 py-2 text-sm text-gray-700 border border-gray-200 rounded hover:bg-gray-50 flex items-center space-x-2">
          <Bell className="w-4 h-4" />
          <span>Notification Settings</span>
        </button>
      </div>

      {/* Real-time Activity Feed */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <h4 className="text-xs font-medium text-gray-700 mb-3">Recent Activity</h4>
        <div className="space-y-2 text-xs text-gray-500">
          <div>Sarah added a comment to Button element</div>
          <div>Mike viewed the design</div>
          <div>You created version 3</div>
        </div>
      </div>
    </div>
  )
}

export default CollaborationPanel