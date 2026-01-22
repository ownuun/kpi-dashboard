'use client'

import { forwardRef, useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: number
  onValueChange: (value: number) => void
}

export const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onValueChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState('')

    useEffect(() => {
      if (value !== undefined && value > 0) {
        setDisplayValue(value.toLocaleString('ko-KR'))
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const rawValue = e.target.value.replace(/[^0-9]/g, '')
      const numberValue = parseInt(rawValue, 10)

      if (isNaN(numberValue) || rawValue === '') {
        setDisplayValue('')
        onValueChange(0)
      } else {
        setDisplayValue(numberValue.toLocaleString('ko-KR'))
        onValueChange(numberValue)
      }
    }

    return (
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          ₩
        </span>
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="numeric"
          value={displayValue}
          onChange={handleChange}
          className={cn('pl-8 font-mono', className)}
          placeholder="0"
        />
      </div>
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
