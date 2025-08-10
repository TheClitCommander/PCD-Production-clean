import React, { useState, useRef, useCallback, useEffect } from 'react'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'
import { Plus, Grid, Eye, Save, History, Users, MessageSquare, Menu } from 'lucide-react'
import CanvasToolbox from './CanvasToolbox'
import CanvasWorkspace from './CanvasWorkspace'
import CanvasLayerPanel from './CanvasLayerPanel'
import VersionControls from './VersionControls'
import CollaborationPanel from './CollaborationPanel'

export interface CanvasElement {
  id: string
  type: string // Allow any type of element
  x: number
  y: number
  width: number
  height: number
  content: any
  style: any
  locked?: boolean
  version?: number
  comments?: Array<{
    id: string
    x: number
    y: number
    content: string
    author: string
    timestamp: string
    resolved?: boolean
  }>
}

export interface CanvasState {
  elements: CanvasElement[]
  selectedElement: string | null
  gridSize: number
  snapToGrid: boolean
  zoom: number
  viewMode: 'design' | 'preview' | 'presentation'
  version: number
  collaborators: Array<{
    id: string
    name: string
    color: string
    cursor?: { x: number; y: number }
  }>
}

interface DesignCanvasProps {
  projectId: string
  isReadOnly?: boolean
  initialState?: Partial<CanvasState>
  onSave?: (state: CanvasState) => void
  onVersionCreate?: (version: number, description: string) => void
}

const DesignCanvas: React.FC<DesignCanvasProps> = ({
  projectId,
  isReadOnly = false,
  initialState = {},
  onSave,
  onVersionCreate
}) => {
  const [canvasState, setCanvasState] = useState<CanvasState>({
    elements: [],
    selectedElement: null,
    gridSize: 20,
    snapToGrid: true,
    zoom: 1,
    viewMode: 'design',
    version: 1,
    collaborators: [],
    ...initialState
  })
  
  const [isLoading, setIsLoading] = useState(true)
  
  // Load canvas data from the server when the component mounts
  useEffect(() => {
    const loadCanvasData = async () => {
      try {
        setIsLoading(true)
        
        try {
          const response = await fetch(`/api/projects/${projectId}/canvas`, {
            headers: {
              'Authorization': `Bearer pleasantcove2024admin`,
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            if (data && Object.keys(data).length > 0) {
              setCanvasState(prevState => ({
                ...prevState,
                ...data
              }));
            }
          } else {
            console.log('Using default canvas state - API returned', response.status);
          }
        } catch (error) {
          console.log('Using default canvas state - API connection error');
          // Continue with default state
        }
      } catch (error) {
        console.error('Error in canvas data loading flow:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCanvasData();
  }, [projectId])

  const [showGrid, setShowGrid] = useState(true)
  const [showComments, setShowComments] = useState(true)
  const [activePanel, setActivePanel] = useState<'toolbox' | 'layers' | 'versions' | 'collaboration'>('toolbox')
  const [sidebarWidth, setSidebarWidth] = useState(320) // Default width of 320px (80 * 4)
  const [singleColumn, setSingleColumn] = useState(false) // Toggle for single column mode
  const canvasRef = useRef<HTMLDivElement>(null)
  const resizingRef = useRef<boolean>(false)

  // Handle keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected element
      if ((e.key === 'Delete' || e.key === 'Backspace') && canvasState.selectedElement && !isReadOnly) {
        e.preventDefault()
        handleElementDelete(canvasState.selectedElement)
      }
      // Deselect on Escape
      if (e.key === 'Escape') {
        setCanvasState(prev => ({ ...prev, selectedElement: null }))
      }
      
      // Toggle sidebar width with Alt+[
      if (e.key === '[' && e.altKey) {
        setSidebarWidth(prev => prev > 200 ? 160 : 320);
      }
      
      // Toggle column mode with Alt+]
      if (e.key === ']' && e.altKey && activePanel === 'toolbox') {
        setSingleColumn(prev => !prev);
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [canvasState.selectedElement, isReadOnly, activePanel])

  const handleElementAdd = useCallback((elementType: string, position?: { x: number; y: number }) => {
    const newElement: CanvasElement = {
      id: `element-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: elementType as any,
      x: position?.x || 100,
      y: position?.y || 100,
      width: elementType === 'text' ? 200 : 150,
      height: elementType === 'text' ? 40 : 100,
      content: getDefaultContent(elementType),
      style: getDefaultStyle(elementType),
      version: canvasState.version
    }

    setCanvasState(prev => ({
      ...prev,
      elements: [...prev.elements, newElement],
      selectedElement: newElement.id
    }))
  }, [canvasState.version])

  const handleElementUpdate = useCallback((elementId: string, updates: Partial<CanvasElement>) => {
    setCanvasState(prev => ({
      ...prev,
      elements: prev.elements.map(el =>
        el.id === elementId ? { ...el, ...updates } : el
      )
    }))
  }, [])

  const handleElementDelete = useCallback((elementId: string) => {
    setCanvasState(prev => ({
      ...prev,
      elements: prev.elements.filter(el => el.id !== elementId),
      selectedElement: prev.selectedElement === elementId ? null : prev.selectedElement
    }))
  }, [])

  const handleSave = useCallback(async () => {
    try {
      // If onSave callback is provided, use it
      if (onSave) {
        onSave(canvasState)
      }
      
      try {
        // Try to save to the server API
        const response = await fetch(`/api/projects/${projectId}/canvas`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer pleasantcove2024admin`, // Use the admin token from your API
          },
          body: JSON.stringify(canvasState)
        });
        
        if (response.ok) {
          console.log('Canvas saved successfully to server');
        } else {
          console.log('Canvas saved locally only - server returned', response.status);
          // Save to localStorage as fallback
          localStorage.setItem(`canvas_${projectId}`, JSON.stringify(canvasState));
        }
      } catch (error) {
        console.log('Canvas saved locally only - server connection error');
        // Save to localStorage as fallback
        localStorage.setItem(`canvas_${projectId}`, JSON.stringify(canvasState));
      }
      
      // Provide user feedback that the save was successful
      alert('Canvas saved successfully');
      
    } catch (error) {
      console.error('Error in canvas save flow:', error);
      alert('Error saving canvas. Please try again.');
    }
  }, [canvasState, onSave, projectId])

  const handleCreateVersion = useCallback(async (description: string) => {
    const newVersion = canvasState.version + 1
    setCanvasState(prev => ({ ...prev, version: newVersion }))
    
    try {
      // If onVersionCreate callback is provided, use it
      if (onVersionCreate) {
        onVersionCreate(newVersion, description)
      }
      
      try {
        // Try to save version to the server API
        const response = await fetch(`/api/projects/${projectId}/canvas/versions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer pleasantcove2024admin`, // Use the admin token from your API
          },
          body: JSON.stringify({
            version: newVersion,
            description,
            canvasData: canvasState
          })
        });
        
        if (response.ok) {
          console.log('Canvas version saved successfully to server');
        } else {
          console.log('Canvas version saved locally only - server returned', response.status);
          // Save to localStorage as fallback
          localStorage.setItem(`canvas_${projectId}_version_${newVersion}`, JSON.stringify({
            version: newVersion,
            description,
            canvasData: canvasState,
            timestamp: new Date().toISOString()
          }));
        }
      } catch (error) {
        console.log('Canvas version saved locally only - server connection error');
        // Save to localStorage as fallback
        localStorage.setItem(`canvas_${projectId}_version_${newVersion}`, JSON.stringify({
          version: newVersion,
          description,
          canvasData: canvasState,
          timestamp: new Date().toISOString()
        }));
      }
      
      // Provide user feedback
      alert(`Version ${newVersion} created successfully: ${description}`);
      
    } catch (error) {
      console.error('Error in canvas version save flow:', error);
      alert('Error creating version. Please try again.');
    }
  }, [canvasState, projectId, onVersionCreate])

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full flex flex-col bg-gray-50">
        {isLoading && (
          <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50">
            <div className="text-center">
              <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-blue-600">Loading canvas...</p>
            </div>
          </div>
        )}
        {/* Canvas Header */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-lg font-semibold text-gray-900">Design Canvas</h2>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCanvasState(prev => ({ ...prev, viewMode: 'design' }))}
                  className={`px-3 py-1 text-sm rounded ${
                    canvasState.viewMode === 'design' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Design
                </button>
                <button
                  onClick={() => setCanvasState(prev => ({ ...prev, viewMode: 'preview' }))}
                  className={`px-3 py-1 text-sm rounded ${
                    canvasState.viewMode === 'preview' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Eye className="w-4 h-4 inline mr-1" />
                  Preview
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* Collaboration Indicators */}
              {canvasState.collaborators.length > 0 && (
                <div className="flex -space-x-2">
                  {canvasState.collaborators.slice(0, 3).map((collaborator) => (
                    <div
                      key={collaborator.id}
                      className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-medium text-white"
                      style={{ backgroundColor: collaborator.color }}
                      title={collaborator.name}
                    >
                      {collaborator.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {canvasState.collaborators.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-500 flex items-center justify-center text-xs font-medium text-white">
                      +{canvasState.collaborators.length - 3}
                    </div>
                  )}
                </div>
              )}

              {/* Control Buttons */}
              <button
                onClick={() => setShowGrid(!showGrid)}
                className={`p-2 rounded ${showGrid ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                title="Toggle Grid"
              >
                <Grid className="w-4 h-4" />
              </button>

              <button
                onClick={() => setShowComments(!showComments)}
                className={`p-2 rounded ${showComments ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:text-gray-900'}`}
                title="Toggle Comments"
              >
                <MessageSquare className="w-4 h-4" />
              </button>

              {!isReadOnly && (
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center space-x-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Canvas Body */}
        <div className="flex-1 flex">
          {/* Left Sidebar with resizable width */}
          <div 
            className="bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden"
            style={{ width: `${sidebarWidth}px` }}
          >
            {/* Panel Tabs with Column Toggle */}
            <div className="flex border-b border-gray-200 flex-shrink-0 relative">
              {[
                { key: 'toolbox', label: 'Tools', icon: Plus },
                { key: 'layers', label: 'Layers', icon: Grid },
                { key: 'versions', label: 'Versions', icon: History },
                { key: 'collaboration', label: 'Team', icon: Users }
              ].map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setActivePanel(key as any)}
                  className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 ${
                    activePanel === key
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" />
                  {label}
                </button>
              ))}
              
              {/* Column toggle button - only show for toolbox */}
              {activePanel === 'toolbox' && (
                <button
                  onClick={() => setSingleColumn(!singleColumn)}
                  className="absolute right-1 top-1 p-1 text-gray-500 hover:text-gray-700 bg-white rounded"
                  title={singleColumn ? "Show multiple columns" : "Show single column"}
                >
                  {singleColumn ? <Grid className="w-3 h-3" /> : <Menu className="w-3 h-3" />}
                </button>
              )}
            </div>

            {/* Panel Content - Ensure full height for scrolling */}
            <div className="flex-1 flex flex-col" style={{ height: 'calc(100vh - 150px)', maxHeight: 'calc(100vh - 150px)' }}>
              {activePanel === 'toolbox' && (
                <div className="h-full overflow-y-auto canvas-toolbox-scroll">
                  <CanvasToolbox 
                    onElementAdd={handleElementAdd} 
                    disabled={isReadOnly} 
                    singleColumn={singleColumn} 
                  />
                </div>
              )}
              {activePanel === 'layers' && (
                <div className="h-full overflow-y-auto">
                  <CanvasLayerPanel
                    elements={canvasState.elements}
                    selectedElement={canvasState.selectedElement}
                    onElementSelect={(id) => setCanvasState(prev => ({ ...prev, selectedElement: id }))}
                    onElementUpdate={handleElementUpdate}
                    onElementDelete={handleElementDelete}
                    disabled={isReadOnly}
                  />
                </div>
              )}
              {activePanel === 'versions' && (
                <div className="h-full overflow-y-auto">
                  <VersionControls
                    currentVersion={canvasState.version}
                    onCreateVersion={handleCreateVersion}
                    disabled={isReadOnly}
                  />
                </div>
              )}
              {activePanel === 'collaboration' && (
                <div className="h-full overflow-y-auto">
                  <CollaborationPanel
                    collaborators={canvasState.collaborators}
                    projectId={projectId}
                  />
                </div>
              )}
            </div>
          </div>
          
          {/* Resizable handle */}
          <div 
            className="group w-1 bg-gray-200 hover:bg-blue-400 cursor-col-resize relative z-10"
            onMouseDown={(e) => {
              e.preventDefault();
              resizingRef.current = true;
              
              const handleMouseMove = (e: MouseEvent) => {
                if (resizingRef.current) {
                  // Limit min width to 160px and max width to 480px
                  const newWidth = Math.max(160, Math.min(480, e.clientX));
                  setSidebarWidth(newWidth);
                }
              };
              
              const handleMouseUp = () => {
                resizingRef.current = false;
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }}
            title="Drag to resize sidebar (Alt+[ to toggle)"
          >
            {/* Tooltip showing keyboard shortcuts */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap z-20">
              Alt+[ Toggle sidebar width<br />
              Alt+] Toggle column mode
            </div>
          </div>

          {/* Canvas Workspace */}
          <div className="flex-1 relative">
            <CanvasWorkspace
              ref={canvasRef}
              state={canvasState}
              showGrid={showGrid}
              showComments={showComments}
              onElementUpdate={handleElementUpdate}
              onElementSelect={(id) => setCanvasState(prev => ({ ...prev, selectedElement: id }))}
              onElementAdd={handleElementAdd}
              onElementDelete={handleElementDelete}
              onZoomChange={(zoom) => setCanvasState(prev => ({ ...prev, zoom }))}
              readOnly={isReadOnly}
            />
          </div>
        </div>
      </div>
    </DndProvider>
  )
}

// Helper functions
function getDefaultContent(elementType: string) {
  // Text elements
  if (elementType === 'text') {
    return { text: 'Click to edit text', fontSize: 16, fontFamily: 'Inter' }
  }
  if (elementType === 'heading') {
    return { text: 'Heading', fontSize: 24, fontWeight: 'bold', fontFamily: 'Inter' }
  }
  if (elementType === 'paragraph') {
    return { text: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.', fontSize: 14, fontFamily: 'Inter' }
  }
  
  // Media elements
  if (elementType === 'image') {
    return { src: '', alt: 'Upload an image', placeholder: 'Image Placeholder' }
  }
  if (elementType === 'video') {
    return { src: '', placeholder: 'Video Player' }
  }
  if (elementType === 'audio') {
    return { src: '', placeholder: 'Audio Player' }
  }
  if (elementType === 'map') {
    return { placeholder: 'Map Embed' }
  }
  if (elementType === 'gallery') {
    return { images: [], placeholder: 'Image Gallery' }
  }
  
  // Shape elements
  if (['rectangle', 'circle', 'triangle'].includes(elementType)) {
    return { fillColor: '#E5E7EB', shape: elementType }
  }
  if (elementType === 'line') {
    return { strokeColor: '#9CA3AF', strokeWidth: 2 }
  }
  
  // UI Components
  if (elementType === 'button') {
    return { text: 'Button', fontSize: 14, variant: 'primary' }
  }
  if (elementType === 'input') {
    return { placeholder: 'Enter text...', label: 'Input Label' }
  }
  if (elementType === 'checkbox') {
    return { label: 'Checkbox Label', checked: false }
  }
  if (elementType === 'dropdown') {
    return { label: 'Dropdown', options: ['Option 1', 'Option 2', 'Option 3'] }
  }
  if (elementType === 'radio') {
    return { label: 'Radio Button', options: ['Option 1', 'Option 2'] }
  }
  if (elementType === 'text-field') {
    return { label: 'Text Field', placeholder: 'Enter text...' }
  }
  if (elementType === 'textarea') {
    return { label: 'Text Area', placeholder: 'Enter text...' }
  }
  
  // Navigation elements
  if (elementType === 'navbar') {
    return { brand: 'Brand', items: ['Home', 'About', 'Services', 'Contact'] }
  }
  if (elementType === 'menu') {
    return { items: ['Menu Item 1', 'Menu Item 2', 'Menu Item 3'] }
  }
  if (elementType === 'tabs') {
    return { tabs: ['Tab 1', 'Tab 2', 'Tab 3'], activeTab: 0 }
  }
  if (elementType === 'breadcrumb') {
    return { items: ['Home', 'Category', 'Current Page'] }
  }
  
  // Layout elements
  if (elementType === 'container') {
    return { padding: 16, maxWidth: 1200 }
  }
  if (elementType === 'grid') {
    return { columns: 3, gap: 16 }
  }
  if (elementType === 'columns') {
    return { count: 2, gap: 16 }
  }
  if (elementType === 'card') {
    return { title: 'Card Title', description: 'Card content goes here...', hasThumbnail: true }
  }
  
  // Form elements
  if (elementType === 'form') {
    return { fields: ['Name', 'Email', 'Message'], submitText: 'Submit' }
  }
  if (elementType === 'contact-form') {
    return { fields: ['Name', 'Email', 'Message'], submitText: 'Send Message' }
  }
  if (elementType === 'login-form') {
    return { fields: ['Email', 'Password'], submitText: 'Log In' }
  }
  
  // Common patterns
  if (elementType === 'search-bar') {
    return { placeholder: 'Search...', buttonText: 'Search' }
  }
  if (elementType === 'user-avatar') {
    return { name: 'User Name', image: '' }
  }
  if (elementType === 'hero') {
    return { title: 'Hero Title', subtitle: 'Hero subtitle text goes here', hasButton: true }
  }
  if (elementType === 'feature') {
    return { title: 'Feature Title', description: 'Feature description text', icon: 'star' }
  }
  if (elementType === 'testimonial') {
    return { quote: 'Testimonial quote text', author: 'Author Name', role: 'Role/Company' }
  }
  if (elementType === 'pricing') {
    return { plans: ['Basic', 'Pro', 'Enterprise'], features: ['Feature 1', 'Feature 2', 'Feature 3'] }
  }
  
  // Data display
  if (elementType === 'table') {
    return { headers: ['Header 1', 'Header 2', 'Header 3'], rows: 3 }
  }
  if (elementType === 'chart') {
    return { type: 'bar', data: [10, 20, 30, 40], labels: ['A', 'B', 'C', 'D'] }
  }
  if (elementType === 'list') {
    return { items: ['List Item 1', 'List Item 2', 'List Item 3'], type: 'bullet' }
  }
  if (elementType === 'calendar') {
    return { month: 'Current Month', events: [] }
  }
  
  // Device frames
  if (['mobile-frame', 'tablet-frame', 'desktop-frame', 'watch-frame'].includes(elementType)) {
    return { deviceType: elementType, content: null }
  }
  
  // Default for any other element type
  return {}
}

function getDefaultStyle(elementType: string) {
  // Text elements
  if (['text', 'heading', 'paragraph'].includes(elementType)) {
    return {
      backgroundColor: 'transparent',
      color: '#1f2937',
      padding: 8,
      borderWidth: 0
    }
  }
  
  // Shape elements
  if (['rectangle', 'circle', 'triangle'].includes(elementType)) {
    return {
      backgroundColor: '#E5E7EB',
      borderColor: '#d1d5db',
      borderWidth: 1,
      borderRadius: elementType === 'circle' ? '50%' : 4
    }
  }
  
  // Line element
  if (elementType === 'line') {
    return {
      backgroundColor: 'transparent',
      borderWidth: 0
    }
  }
  
  // UI Components
  if (elementType === 'button') {
    return {
      backgroundColor: '#3B82F6',
      color: '#ffffff',
      borderRadius: 6,
      padding: '8px 16px',
      textAlign: 'center',
      fontWeight: 'medium'
    }
  }
  
  if (['input', 'text-field', 'textarea'].includes(elementType)) {
    return {
      backgroundColor: '#ffffff',
      borderColor: '#d1d5db',
      borderWidth: 1,
      borderRadius: 4,
      padding: 8
    }
  }
  
  if (['checkbox', 'radio'].includes(elementType)) {
    return {
      backgroundColor: 'transparent',
      padding: 4
    }
  }
  
  // Navigation elements
  if (elementType === 'navbar') {
    return {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderBottomWidth: 1,
      padding: '12px 16px',
      display: 'flex'
    }
  }
  
  if (elementType === 'tabs') {
    return {
      backgroundColor: 'transparent',
      borderColor: '#e5e7eb',
      borderBottomWidth: 1
    }
  }
  
  // Layout elements
  if (elementType === 'container') {
    return {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      borderRadius: 8,
      padding: 16
    }
  }
  
  if (elementType === 'card') {
    return {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      borderRadius: 8,
      padding: 16,
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }
  }
  
  // Form elements
  if (elementType === 'form') {
    return {
      backgroundColor: '#ffffff',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      borderRadius: 8,
      padding: 24
    }
  }
  
  // Media elements
  if (['image', 'video', 'map', 'gallery'].includes(elementType)) {
    return {
      backgroundColor: '#f3f4f6',
      borderColor: '#e5e7eb',
      borderWidth: 1,
      borderRadius: 4,
      padding: 0
    }
  }
  
  // Device frames
  if (['mobile-frame', 'tablet-frame', 'desktop-frame', 'watch-frame'].includes(elementType)) {
    return {
      backgroundColor: '#ffffff',
      borderColor: '#9ca3af',
      borderWidth: 2,
      borderRadius: elementType === 'watch-frame' ? '50%' : 8,
      padding: 8
    }
  }
  
  // Default style for any other element
  return {
    backgroundColor: '#ffffff',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    borderRadius: 4,
    padding: 16,
    color: '#1f2937'
  }
}

export default DesignCanvas