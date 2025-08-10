import React, { useState } from 'react'
import { MessageSquare, X, Check, Reply, MoreVertical } from 'lucide-react'

export interface Comment {
  id: string
  x: number
  y: number
  content: string
  author: string
  timestamp: string
  resolved?: boolean
  replies?: Array<{
    id: string
    content: string
    author: string
    timestamp: string
  }>
}

interface CommentPinProps {
  comment: Comment
  onUpdate: (updates: Partial<Comment>) => void
  onDelete: () => void
  readOnly?: boolean
}

const CommentPin: React.FC<CommentPinProps> = ({ comment, onUpdate, onDelete, readOnly }) => {
  const [showThread, setShowThread] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [showReplyForm, setShowReplyForm] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  const handleAddReply = () => {
    if (!replyText.trim()) return

    const newReply = {
      id: `reply-${Date.now()}`,
      content: replyText,
      author: 'Current User', // TODO: Get from auth context
      timestamp: new Date().toISOString()
    }

    onUpdate({
      replies: [...(comment.replies || []), newReply]
    })

    setReplyText('')
    setShowReplyForm(false)
  }

  const handleResolve = () => {
    onUpdate({ resolved: !comment.resolved })
    setShowMenu(false)
  }

  const handleDelete = () => {
    if (window.confirm('Delete this comment thread?')) {
      onDelete()
    }
    setShowMenu(false)
  }

  return (
    <div
      className="absolute z-20"
      style={{ 
        left: comment.x, 
        top: comment.y,
        transform: 'translate(-50%, -50%)'
      }}
    >
      {/* Comment Pin */}
      <button
        onClick={() => setShowThread(!showThread)}
        className={`
          ${comment.resolved 
            ? 'bg-green-200 border-green-300 hover:bg-green-300' 
            : 'bg-yellow-200 border-yellow-300 hover:bg-yellow-300'
          }
          border rounded-full w-7 h-7 flex items-center justify-center cursor-pointer 
          hover:scale-110 transition-all shadow-sm hover:shadow-md
        `}
        title={comment.resolved ? 'Resolved' : 'Active Comment'}
      >
        {comment.resolved ? (
          <Check className="w-4 h-4 text-green-700" />
        ) : (
          <MessageSquare className="w-4 h-4 text-yellow-700" />
        )}
        {(comment.replies?.length || 0) > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {comment.replies.length}
          </span>
        )}
      </button>

      {/* Comment Thread */}
      {showThread && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl min-w-[320px] max-w-md max-h-[400px] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">{comment.author}</span>
              {comment.resolved && (
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">
                  Resolved
                </span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {!readOnly && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="p-1 hover:bg-gray-200 rounded"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                  {showMenu && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10">
                      <button
                        onClick={handleResolve}
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 flex items-center space-x-2"
                      >
                        <Check className="w-3 h-3" />
                        <span>{comment.resolved ? 'Reopen' : 'Resolve'}</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-100 text-red-600 flex items-center space-x-2"
                      >
                        <X className="w-3 h-3" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                onClick={() => setShowThread(false)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="max-h-[250px] overflow-y-auto p-3 space-y-3">
            {/* Original Comment */}
            <div>
              <p className="text-sm text-gray-700">{comment.content}</p>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(comment.timestamp).toLocaleString()}
              </p>
            </div>

            {/* Replies */}
            {comment.replies?.map((reply) => (
              <div key={reply.id} className="pl-4 border-l-2 border-gray-200">
                <div className="text-xs font-medium text-gray-900">{reply.author}</div>
                <p className="text-sm text-gray-700 mt-1">{reply.content}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(reply.timestamp).toLocaleString()}
                </p>
              </div>
            ))}
          </div>

          {/* Reply Form */}
          {!readOnly && (
            <div className="border-t border-gray-100 p-3">
              {showReplyForm ? (
                <div className="space-y-2">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Type your reply..."
                    className="w-full p-2 text-sm border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={2}
                    autoFocus
                  />
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => {
                        setShowReplyForm(false)
                        setReplyText('')
                      }}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddReply}
                      disabled={!replyText.trim()}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      Reply
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowReplyForm(true)}
                  className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Reply className="w-4 h-4" />
                  <span>Reply</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CommentPin