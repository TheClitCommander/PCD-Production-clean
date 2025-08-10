import React from 'react'
import { 
  Type, Image, Square, Circle, Triangle, Smartphone, Monitor, Palette, Upload,
  Menu, List, CheckSquare, LayoutGrid, Search, User, Mail, Lock, Calendar, 
  FileText, BarChart, Map, Video, Headphones, MessageCircle, MessageSquare,
  Navigation, Sliders, AlignLeft, Table, Columns, Minus, Grid
} from 'lucide-react'

interface CanvasToolboxProps {
  onElementAdd: (elementType: string, position?: { x: number; y: number }) => void
  disabled?: boolean
  singleColumn?: boolean
}

const CanvasToolbox: React.FC<CanvasToolboxProps> = ({ onElementAdd, disabled = false, singleColumn = false }) => {
  const toolSections = [
    {
      title: 'Basic Elements',
      tools: [
        { type: 'text', label: 'Text', icon: Type, description: 'Add text content' },
        { type: 'heading', label: 'Heading', icon: AlignLeft, description: 'Large heading text' },
        { type: 'paragraph', label: 'Paragraph', icon: FileText, description: 'Paragraph text block' },
        { type: 'image', label: 'Image', icon: Image, description: 'Upload or link images' }
      ]
    },
    {
      title: 'Shapes',
      tools: [
        { type: 'rectangle', label: 'Rectangle', icon: Square, description: 'Basic rectangle shape' },
        { type: 'circle', label: 'Circle', icon: Circle, description: 'Perfect circle shape' },
        { type: 'triangle', label: 'Triangle', icon: Triangle, description: 'Triangle shape' },
        { type: 'line', label: 'Line', icon: Minus, description: 'Straight line' }
      ]
    },
    {
      title: 'UI Components',
      tools: [
        { type: 'button', label: 'Button', icon: Palette, description: 'Interactive button' },
        { type: 'input', label: 'Input', icon: Type, description: 'Text input field' },
        { type: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Checkbox input' },
        { type: 'dropdown', label: 'Dropdown', icon: Menu, description: 'Dropdown selector' }
      ]
    },
    {
      title: 'Navigation',
      tools: [
        { type: 'navbar', label: 'Navbar', icon: Navigation, description: 'Navigation bar' },
        { type: 'menu', label: 'Menu', icon: Menu, description: 'Menu component' },
        { type: 'tabs', label: 'Tabs', icon: Columns, description: 'Tab navigation' },
        { type: 'breadcrumb', label: 'Breadcrumb', icon: List, description: 'Breadcrumb navigation' }
      ]
    },
    {
      title: 'Layout',
      tools: [
        { type: 'container', label: 'Container', icon: Square, description: 'Content container' },
        { type: 'grid', label: 'Grid', icon: LayoutGrid, description: 'Grid layout' },
        { type: 'columns', label: 'Columns', icon: Columns, description: 'Column layout' },
        { type: 'card', label: 'Card', icon: Square, description: 'Content card' }
      ]
    },
    {
      title: 'Form Elements',
      tools: [
        { type: 'form', label: 'Form', icon: Square, description: 'Form container' },
        { type: 'text-field', label: 'Text Field', icon: Type, description: 'Text input field' },
        { type: 'textarea', label: 'Text Area', icon: AlignLeft, description: 'Multi-line text input' },
        { type: 'radio', label: 'Radio', icon: Circle, description: 'Radio button input' }
      ]
    },
    {
      title: 'Common Patterns',
      tools: [
        { type: 'search-bar', label: 'Search', icon: Search, description: 'Search input with button' },
        { type: 'user-avatar', label: 'Avatar', icon: User, description: 'User avatar with name' },
        { type: 'contact-form', label: 'Contact', icon: Mail, description: 'Contact form' },
        { type: 'login-form', label: 'Login', icon: Lock, description: 'Login form' }
      ]
    },
    {
      title: 'Content Blocks',
      tools: [
        { type: 'hero', label: 'Hero', icon: Image, description: 'Hero section' },
        { type: 'feature', label: 'Feature', icon: CheckSquare, description: 'Feature block' },
        { type: 'testimonial', label: 'Testimonial', icon: MessageCircle, description: 'Testimonial block' },
        { type: 'pricing', label: 'Pricing', icon: BarChart, description: 'Pricing table' }
      ]
    },
    {
      title: 'Data Display',
      tools: [
        { type: 'table', label: 'Table', icon: Table, description: 'Data table' },
        { type: 'chart', label: 'Chart', icon: BarChart, description: 'Data visualization' },
        { type: 'list', label: 'List', icon: List, description: 'List component' },
        { type: 'calendar', label: 'Calendar', icon: Calendar, description: 'Calendar component' }
      ]
    },
    {
      title: 'Media',
      tools: [
        { type: 'video', label: 'Video', icon: Video, description: 'Video player' },
        { type: 'audio', label: 'Audio', icon: Headphones, description: 'Audio player' },
        { type: 'map', label: 'Map', icon: Map, description: 'Map embed' },
        { type: 'gallery', label: 'Gallery', icon: LayoutGrid, description: 'Image gallery' }
      ]
    },
    {
      title: 'Devices',
      tools: [
        { type: 'mobile-frame', label: 'Mobile', icon: Smartphone, description: 'Mobile device frame' },
        { type: 'tablet-frame', label: 'Tablet', icon: Smartphone, description: 'Tablet device frame' },
        { type: 'desktop-frame', label: 'Desktop', icon: Monitor, description: 'Desktop browser frame' },
        { type: 'watch-frame', label: 'Watch', icon: Circle, description: 'Smartwatch frame' }
      ]
    }
  ]

  const handleToolClick = (toolType: string) => {
    if (disabled) return
    
    // Add element at center of canvas with slight randomization
    const centerX = 400 + Math.random() * 100 - 50
    const centerY = 300 + Math.random() * 100 - 50
    
    onElementAdd(toolType, { x: centerX, y: centerY })
  }

  return (
    <div className="p-2 space-y-2">
      {toolSections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="pb-1">
          <h3 className="text-xs font-medium text-gray-900 mb-1">{section.title}</h3>
          <div className={`grid ${singleColumn ? 'grid-cols-1' : 'grid-cols-3'} gap-1`}>
            {section.tools.map((tool, toolIndex) => (
              <button
                key={toolIndex}
                onClick={() => handleToolClick(tool.type)}
                disabled={disabled}
                className={`
                  group relative p-1 rounded border border-dashed border-gray-300 
                  hover:border-blue-400 hover:bg-blue-50 transition-all duration-200
                  ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
                title={tool.description}
              >
                <div className="flex flex-col items-center">
                  <tool.icon className="w-3.5 h-3.5 text-gray-600 group-hover:text-blue-600" />
                  <span className="text-[10px] font-medium text-gray-700 group-hover:text-blue-700 truncate max-w-full">
                    {tool.label}
                  </span>
                </div>
                
                {/* Tooltip - moved to top-full for better visibility */}
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-20">
                  {tool.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* Upload Area */}
      <div>
        <h3 className="text-xs font-medium text-gray-900 mb-1">Upload Assets</h3>
        <div 
          className={`
            border border-dashed border-gray-300 rounded p-2 text-center
            hover:border-blue-400 hover:bg-blue-50 transition-colors duration-200
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
          onClick={() => !disabled && document.getElementById('canvas-file-upload')?.click()}
        >
          <Upload className="w-4 h-4 text-gray-400 mx-auto" />
          <p className="text-[10px] text-gray-600">
            Drop files or click to upload
          </p>
        </div>
        
        <input
          id="canvas-file-upload"
          type="file"
          multiple
          accept="image/*"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const files = Array.from(e.target.files || [])
            files.forEach((file, index) => {
              const reader = new FileReader()
              reader.onload = (event) => {
                onElementAdd('image', { 
                  x: 200 + index * 20, 
                  y: 200 + index * 20 
                })
              }
              reader.readAsDataURL(file)
            })
          }}
        />
      </div>

      {/* Quick Actions */}
      {!disabled && (
        <div>
          <h3 className="text-xs font-medium text-gray-900 mb-1">Quick Actions</h3>
          <div className="space-y-0.5">
            <button
              onClick={() => onElementAdd('text')}
              className="w-full px-1.5 py-1 text-[10px] text-left text-gray-700 hover:bg-gray-100 rounded"
            >
              Add heading text
            </button>
            <button
              onClick={() => onElementAdd('button')}
              className="w-full px-1.5 py-1 text-[10px] text-left text-gray-700 hover:bg-gray-100 rounded"
            >
              Add call-to-action button
            </button>
            <button
              onClick={() => onElementAdd('card')}
              className="w-full px-1.5 py-1 text-[10px] text-left text-gray-700 hover:bg-gray-100 rounded"
            >
              Add content section
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default CanvasToolbox