import React, { useState, useEffect } from 'react'
import { X } from 'lucide-react'

export interface TourStep {
  target: string
  title: string
  content: string
  position?: 'top' | 'right' | 'bottom' | 'left'
}

interface GuidedTourProps {
  steps: TourStep[]
  onComplete: () => void
  onSkip: () => void
  isOpen: boolean
  tourKey?: string
}

const GuidedTour: React.FC<GuidedTourProps> = ({
  steps,
  onComplete,
  onSkip,
  isOpen,
  tourKey = 'canvas_tour_seen'
}) => {
  const [currentStep, setCurrentStep] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0, width: 0, height: 0 })

  // Check if user has seen the tour before
  useEffect(() => {
    // For debugging, always show the tour
    // const hasSeenTour = localStorage.getItem(tourKey) === 'true'
    // if (hasSeenTour) {
    //   onComplete()
    // }
    console.log('Tour is open:', isOpen)
  }, [isOpen, tourKey])

  // Find target element and position tooltip
  useEffect(() => {
    if (!isOpen) return

    const targetElement = document.querySelector(steps[currentStep].target)
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect()
      setPosition({
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      })
      console.log(`Found tour target: ${steps[currentStep].target}`, rect)
    } else {
      console.warn(`Tour target not found: ${steps[currentStep].target}`)
      // If target not found, use a fallback position
      setPosition({
        x: window.innerWidth / 2 - 150,
        y: window.innerHeight / 2 - 100,
        width: 300,
        height: 200
      })
    }
  }, [currentStep, steps, isOpen])

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(tourKey, 'true')
    onComplete()
  }

  const getTooltipPosition = () => {
    const step = steps[currentStep]
    const padding = 12
    
    switch(step.position || 'bottom') {
      case 'top':
        return {
          top: position.y - padding - 10,
          left: position.x + (position.width / 2) - 150,
          transform: 'translateY(-100%)',
        }
      case 'right':
        return {
          top: position.y + (position.height / 2) - 75,
          left: position.x + position.width + padding,
        }
      case 'bottom':
        return {
          top: position.y + position.height + padding + 10,
          left: position.x + (position.width / 2) - 150,
        }
      case 'left':
        return {
          top: position.y + (position.height / 2) - 75,
          left: position.x - padding - 10,
          transform: 'translateX(-100%)',
        }
    }
  }

  if (!isOpen) {
    console.log('Tour is not open')
    return null
  }
  
  console.log('Rendering tour', { currentStep, position, steps })
  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-30 z-[9000]" />

      {/* Highlight target */}
      <div 
        className="fixed z-[9001] pointer-events-none"
        style={{
          top: position.y - 4,
          left: position.x - 4,
          width: position.width + 8,
          height: position.height + 8,
          boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.5)',
          borderRadius: 4,
          border: '2px solid white',
          outline: '4px solid rgba(59, 130, 246, 0.5)',
          animation: 'pulse 2s infinite'
        }}
      />

      {/* Tooltip */}
      <div 
        className="fixed z-[9002] bg-white rounded-lg shadow-xl border border-gray-200 w-[300px] p-4"
        style={{
          ...getTooltipPosition(),
        }}
      >
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium text-gray-900">{steps[currentStep].title}</h3>
          <button 
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <p className="text-gray-600 text-sm mb-4">{steps[currentStep].content}</p>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-1">
            {steps.map((_, idx) => (
              <div 
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === currentStep ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <div className="flex space-x-2">
            {currentStep > 0 && (
              <button 
                onClick={handlePrevious}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {currentStep < steps.length - 1 ? 'Next' : 'Done'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}

export default GuidedTour