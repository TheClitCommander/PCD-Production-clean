import React from 'react'
import { Eye, EyeOff, Lock, Unlock, Trash2, Copy } from 'lucide-react'
import { CanvasElement } from './DesignCanvas'

interface CanvasLayerPanelProps {
  elements: CanvasElement[]
  selectedElement: string | null
  onElementSelect: (elementId: string) => void
  onElementUpdate: (elementId: string, updates: Partial<CanvasElement>) => void
  onElementDelete: (elementId: string) => void
  disabled?: boolean
}

const CanvasLayerPanel: React.FC<CanvasLayerPanelProps> = ({
  elements,
  selectedElement,
  onElementSelect,
  onElementUpdate,
  onElementDelete,
  disabled = false
}) => {
  const getElementIcon = (type: string) => {
    switch (type) {
      case 'text': return '📝'
      case 'image': return '🖼️'
      case 'rectangle':
      case 'shape': return '🟦'
      case 'button': return '🔘'
      case 'card': return '📋'
      default: return '📦'
    }
  }

  const getElementName = (element: CanvasElement) => {
    switch (element.type) {
      case 'text':
        return element.content.text?.substring(0, 20) || 'Text Element'
      case 'image':
        return element.content.alt || 'Image'
      case 'button':
        return element.content.label || 'Button'
      default:
        return `${element.type.charAt(0).toUpperCase()}${element.type.slice(1)}`
    }
  }

  // Sort elements by z-index/creation order (most recent on top)
  const sortedElements = [...elements].reverse()

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">Layers</h3>
        <span className="text-xs text-gray-500">{elements.length} elements</span>
      </div>

      <div className="space-y-1">
        {sortedElements.map((element, index) => (
          <div
            key={element.id}
            className={`
              group flex items-center p-2 rounded border cursor-pointer transition-colors
              ${selectedElement === element.id 
                ? 'bg-blue-50 border-blue-300' 
                : 'bg-white border-gray-200 hover:bg-gray-50'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onClick={() => !disabled && onElementSelect(element.id)}
          >
            {/* Element Icon */}
            <span className="text-lg mr-3">{getElementIcon(element.type)}</span>
            
            {/* Element Info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 truncate">
                {getElementName(element)}
              </div>
              <div className="text-xs text-gray-500">
                {element.width}×{element.height} • {element.x},{element.y}
              </div>
            </div>

            {/* Layer Controls */}
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Visibility Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled) {
                    onElementUpdate(element.id, { 
                      style: { 
                        ...element.style, 
                        visibility: element.style.visibility === 'hidden' ? 'visible' : 'hidden' 
                      }
                    })
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title={element.style.visibility === 'hidden' ? 'Show' : 'Hide'}
                disabled={disabled}
              >
                {element.style.visibility === 'hidden' ? 
                  <EyeOff className="w-3 h-3" /> : 
                  <Eye className="w-3 h-3" />
                }
              </button>

              {/* Lock Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled) {
                    onElementUpdate(element.id, { locked: !element.locked })
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title={element.locked ? 'Unlock' : 'Lock'}
                disabled={disabled}
              >
                {element.locked ? 
                  <Lock className="w-3 h-3" /> : 
                  <Unlock className="w-3 h-3" />
                }
              </button>

              {/* Duplicate */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled) {
                    // TODO: Implement element duplication
                    console.log('Duplicate element:', element.id)
                  }
                }}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                title="Duplicate"
                disabled={disabled}
              >
                <Copy className="w-3 h-3" />
              </button>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (!disabled && window.confirm('Delete this element?')) {
                    onElementDelete(element.id)
                  }
                }}
                className="p-1 text-gray-400 hover:text-red-600 rounded"
                title="Delete"
                disabled={disabled}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>

            {/* Layer Order Indicator */}
            <div className="text-xs text-gray-400 ml-2 w-6 text-center">
              {elements.length - index}
            </div>
          </div>
        ))}

        {elements.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📋</div>
            <div className="text-sm">No elements yet</div>
            <div className="text-xs text-gray-400 mt-1">
              Add elements from the toolbox
            </div>
          </div>
        )}
      </div>

      {/* Layer Actions */}
      {!disabled && elements.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-2">
            <button
              onClick={() => {
                if (window.confirm('Clear all elements?')) {
                  elements.forEach(element => onElementDelete(element.id))
                }
              }}
              className="w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded border border-red-200"
            >
              Clear All Elements
            </button>
            
            <button
              onClick={() => {
                // TODO: Implement select all
                console.log('Select all elements')
              }}
              className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded border border-gray-200"
            >
              Select All
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CanvasLayerPanel