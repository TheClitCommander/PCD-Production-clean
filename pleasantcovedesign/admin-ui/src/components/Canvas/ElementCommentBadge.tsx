import React, { useState } from 'react'
import { MessageSquare, AlertCircle, Check } from 'lucide-react'
import { Comment } from './CommentPin'

interface ElementCommentBadgeProps {
  comments: Comment[]
  onClick: () => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  className?: string
}

const ElementCommentBadge: React.FC<ElementCommentBadgeProps> = ({
  comments,
  onClick,
  position = 'top-right',
  className = ''
}) => {
  const [isHovered, setIsHovered] = useState(false)
  
  // Count unresolved comments
  const unresolvedCount = comments.filter(c => !c.resolved).length
  
  // Determine if there are any unresolved comments
  const hasUnresolved = unresolvedCount > 0
  
  // Position classes
  const positionClasses = {
    'top-right': 'top-0 right-0 -mt-2 -mr-2',
    'top-left': 'top-0 left-0 -mt-2 -ml-2',
    'bottom-right': 'bottom-0 right-0 -mb-2 -mr-2',
    'bottom-left': 'bottom-0 left-0 -mb-2 -ml-2'
  }

  return (
    <div 
      className={`absolute z-30 element-comment-badge ${positionClasses[position]} ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={onClick}
        className={`
          w-6 h-6 flex items-center justify-center rounded-full shadow-sm
          transition-all duration-200 ease-in-out
          ${hasUnresolved 
            ? 'bg-amber-100 border border-amber-300 text-amber-700' 
            : 'bg-green-100 border border-green-300 text-green-700'}
          ${isHovered ? 'scale-110 shadow-md' : ''}
        `}
      >
        {hasUnresolved ? (
          <AlertCircle className="w-3 h-3" />
        ) : (
          <Check className="w-3 h-3" />
        )}
      </button>
      
      {/* Count badge if more than 1 comment */}
      {comments.length > 1 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-500 text-white text-[10px] flex items-center justify-center rounded-full">
          {comments.length}
        </span>
      )}

      {/* Quick preview on hover */}
      {isHovered && (
        <div className="absolute left-full top-0 ml-2 bg-white border border-gray-200 rounded shadow-md p-2 min-w-[200px] max-w-[250px] z-40">
          <div className="font-medium text-xs mb-1 flex items-center">
            <MessageSquare className="w-3 h-3 mr-1" />
            {comments.length} {comments.length === 1 ? 'Comment' : 'Comments'}
          </div>
          <div className="max-h-[120px] overflow-y-auto">
            {comments.slice(0, 2).map((comment, i) => (
              <div key={i} className="text-xs border-t first:border-t-0 border-gray-100 pt-1 first:pt-0 mt-1 first:mt-0">
                <div className="flex items-center gap-1">
                  {comment.resolved ? (
                    <Check className="w-3 h-3 text-green-600" />
                  ) : (
                    <AlertCircle className="w-3 h-3 text-amber-600" />
                  )}
                  <span className="font-medium">{comment.author}</span>
                </div>
                <p className="text-gray-700 truncate mt-0.5">{comment.content}</p>
              </div>
            ))}
            {comments.length > 2 && (
              <div className="text-xs text-blue-600 mt-1 pt-1 border-t border-gray-100">
                + {comments.length - 2} more
              </div>
            )}
          </div>
          <div className="mt-1 pt-1 border-t border-gray-100 text-[10px] text-gray-500 text-center">
            Click to view all
          </div>
        </div>
      )}
    </div>
  )
}

export default ElementCommentBadge