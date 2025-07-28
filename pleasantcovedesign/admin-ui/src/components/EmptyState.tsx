import React from 'react'
import Button from './Button'

interface EmptyStateProps {
  icon: React.ComponentType<{className?: string}>
  title: string
  description: string
  actionLabel?: string
  actionIcon?: React.ReactNode
  onAction?: () => void
  actionLoading?: boolean
  secondaryActionLabel?: string
  onSecondaryAction?: () => void
  className?: string
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionIcon,
  onAction,
  actionLoading = false,
  secondaryActionLabel,
  onSecondaryAction,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 px-4 ${className}`}>
      <Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">{description}</p>
      
      {(actionLabel && onAction) && (
        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Button
            onClick={onAction}
            loading={actionLoading}
            icon={actionIcon}
            size="md"
          >
            {actionLabel}
          </Button>
          
          {(secondaryActionLabel && onSecondaryAction) && (
            <Button
              onClick={onSecondaryAction}
              variant="ghost"
              size="md"
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default EmptyState 