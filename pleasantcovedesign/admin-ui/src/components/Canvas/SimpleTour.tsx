import React, { useState } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

export interface TourSlide {
  title: string
  content: string
  image?: string
}

interface SimpleTourProps {
  slides: TourSlide[]
  onComplete: () => void
  onSkip: () => void
  isOpen: boolean
  tourKey?: string
}

const SimpleTour: React.FC<SimpleTourProps> = ({
  slides,
  onComplete,
  onSkip,
  isOpen,
  tourKey = 'canvas_tour_seen'
}) => {
  const [currentSlide, setCurrentSlide] = useState(0)

  if (!isOpen) return null

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    } else {
      handleComplete()
    }
  }

  const handlePrevious = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  const handleComplete = () => {
    localStorage.setItem(tourKey, 'true')
    onComplete()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9000]">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-lg font-semibold text-gray-900">Canvas Tutorial</h2>
          <button 
            onClick={onSkip}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          <h3 className="text-xl font-bold mb-2">{slides[currentSlide].title}</h3>
          <p className="text-gray-600 mb-6">{slides[currentSlide].content}</p>
          
          {slides[currentSlide].image && (
            <div className="mb-6 flex justify-center">
              <img 
                src={slides[currentSlide].image} 
                alt={slides[currentSlide].title}
                className="max-w-full h-auto rounded-lg border border-gray-200"
              />
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t bg-gray-50">
          <div className="flex space-x-1">
            {slides.map((_, idx) => (
              <div 
                key={idx}
                className={`w-2 h-2 rounded-full ${
                  idx === currentSlide ? 'bg-blue-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={handlePrevious}
              disabled={currentSlide === 0}
              className={`p-2 rounded-full ${
                currentSlide === 0 
                  ? 'text-gray-300 cursor-not-allowed' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              {currentSlide < slides.length - 1 ? (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </>
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SimpleTour