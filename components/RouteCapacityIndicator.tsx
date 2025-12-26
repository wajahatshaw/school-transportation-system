'use client'

import { Badge } from '@/components/ui/badge'

interface RouteCapacityIndicatorProps {
  assigned: number
  capacity: number
  available: number
  isFull: boolean
}

export function RouteCapacityIndicator({
  assigned,
  capacity,
  available,
  isFull
}: RouteCapacityIndicatorProps) {
  const percentage = capacity > 0 ? (assigned / capacity) * 100 : 0
  
  let variant: 'default' | 'success' | 'warning' | 'danger' = 'default'
  if (isFull) {
    variant = 'danger'
  } else if (percentage >= 80) {
    variant = 'warning'
  } else if (assigned > 0) {
    variant = 'success'
  }

  return (
    <div className="flex flex-col gap-1">
      <Badge variant={variant} className="w-fit">
        {assigned}/{capacity} students
      </Badge>
      {capacity > 0 && (
        <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              isFull
                ? 'bg-red-500'
                : percentage >= 80
                ? 'bg-yellow-500'
                : 'bg-green-500'
            }`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

