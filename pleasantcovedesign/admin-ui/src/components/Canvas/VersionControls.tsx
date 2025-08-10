import React, { useState } from 'react'
import { Plus, Clock, Check, Tag, MessageSquare } from 'lucide-react'

interface VersionControlsProps {
  currentVersion: number
  onCreateVersion: (description: string) => void
  disabled?: boolean
}

const VersionControls: React.FC<VersionControlsProps> = ({
  currentVersion,
  onCreateVersion,
  disabled = false
}) => {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [versionDescription, setVersionDescription] = useState('')

  // Mock version history - in real app this would come from props/API
  const versionHistory = [
    {
      version: currentVersion,
      description: 'Current working version',
      timestamp: new Date().toISOString(),
      author: 'You',
      status: 'current',
      comments: 0
    },
    {
      version: currentVersion - 1,
      description: 'Added hero section with call-to-action',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      author: 'Sarah Wilson',
      status: 'approved',
      comments: 3
    },
    {
      version: currentVersion - 2,
      description: 'Initial layout and color scheme',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      author: 'Mike Chen',
      status: 'archived',
      comments: 1
    }
  ].filter(v => v.version > 0)

  const handleCreateVersion = () => {
    if (!versionDescription.trim()) return
    
    onCreateVersion(versionDescription)
    setVersionDescription('')
    setShowCreateForm(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current':
        return <Clock className="w-4 h-4 text-blue-500" />
      case 'approved':
        return <Check className="w-4 h-4 text-green-500" />
      case 'archived':
        return <Tag className="w-4 h-4 text-gray-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return 'bg-blue-50 border-blue-200'
      case 'approved':
        return 'bg-green-50 border-green-200'
      case 'archived':
        return 'bg-gray-50 border-gray-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Just now'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Versions</h3>
        {!disabled && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-1"
          >
            <Plus className="w-3 h-3" />
            <span>Save Version</span>
          </button>
        )}
      </div>

      {/* Create Version Form */}
      {showCreateForm && (
        <div className="mb-4 p-3 border border-gray-200 rounded-lg bg-gray-50">
          <label className="block text-xs font-medium text-gray-700 mb-2">
            Version Description
          </label>
          <textarea
            value={versionDescription}
            onChange={(e) => setVersionDescription(e.target.value)}
            placeholder="Describe the changes in this version..."
            className="w-full p-2 text-sm border border-gray-300 rounded resize-none h-20 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="flex justify-end space-x-2 mt-2">
            <button
              onClick={() => {
                setShowCreateForm(false)
                setVersionDescription('')
              }}
              className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateVersion}
              disabled={!versionDescription.trim()}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save Version
            </button>
          </div>
        </div>
      )}

      {/* Version History */}
      <div className="space-y-3">
        {versionHistory.map((version) => (
          <div
            key={version.version}
            className={`p-3 border rounded-lg cursor-pointer hover:shadow-sm transition-shadow ${getStatusColor(version.status)}`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(version.status)}
                <span className="text-sm font-medium text-gray-900">
                  v{version.version}
                </span>
                {version.status === 'current' && (
                  <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">
                    Current
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {formatTimestamp(version.timestamp)}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 mb-2">
              {version.description}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">
                by {version.author}
              </span>
              
              <div className="flex items-center space-x-3">
                {version.comments > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <MessageSquare className="w-3 h-3" />
                    <span>{version.comments}</span>
                  </div>
                )}
                
                {version.status !== 'current' && !disabled && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      // TODO: Implement version restoration
                      console.log('Restore version:', version.version)
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    Restore
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Version Info */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div>• Versions are saved automatically</div>
          <div>• Each version captures the complete design state</div>
          <div>• Comments and approvals are tracked per version</div>
        </div>
      </div>
    </div>
  )
}

export default VersionControls