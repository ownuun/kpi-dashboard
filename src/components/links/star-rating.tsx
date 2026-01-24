'use client'

import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  const handleClick = (rating: number) => {
    if (readonly || !onChange) return
    onChange(value === rating ? 0 : rating)
  }

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((rating) => (
        <button
          key={rating}
          type="button"
          onClick={() => handleClick(rating)}
          disabled={readonly}
          className={cn(
            'focus:outline-none transition-colors',
            !readonly && 'hover:scale-110 cursor-pointer',
            readonly && 'cursor-default'
          )}
        >
          <Star
            className={cn(
              sizeClasses[size],
              rating <= value
                ? 'fill-amber-400 text-amber-400'
                : 'fill-none text-slate-300'
            )}
          />
        </button>
      ))}
    </div>
  )
}
