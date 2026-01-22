'use client'

import dynamic from 'next/dynamic'
import type { MonthlyTrend, WeeklyTrend } from '@/types'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

const TrendChartInner = dynamic(
  () => import('./trend-chart').then((mod) => mod.TrendChart),
  {
    ssr: false,
    loading: () => (
      <Card className="shadow-sm border-slate-200/60 bg-white">
        <CardHeader className="pb-2">
          <div className="h-6 w-24 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[320px] w-full bg-slate-100 rounded animate-pulse" />
        </CardContent>
      </Card>
    ),
  }
)

interface TrendChartProps {
  monthlyData: MonthlyTrend[]
  weeklyData: WeeklyTrend[]
}

export function TrendChart({ monthlyData, weeklyData }: TrendChartProps) {
  return <TrendChartInner monthlyData={monthlyData} weeklyData={weeklyData} />
}
