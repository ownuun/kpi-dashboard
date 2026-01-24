'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface StarRatingModalProps {
  value: number
  onChange?: (value: number) => void
  readonly?: boolean
}

export function StarRatingModal({
  value,
  onChange,
  readonly = false,
}: StarRatingModalProps) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState(0)

  const handleSelect = (rating: number) => {
    if (readonly || !onChange) return
    onChange(rating)
    setOpen(false)
  }

  const displayStars = (size: 'sm' | 'lg', interactive: boolean) => {
    const sizeClass = size === 'sm' ? 'h-3.5 w-3.5' : 'h-8 w-8'
    const displayValue = interactive && hovered > 0 ? hovered : value

    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((rating) =>
          interactive ? (
            <button
              key={rating}
              type="button"
              onClick={() => handleSelect(rating)}
              onMouseEnter={() => setHovered(rating)}
              onMouseLeave={() => setHovered(0)}
              className="focus:outline-none transition-all hover:scale-110 cursor-pointer"
            >
              <Star
                className={cn(
                  sizeClass,
                  rating <= displayValue
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-slate-300'
                )}
              />
            </button>
          ) : (
            <span key={rating}>
              <Star
                className={cn(
                  sizeClass,
                  rating <= displayValue
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-none text-slate-300'
                )}
              />
            </span>
          )
        )}
      </div>
    )
  }

  if (readonly) {
    return displayStars('sm', false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          className="cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          {displayStars('sm', false)}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-3"
        align="center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm text-slate-600">별점 선택</span>
          {displayStars('lg', true)}
          {value > 0 && (
            <button
              onClick={() => handleSelect(0)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              별점 삭제
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
