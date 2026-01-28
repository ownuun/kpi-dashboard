'use client'

import { useReportWebVitals } from 'next/web-vitals'
import { logger } from '@/lib/logger'

export function WebVitals() {
  useReportWebVitals((metric) => {
    const { name, value, rating } = metric

    if (process.env.NODE_ENV === 'development') {
      console.log(`[Web Vitals] ${name}: ${value.toFixed(2)} (${rating})`)
    }

    logger.info('Web Vitals metric', {
      name,
      value: Math.round(value),
      rating,
      navigationType: metric.navigationType,
    })
  })

  return null
}
