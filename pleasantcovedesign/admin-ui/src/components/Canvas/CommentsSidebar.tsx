import React, { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, MessageSquare, Check, AlertCircle } from 'lucide-react'
import { Comment } from './CommentPin'
import { CanvasElement } from './DesignCanvas'

interface CommentsSidebarProps {
  canvasComments: Comment[]
  elementComments: Array<{
    elementId: string;
    element: CanvasElement;
    comments: Comment[];
  }>
  onCommentSelect: (commentId: string, elementId?: string) => void
  onCommentUpdate: (comment: Comment, elementId?: string, updates: Partial<Comment>) => void
  onCommentDelete: (commentId: string, elementId?: string) => void
  readOnly?: boolean
}

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({
  canvasComments,
  elementComments,
  onCommentSelect,
  onCommentUpdate,
  onCommentDelete,
  readOnly = false
}) => {
  const [isExpanded, setIsExpanded] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unresolved' | 'resolved'>('all')
  const [selectedComment, setSelectedComment] = useState<string | null>(null)

  // Count total comments
  const totalComments = canvasComments.length + 
    elementComments.reduce((acc, elem) => acc + elem.comments.length, 0)
  
  // Count unresolved comments
  const unresolvedComments = canvasComments.filter(c => !c.resolved).length +
    elementComments.reduce(
      (acc, elem) => acc + elem.comments.filter(c => !c.resolved).length, 
      0
    )

  // Combined and filtered comments list
  const filteredComments = [
    // Canvas comments
    ...canvasComments
      .filter(comment => {
        if (filter === 'all') return true
        if (filter === 'resolved') return comment.resolved
        return !comment.resolved
      })
      .map(comment => ({ 
        ...comment, 
        elementId: undefined,
        elementName: 'Canvas'
      })),
    // Element comments
    ...elementComments.flatMap(elem => 
      elem.comments
        .filter(comment => {
          if (filter === 'all') return true
          if (filter === 'resolved') return comment.resolved
          return !comment.resolved
        })
        .map(comment => ({ 
          ...comment, 
          elementId: elem.elementId,
          elementName: getElementName(elem.element)
        }))
    )
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  // Helper to get a user-friendly element name
  function getElementName(element: CanvasElement): string {
    switch(element.type) {
      case 'text': 
        return `Text: "${element.content.text?.substring(0, 20) || ''}${element.content.text?.length > 20 ? '...' : ''}"` 
      case 'image': 
        return 'Image'
      case 'button': 
        return `Button: "${element.content.text || ''}"`
      default: 
        return element.type.charAt(0).toUpperCase() + element.type.slice(1)
    }
  }

  // Handle click on a comment
  const handleCommentClick = (commentId: string, elementId?: string) => {
    setSelectedComment(commentId)
    onCommentSelect(commentId, elementId)
  }

  // Handle resolving a comment
  const handleResolve = (comment: Comment, elementId?: string) => {
    onCommentUpdate(comment, elementId, { resolved: !comment.resolved })
  }

  // Handle deleting a comment
  const handleDelete = (commentId: string, elementId?: string) => {
    if (window.confirm('Delete this comment?')) {
      onCommentDelete(commentId, elementId)
      if (selectedComment === commentId) {
        setSelectedComment(null)
      }
    }
  }

  return (
    <div className={`comments-sidebar absolute top-0 right-0 bottom-0 flex transform transition-all duration-300 z-20 ${
      isExpanded ? 'translate-x-0' : 'translate-x-[calc(100%-24px)]'
    }`}>
      {/* Collapse/Expand Button */}
      <div 
        className="w-6 bg-white border-l border-y border-gray-200 flex items-center justify-center cursor-pointer hover:bg-gray-50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded 
          ? <ChevronRight className="w-4 h-4 text-gray-500" /> 
          : <ChevronLeft className="w-4 h-4 text-gray-500" />
        }
      </div>

      {/* Sidebar Content */}
      <div className="bg-white border-l border-gray-200 flex flex-col w-80 h-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 py-3 px-4 flex-shrink-0">
          <div className="flex items-center">
            <MessageSquare className="w-5 h-5 text-blue-500 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Comments</h3>
            <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
              {unresolvedComments}/{totalComments}
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex border-b border-gray-200 px-2 py-2 space-x-1 flex-shrink-0">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-sm rounded-full ${
              filter === 'all' 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unresolved')}
            className={`px-3 py-1 text-sm rounded-full flex items-center ${
              filter === 'unresolved' 
                ? 'bg-amber-100 text-amber-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <AlertCircle className="w-3 h-3 mr-1" />
            Active
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-3 py-1 text-sm rounded-full flex items-center ${
              filter === 'resolved' 
                ? 'bg-green-100 text-green-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Check className="w-3 h-3 mr-1" />
            Resolved
          </button>
        </div>

        {/* Comments List */}
        <div className="flex-1 overflow-y-auto">
          {filteredComments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <MessageSquare className="w-12 h-12 text-gray-300 mb-2" />
              <p className="text-sm">No {filter !== 'all' ? filter : ''} comments yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredComments.map((comment) => (
                <div 
                  key={comment.id}
                  className={`p-4 cursor-pointer hover:bg-gray-50 ${
                    selectedComment === comment.id ? 'bg-blue-50' : ''
                  }`}
                  onClick={() => handleCommentClick(comment.id, comment.elementId)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center">
                      <span className={`flex h-6 w-6 items-center justify-center rounded-full mr-2 ${
                        comment.resolved
                          ? 'bg-green-100 text-green-700'
                          : 'bg-amber-100 text-amber-700'
                      }`}>
                        {comment.resolved ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <AlertCircle className="h-3 w-3" />
                        )}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {comment.author}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(comment.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="mt-1">
                    <p className="text-sm text-gray-700">{comment.content}</p>
                  </div>
                  {comment.elementName && (
                    <div className="mt-1 flex items-center">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {comment.elementName}
                      </span>
                    </div>
                  )}
                  {(comment.replies?.length || 0) > 0 && (
                    <div className="mt-2 text-xs text-blue-600">
                      {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                    </div>
                  )}
                  {!readOnly && (
                    <div className="mt-2 flex justify-end space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleResolve(comment, comment.elementId);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          comment.resolved
                            ? 'text-green-700 hover:bg-green-50'
                            : 'text-amber-700 hover:bg-amber-50'
                        }`}
                      >
                        {comment.resolved ? 'Reopen' : 'Resolve'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(comment.id, comment.elementId);
                        }}
                        className="px-2 py-1 text-xs text-red-600 rounded hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CommentsSidebar