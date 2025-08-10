import React, { forwardRef, useCallback, useState, useRef, useEffect } from 'react'
import { useDrop } from 'react-dnd'
import DraggableElement from './DraggableElement'
import { CanvasState, CanvasElement } from './DesignCanvas'
import { MessageSquare, Plus, Home, ZoomIn, ZoomOut, MousePointer } from 'lucide-react'
import CommentPin, { Comment } from './CommentPin'
import CommentsSidebar from './CommentsSidebar'
import SimpleTour from './SimpleTour'

interface CanvasWorkspaceProps {
  state: CanvasState
  showGrid: boolean
  showComments: boolean
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void
  onElementSelect: (elementId: string | null) => void
  onElementAdd: (elementType: string, position: { x: number; y: number }) => void
  onElementDelete?: (elementId: string) => void
  onZoomChange?: (zoom: number) => void
  readOnly?: boolean
}

// Define the component as a separate function to avoid syntax issues
function CanvasWorkspaceInner(
  props: CanvasWorkspaceProps,
  ref: React.ForwardedRef<HTMLDivElement>
) {
  const {
    state,
    showGrid,
    showComments,
    onElementUpdate,
    onElementSelect,
    onElementAdd,
    onElementDelete,
    onZoomChange,
    readOnly = false
  } = props;

  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentPosition, setCommentPosition] = useState({ x: 0, y: 0 })
  const [newComment, setNewComment] = useState('')
  const [isPanning, setIsPanning] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [commentMode, setCommentMode] = useState(false)
  const [showCommentsSidebar, setShowCommentsSidebar] = useState(true)
  const [canvasComments, setCanvasComments] = useState<Comment[]>([])
  const [showInlineCommentInput, setShowInlineCommentInput] = useState(false)
  const [selectedCommentId, setSelectedCommentId] = useState<string | null>(null)
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null)
  const [showTour, setShowTour] = useState(true) // Always show tour initially
  
  // Force tour to show for debugging
  useEffect(() => {
    console.log('Setting up tour')
    setShowTour(true)
  }, [])
  const canvasRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in input fields
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) {
        return;
      }
      
      // Deselect and exit comment mode on Escape
      if (e.key === 'Escape') {
        onElementSelect(null)
        setCommentMode(false)
        setShowInlineCommentInput(false)
        setShowCommentForm(false)
      }
      
      // Toggle comment mode with 'C' key
      if (e.key === 'c' && !e.ctrlKey && !e.metaKey && !readOnly && 
          !showInlineCommentInput && !showCommentForm) {
        setCommentMode(prev => !prev)
        
        // Visual feedback for mode change
        const cursorElement = document.getElementById('canvas-cursor-mode');
        if (cursorElement) {
          cursorElement.classList.add('pulse-animation');
          setTimeout(() => cursorElement.classList.remove('pulse-animation'), 500);
        }
      }

      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && 
          state.selectedElement && !readOnly) {
        onElementDelete?.(state.selectedElement)
      }
      
      // Toggle comments sidebar with 'S' key
      if (e.key === 's' && !e.ctrlKey && !e.metaKey && showComments) {
        setShowCommentsSidebar(prev => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.selectedElement, readOnly, showInlineCommentInput, showCommentForm, onElementDelete, onElementSelect, showComments])

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['canvas-element'],
    drop: (item: any, monitor) => {
      const delta = monitor.getDifferenceFromInitialOffset()
      if (delta && item.id) {
        const element = state.elements.find(el => el.id === item.id)
        if (element) {
          let newX = element.x + delta.x
          let newY = element.y + delta.y

          // Snap to grid if enabled
          if (state.snapToGrid) {
            newX = Math.round(newX / state.gridSize) * state.gridSize
            newY = Math.round(newY / state.gridSize) * state.gridSize
          }

          // Keep within canvas bounds
          newX = Math.max(0, Math.min(newX, 1200 - element.width))
          newY = Math.max(0, Math.min(newY, 800 - element.height))

          onElementUpdate(item.id, { x: newX, y: newY })
        }
      }
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  }), [state.elements, state.gridSize, state.snapToGrid, onElementUpdate])

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left) / state.zoom
    const y = (e.clientY - rect.top) / state.zoom

    // If in comment mode, show inline comment input
    if (commentMode && !readOnly) {
      setCommentPosition({ x, y })
      setShowInlineCommentInput(true)
      setTimeout(() => {
        commentInputRef.current?.focus()
      }, 10)
      return
    }

    // Check if clicking on an element
    const clickedElement = state.elements.find(element => 
      x >= element.x && 
      x <= element.x + element.width &&
      y >= element.y && 
      y <= element.y + element.height
    )

    if (clickedElement) {
      onElementSelect(clickedElement.id)
      
      // If right-click on element, show comment input anchored to the element
      if (e.button === 2 && !readOnly) {
        e.preventDefault()
        setCommentPosition({ 
          x: clickedElement.x + clickedElement.width / 2, 
          y: clickedElement.y + clickedElement.height / 2 
        })
        setShowInlineCommentInput(true)
        setTimeout(() => {
          commentInputRef.current?.focus()
        }, 10)
      }
    } else {
      onElementSelect(null)
    }
  }, [state.elements, state.zoom, onElementSelect, commentMode, readOnly])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return
    
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left) / state.zoom
    const y = (e.clientY - rect.top) / state.zoom

    // Add a text element at double-click position
    onElementAdd('text', { x, y })
  }, [state.zoom, onElementAdd, readOnly])

  const handleRightClick = useCallback((e: React.MouseEvent) => {
    if (readOnly) return
    
    e.preventDefault()
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return

    const x = (e.clientX - rect.left) / state.zoom
    const y = (e.clientY - rect.top) / state.zoom

    setCommentPosition({ x, y })
    setShowCommentForm(true)
  }, [state.zoom, readOnly])

  const handleAddComment = useCallback(() => {
    if (!newComment.trim()) return

    // Find element at comment position or add as canvas comment
    const elementAtPosition = state.elements.find(element => 
      commentPosition.x >= element.x && 
      commentPosition.x <= element.x + element.width &&
      commentPosition.y >= element.y && 
      commentPosition.y <= element.y + element.height
    )

    const comment: Comment = {
      id: `comment-${Date.now()}`,
      x: commentPosition.x,
      y: commentPosition.y,
      content: newComment,
      author: 'Current User', // TODO: Get from auth context
      timestamp: new Date().toISOString(),
      resolved: false,
      replies: []
    }

    if (elementAtPosition) {
      const existingComments = elementAtPosition.comments || []
      onElementUpdate(elementAtPosition.id, {
        comments: [...existingComments, comment]
      })
    } else {
      // Add to canvas comments
      setCanvasComments(prev => [...prev, comment])
    }

    setNewComment('')
    setShowCommentForm(false)
    setShowInlineCommentInput(false)
    setCommentMode(false) // Exit comment mode after adding
  }, [newComment, commentPosition, state.elements, onElementUpdate])

  // Handle selecting a comment from the sidebar
  const handleCommentSelect = useCallback((commentId: string, elementId?: string) => {
    setSelectedCommentId(commentId)
    setHighlightedElementId(elementId || null)
    
    // If comment is in an element, highlight that element
    if (elementId) {
      onElementSelect(elementId)
    }

    // Find the comment position to center the view
    if (elementId) {
      const element = state.elements.find(el => el.id === elementId)
      const comment = element?.comments?.find(c => c.id === commentId)
      if (element && comment) {
        // TODO: Center view on comment position
      }
    } else {
      const comment = canvasComments.find(c => c.id === commentId)
      if (comment) {
        // TODO: Center view on comment position
      }
    }
  }, [state.elements, onElementSelect, canvasComments])

  // Canvas panning handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Start panning with middle mouse button or space + left click
    if (e.button === 1 || (e.button === 0 && e.shiftKey)) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
    }
  }, [panOffset])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault()
      setPanOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      })
    }
  }, [isPanning, panStart])

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      e.preventDefault()
      setIsPanning(false)
    }
  }, [isPanning])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Pan with shift + scroll or use normal scroll
    if (e.shiftKey) {
      e.preventDefault()
      setPanOffset(prev => ({
        x: prev.x - e.deltaY,
        y: prev.y - e.deltaX
      }))
    } else {
      // Regular scrolling for zoom or vertical scroll
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        // Zoom functionality can be added here
      }
    }
  }, [])

  // Get element comments for sidebar
  const elementComments = state.elements.map(element => ({
    elementId: element.id,
    element,
    comments: element.comments || []
  })).filter(item => item.comments.length > 0)

  // Combine refs
  const combinedRef = useCallback((node: HTMLDivElement) => {
    drop(node)
    canvasRef.current = node
    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }, [drop, ref])

  return (
          <div 
        ref={containerRef}
        className="relative h-full overflow-hidden bg-gray-100 canvas-container"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* Instructions Panel - Removed as requested */}
      {!readOnly && commentMode && (
        <div className="absolute top-4 left-4 bg-yellow-100 border border-yellow-300 rounded-lg px-3 py-2 text-xs text-yellow-800 z-10">
          <strong>Comment Mode Active</strong>
        </div>
      )}

      {/* Canvas Container */}
      <div 
        ref={combinedRef}
        className={`
          absolute inset-0 overflow-visible
          ${isPanning ? 'cursor-grabbing' : commentMode ? 'cursor-text' : 'cursor-default'}
          ${isOver ? 'bg-blue-50' : ''}
        `}
        style={{ 
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${state.zoom})`,
          transformOrigin: 'center'
        }}
        onClick={handleCanvasClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
      >
        {/* Grid Background */}
        {showGrid && (
          <div 
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `
                linear-gradient(to right, #e5e7eb 1px, transparent 1px),
                linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)
              `,
              backgroundSize: `${state.gridSize}px ${state.gridSize}px`
            }}
          />
        )}

        {/* Canvas Content Area */}
        <div 
          className="relative bg-white shadow-lg border border-gray-300"
          style={{ 
            width: 1200, 
            height: 800,
            margin: '40px auto'
          }}
        >
          {/* Canvas Elements */}
          {state.elements.map((element) => (
            <DraggableElement
              key={element.id}
              element={element}
              isSelected={state.selectedElement === element.id}
              onUpdate={onElementUpdate}
              onSelect={onElementSelect}
              onDelete={onElementDelete}
              showComments={showComments}
              readOnly={readOnly}
              viewMode={state.viewMode}
            />
          ))}

          {/* Element Comments */}
          {showComments && state.elements.map((element) => 
            element.comments?.map((comment) => (
              <CommentPin
                key={comment.id}
                comment={comment}
                onUpdate={(updates) => {
                  const updatedComments = element.comments?.map(c => 
                    c.id === comment.id ? { ...c, ...updates } : c
                  )
                  onElementUpdate(element.id, { comments: updatedComments })
                }}
                onDelete={() => {
                  const filteredComments = element.comments?.filter(c => c.id !== comment.id)
                  onElementUpdate(element.id, { comments: filteredComments })
                }}
                readOnly={readOnly}
              />
            ))
          )}

          {/* Canvas Comments (not attached to elements) */}
          {showComments && canvasComments.map((comment) => (
            <CommentPin
              key={comment.id}
              comment={comment}
              onUpdate={(updates) => {
                setCanvasComments(prev => prev.map(c => 
                  c.id === comment.id ? { ...c, ...updates } : c
                ))
              }}
              onDelete={() => {
                setCanvasComments(prev => prev.filter(c => c.id !== comment.id))
              }}
              readOnly={readOnly}
            />
          ))}

          {/* Inline Comment Input */}
          {showInlineCommentInput && (
            <div 
              className="absolute z-30 min-w-[250px]"
              style={{
                left: commentPosition.x,
                top: commentPosition.y,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="bg-white rounded-lg shadow-lg border border-yellow-300 p-3">
                <textarea
                  ref={commentInputRef}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add your comment..."
                  className="w-full text-sm border border-gray-200 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleAddComment()
                    }
                    if (e.key === 'Escape') {
                      setShowInlineCommentInput(false)
                      setNewComment('')
                    }
                  }}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">Press Enter to submit</span>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => {
                        setShowInlineCommentInput(false)
                        setNewComment('')
                      }}
                      className="px-2 py-1 text-xs text-gray-600 hover:text-gray-800 rounded"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50"
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
              <div className="w-2 h-2 bg-yellow-300 rotate-45 absolute left-1/2 top-full -translate-x-1/2 -mt-1"></div>
            </div>
          )}

          {/* Empty State */}
          {state.elements.length === 0 && !readOnly && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-gray-500">
                <Plus className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">Start Creating</h3>
                <p className="text-sm mb-4">
                  Add elements from the toolbox or double-click to add text
                </p>
                <div className="space-y-2 text-xs">
                  <p>• Double-click to add text</p>
                  <p>• Press C to enter comment mode</p>
                  <p>• Drag elements from the toolbox</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Comments Sidebar */}
      {showComments && (
        <CommentsSidebar
          canvasComments={canvasComments}
          elementComments={elementComments}
          onCommentSelect={handleCommentSelect}
          onCommentUpdate={(comment, elementId, updates) => {
            if (elementId) {
              const element = state.elements.find(el => el.id === elementId)
              if (element && element.comments) {
                const updatedComments = element.comments.map(c => 
                  c.id === comment.id ? { ...c, ...updates } : c
                )
                onElementUpdate(elementId, { comments: updatedComments })
              }
            } else {
              setCanvasComments(prev => prev.map(c => 
                c.id === comment.id ? { ...c, ...updates } : c
              ))
            }
          }}
          onCommentDelete={(commentId, elementId) => {
            if (elementId) {
              const element = state.elements.find(el => el.id === elementId)
              if (element && element.comments) {
                const filteredComments = element.comments.filter(c => c.id !== commentId)
                onElementUpdate(elementId, { comments: filteredComments })
              }
            } else {
              setCanvasComments(prev => prev.filter(c => c.id !== commentId))
            }
          }}
          readOnly={readOnly}
        />
      )}

      {/* Comment Form Modal */}
      {showCommentForm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" 
          onClick={() => {
            setShowCommentForm(false)
            setNewComment('')
            setCommentMode(false)
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 w-96 max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center mb-4">
              <MessageSquare className="w-5 h-5 mr-2 text-yellow-600" />
              <h3 className="text-lg font-medium">Add Comment</h3>
            </div>
            <div className="mb-2 text-sm text-gray-600">
              Position: ({Math.round(commentPosition.x)}, {Math.round(commentPosition.y)})
            </div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type your comment..."
              className="w-full h-32 p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.ctrlKey) {
                  handleAddComment()
                }
              }}
            />
            <div className="text-xs text-gray-500 mt-1">Press Ctrl+Enter to submit</div>
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowCommentForm(false)
                  setNewComment('')
                  setCommentMode(false)
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Add Comment
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Persistent Comments Sidebar */}
      {showComments && showCommentsSidebar && (
        <CommentsSidebar
          canvasComments={canvasComments}
          elementComments={state.elements
            .filter(elem => elem.comments && elem.comments.length > 0)
            .map(elem => ({
              elementId: elem.id,
              element: elem,
              comments: elem.comments || []
            }))
          }
          onCommentSelect={(commentId, elementId) => {
            setSelectedCommentId(commentId)
            if (elementId) {
              setHighlightedElementId(elementId)
              onElementSelect(elementId)
            }
          }}
          onCommentUpdate={(comment, elementId, updates) => {
            if (elementId) {
              const element = state.elements.find(el => el.id === elementId)
              if (element && element.comments) {
                const updatedComments = element.comments.map(c => 
                  c.id === comment.id ? { ...c, ...updates } : c
                )
                onElementUpdate(elementId, { comments: updatedComments })
              }
            } else {
              setCanvasComments(prev => prev.map(c => 
                c.id === comment.id ? { ...c, ...updates } : c
              ))
            }
          }}
          onCommentDelete={(commentId, elementId) => {
            if (elementId) {
              const element = state.elements.find(el => el.id === elementId)
              if (element && element.comments) {
                const updatedComments = element.comments.filter(c => c.id !== commentId)
                onElementUpdate(elementId, { comments: updatedComments })
              }
            } else {
              setCanvasComments(prev => prev.filter(c => c.id !== commentId))
            }
          }}
          readOnly={readOnly}
        />
      )}
      
      {/* View Controls */}
      <div className="absolute bottom-4 right-4 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center space-x-2">
        {!readOnly && (
          <>
            <button
              id="comment-mode-button"
              onClick={() => setCommentMode(!commentMode)}
              className={`p-2 rounded transition-colors relative ${
                commentMode 
                  ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-2 border-yellow-400' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title={commentMode ? 'Exit Comment Mode (C)' : 'Add Comments (C)'}
            >
              <MessageSquare id="canvas-cursor-mode" className={`w-4 h-4 ${commentMode ? 'animate-pulse' : ''}`} />
              {commentMode && (
                <span className="absolute -top-2 -right-2 bg-yellow-500 rounded-full w-3 h-3"></span>
              )}
            </button>
            <button
              id="select-mode-button"
              onClick={() => setCommentMode(false)}
              className={`p-2 rounded transition-colors ${
                !commentMode 
                  ? 'bg-blue-100 text-blue-700 border-2 border-blue-400' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
              title="Select Mode (Esc)"
            >
              <MousePointer className="w-4 h-4" />
              {!commentMode && (
                <span className="absolute -top-2 -right-2 bg-blue-500 rounded-full w-3 h-3"></span>
              )}
            </button>
            <div className="w-px h-6 bg-gray-300" />
          </>
        )}
        <button
          onClick={() => setPanOffset({ x: 0, y: 0 })}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          title="Reset View"
        >
          <Home className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={() => onZoomChange && onZoomChange(Math.max(0.25, state.zoom - 0.25))}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          disabled={state.zoom <= 0.25}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-700 min-w-[60px] text-center">
          {Math.round(state.zoom * 100)}%
        </span>
        <button
          onClick={() => onZoomChange && onZoomChange(Math.min(2, state.zoom + 0.25))}
          className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded"
          disabled={state.zoom >= 2}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
      
      {/* Simple Tour */}
      <SimpleTour 
        isOpen={showTour}
        onComplete={() => setShowTour(false)}
        onSkip={() => setShowTour(false)}
        tourKey="canvas_tour_v3" // Use a new key to ensure it shows up
        slides={[
          {
            title: "Welcome to the Canvas",
            content: "This interactive canvas allows you to design and collaborate on website layouts. Let's learn how to use it!"
          },
          {
            title: "Adding Comments",
            content: "Press 'C' key or click the comment icon to enter comment mode. Then click anywhere on the canvas to leave feedback."
          },
          {
            title: "View All Comments",
            content: "All comments appear in the sidebar. Click any comment to jump to its location. Press 'S' to toggle the sidebar visibility."
          },
          {
            title: "Select Mode",
            content: "When you're done commenting, press 'Esc' to return to selection mode where you can move and edit elements."
          },
          {
            title: "Element Comments",
            content: "Right-click on any element to quickly add a comment to it. Elements with comments show a badge - amber for unresolved, green for resolved."
          },
          {
            title: "You're Ready!",
            content: "That's it! You now know how to use the canvas for design and collaboration. Click 'Get Started' to begin."
          }
        ]}
      />
    </div>
  )
}

// Create the forwarded ref component
const CanvasWorkspace = forwardRef<HTMLDivElement, CanvasWorkspaceProps>(CanvasWorkspaceInner);

// Add display name
CanvasWorkspace.displayName = 'CanvasWorkspace';

export default CanvasWorkspace;