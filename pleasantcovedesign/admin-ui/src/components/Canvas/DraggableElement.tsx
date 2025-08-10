import React, { useState, useCallback, useRef } from 'react'
import { useDrag } from 'react-dnd'
import { CanvasElement } from './DesignCanvas'
import { Move, RotateCcw, Trash2, Lock, Unlock, MessageSquare } from 'lucide-react'
import ElementCommentBadge from './ElementCommentBadge'

interface DraggableElementProps {
  element: CanvasElement
  isSelected: boolean
  onUpdate: (elementId: string, updates: Partial<CanvasElement>) => void
  onSelect: (elementId: string | null) => void
  onDelete?: (elementId: string) => void
  showComments: boolean
  readOnly?: boolean
  viewMode: 'design' | 'preview' | 'presentation'
}

const DraggableElement: React.FC<DraggableElementProps> = ({
  element,
  isSelected,
  onUpdate,
  onSelect,
  onDelete,
  showComments,
  readOnly = false,
  viewMode
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')
  const elementRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: 'canvas-element',
    item: { id: element.id, type: element.type },
    canDrag: !readOnly && !element.locked && viewMode === 'design',
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [element.id, element.type, readOnly, element.locked, viewMode])

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (viewMode !== 'design') return
    onSelect(element.id)
  }, [element.id, onSelect, viewMode])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (readOnly || element.locked || viewMode !== 'design') return
    
    if (['text', 'heading', 'paragraph', 'button'].includes(element.type)) {
      setIsEditing(true)
      setEditValue(element.content.text || '')
    } else if (element.type === 'image') {
      fileInputRef.current?.click()
    }
  }, [element.type, element.content.text, readOnly, element.locked, viewMode])

  const handleEditSubmit = useCallback(() => {
    if (['text', 'heading', 'paragraph', 'button'].includes(element.type)) {
      onUpdate(element.id, {
        content: { ...element.content, text: editValue }
      })
    }
    setIsEditing(false)
  }, [element.id, element.type, element.content, editValue, onUpdate])

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEditSubmit()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditValue(element.content.text || '')
    }
  }, [handleEditSubmit, element.content.text])

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        onUpdate(element.id, {
          content: { ...element.content, src: event.target?.result as string }
        })
      }
      reader.readAsDataURL(file)
    }
  }, [element.id, element.content, onUpdate])

  const handleResize = useCallback((direction: string, delta: { x: number; y: number }) => {
    if (readOnly || element.locked) return

    let newWidth = element.width
    let newHeight = element.height
    let newX = element.x
    let newY = element.y

    switch (direction) {
      case 'se': // Southeast
        newWidth = Math.max(20, element.width + delta.x)
        newHeight = Math.max(20, element.height + delta.y)
        break
      case 'sw': // Southwest
        newWidth = Math.max(20, element.width - delta.x)
        newHeight = Math.max(20, element.height + delta.y)
        newX = element.x + delta.x
        break
      case 'ne': // Northeast
        newWidth = Math.max(20, element.width + delta.x)
        newHeight = Math.max(20, element.height - delta.y)
        newY = element.y + delta.y
        break
      case 'nw': // Northwest
        newWidth = Math.max(20, element.width - delta.x)
        newHeight = Math.max(20, element.height - delta.y)
        newX = element.x + delta.x
        newY = element.y + delta.y
        break
    }

    onUpdate(element.id, { 
      width: newWidth, 
      height: newHeight, 
      x: newX, 
      y: newY 
    })
  }, [element, onUpdate, readOnly])

  const renderElementContent = () => {
    switch (element.type) {
      case 'text':
      case 'heading':
      case 'paragraph':
        if (isEditing) {
          return (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleEditSubmit}
              onKeyDown={handleKeyPress}
              className="w-full h-full resize-none border-none outline-none bg-transparent"
              style={{
                fontSize: element.content.fontSize || 16,
                fontWeight: element.content.fontWeight || 'normal',
                fontFamily: element.content.fontFamily || 'Inter',
                color: element.style.color
              }}
              autoFocus
            />
          )
        }
        return (
          <div
            className="w-full h-full flex items-center"
            style={{
              fontSize: element.content.fontSize || 16,
              fontWeight: element.content.fontWeight || 'normal',
              fontFamily: element.content.fontFamily || 'Inter',
              color: element.style.color,
              padding: element.style.padding || 8
            }}
          >
            {element.content.text || 'Click to edit'}
          </div>
        )

      case 'image':
        return (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              {element.content.src ? (
                <img 
                  src={element.content.src} 
                  alt={element.content.alt || ''} 
                  className="w-full h-full object-contain"
                  style={{ maxWidth: '100%', maxHeight: '100%' }}
                />
              ) : (
                <div className="text-center text-gray-400 p-4">
                  <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <div className="mt-2 text-sm font-medium">Click to upload</div>
                  <div className="text-xs">or drag and drop</div>
                </div>
              )}
            </div>
          </>
        )

      case 'rectangle':
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: element.content.fillColor || '#3B82F6',
              borderRadius: element.style.borderRadius || 4
            }}
          />
        )
      
      case 'circle':
        return (
          <div
            className="w-full h-full rounded-full"
            style={{
              backgroundColor: element.content.fillColor || '#3B82F6'
            }}
          />
        )
      
      case 'triangle':
        return (
          <div
            className="w-full h-full"
            style={{
              backgroundColor: element.content.fillColor || '#3B82F6',
              clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)'
            }}
          />
        )
        
      case 'line':
        return (
          <div 
            className="w-full h-full flex items-center justify-center"
          >
            <div
              style={{
                width: '100%',
                height: `${element.content.strokeWidth || 2}px`,
                backgroundColor: element.content.strokeColor || '#9CA3AF'
              }}
            />
          </div>
        )

      case 'button':
        return (
          <button
            className="w-full h-full bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors px-4"
            style={{
              fontSize: element.content.fontSize || 14,
              borderRadius: element.style.borderRadius || 4
            }}
          >
            {element.content.text || 'Button'}
          </button>
        )
        
      case 'input':
        return (
          <div className="w-full h-full flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">
              {element.content.label || 'Input Label'}
            </label>
            <div 
              className="flex-1 border border-gray-300 rounded px-3 flex items-center bg-white"
              style={{
                borderRadius: element.style.borderRadius || 4
              }}
            >
              <span className="text-gray-400 text-sm">
                {element.content.placeholder || 'Enter text...'}
              </span>
            </div>
          </div>
        )
        
      case 'checkbox':
        return (
          <div className="w-full h-full flex items-center">
            <div className="w-4 h-4 border border-gray-300 rounded bg-white mr-2 flex-shrink-0" />
            <span className="text-sm text-gray-700">
              {element.content.label || 'Checkbox Label'}
            </span>
          </div>
        )

      case 'card':
        return (
          <div
            className="w-full h-full bg-white border border-gray-200 rounded-lg p-4"
            style={{
              borderRadius: element.style.borderRadius || 8
            }}
          >
            <div className="font-medium text-gray-900">{element.content.title || 'Card Title'}</div>
            <div className="text-sm text-gray-600 mt-2">{element.content.description || 'Card content goes here...'}</div>
          </div>
        )

      case 'form':
        return (
          <div className="w-full h-full bg-white border border-gray-200 rounded-lg p-4">
            <div className="space-y-2">
              <div className="h-8 bg-gray-100 rounded" />
              <div className="h-8 bg-gray-100 rounded" />
              <button className="h-8 bg-blue-600 text-white text-sm rounded w-full">
                {element.content.submitText || 'Submit'}
              </button>
            </div>
          </div>
        )

      case 'mobile-frame':
        return (
          <div className="w-full h-full bg-gray-900 rounded-3xl p-4 flex flex-col">
            <div className="flex-1 bg-white rounded-2xl"></div>
            <div className="h-4 mt-2 flex justify-center">
              <div className="w-20 h-1 bg-gray-700 rounded-full"></div>
            </div>
          </div>
        )

      case 'desktop-frame':
        return (
          <div className="w-full h-full bg-gray-200 rounded-lg flex flex-col">
            <div className="h-8 bg-gray-300 rounded-t-lg flex items-center px-2 space-x-1">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex-1 bg-white"></div>
          </div>
        )

      default:
        return (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-500 text-sm">
            {element.type}
          </div>
        )
    }
  }

  // Combine drag ref with element ref
  const combinedRef = useCallback((node: HTMLDivElement) => {
    drag(node)
    elementRef.current = node
  }, [drag])

  return (
    <>
      {/* Main Element */}
      <div
        ref={dragPreview}
        className={`
          absolute cursor-move select-none group
          ${isDragging ? 'opacity-50' : ''}
          ${isSelected ? 'z-10' : 'z-0'}
          ${viewMode === 'design' ? 'hover:ring-2 hover:ring-blue-300' : ''}
          ${element.locked ? 'cursor-not-allowed' : ''}
        `}
        style={{
          left: element.x,
          top: element.y,
          width: element.width,
          height: element.height,
          transform: element.style.transform || 'none'
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Element Content */}
        <div
          ref={combinedRef}
          className={`
            w-full h-full relative
            ${isSelected && viewMode === 'design' ? 'ring-2 ring-blue-500' : ''}
          `}
          style={{
            backgroundColor: element.style.backgroundColor,
            borderColor: element.style.borderColor,
            borderWidth: element.style.borderWidth,
            borderRadius: element.style.borderRadius,
            borderStyle: 'solid'
          }}
        >
          {renderElementContent()}

          {/* Comment Badge */}
          {showComments && element.comments && element.comments.length > 0 && (
            <ElementCommentBadge 
              comments={element.comments}
              position="top-right"
              onClick={() => {
                // Highlight this element's comments in the sidebar
                const event = new CustomEvent('highlight-element-comments', { 
                  detail: { elementId: element.id } 
                });
                document.dispatchEvent(event);
              }}
              className="canvas-comment-badge"
            />
          )}
        </div>

        {/* Selection Handles */}
        {isSelected && viewMode === 'design' && !readOnly && !element.locked && (
          <>
            {/* Corner Resize Handles */}
            {['nw', 'ne', 'sw', 'se'].map((direction) => (
              <div
                key={direction}
                className={`
                  absolute w-3 h-3 bg-blue-500 border border-white rounded-sm cursor-${direction}-resize
                  ${direction.includes('n') ? '-top-1' : '-bottom-1'}
                  ${direction.includes('w') ? '-left-1' : '-right-1'}
                `}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  
                  const startX = e.clientX
                  const startY = e.clientY
                  
                  const handleMouseMove = (moveEvent: MouseEvent) => {
                    const deltaX = moveEvent.clientX - startX
                    const deltaY = moveEvent.clientY - startY
                    handleResize(direction, { x: deltaX, y: deltaY })
                  }
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove)
                    document.removeEventListener('mouseup', handleMouseUp)
                  }
                  
                  document.addEventListener('mousemove', handleMouseMove)
                  document.addEventListener('mouseup', handleMouseUp)
                }}
              />
            ))}

            {/* Element Toolbar */}
            <div className="absolute -top-10 left-0 bg-gray-900 text-white px-2 py-1 rounded text-xs flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <span className="capitalize">{element.type}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onUpdate(element.id, { locked: !element.locked })
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                  title={element.locked ? 'Unlock' : 'Lock'}
                >
                  {element.locked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    if (onDelete && window.confirm('Delete this element?')) {
                      onDelete(element.id)
                    }
                  }}
                  className="p-1 hover:bg-gray-700 rounded text-red-400"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          </>
        )}

        {/* Comments Indicator */}
        {showComments && element.comments && element.comments.length > 0 && (
          <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
            {element.comments.length}
          </div>
        )}

        {/* Lock Indicator */}
        {element.locked && viewMode === 'design' && (
          <div className="absolute top-1 right-1 bg-gray-800 text-white rounded p-1">
            <Lock className="w-3 h-3" />
          </div>
        )}
      </div>
    </>
  )
}

export default DraggableElement