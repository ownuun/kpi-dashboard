'use client'

import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/format'
import type { MonthlyTrend } from '@/types'

interface TrendChartProps {
  data: MonthlyTrend[]
}

export function TrendChart({ data }: TrendChartProps) {
  return (
    <Card className="shadow-sm border-slate-200/60 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">월별 추이</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[320px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                tickFormatter={(value) => `${(value / 10000).toFixed(0)}만`}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as MonthlyTrend
                  return (
                    <div className="rounded-lg border bg-background p-3 shadow-lg">
                      <p className="font-medium">{item.month}</p>
                      <p className="text-sm text-emerald-500">수입: {formatKRW(item.income)}</p>
                      <p className="text-sm text-rose-400">지출: {formatKRW(item.expense)}</p>
                      <p className="text-sm text-sky-500 font-medium">
                        순이익: {formatKRW(item.netProfit)}
                      </p>
                    </div>
                  )
                }}
              />
              <Legend />
              <Bar dataKey="income" name="수입" fill="#6ee7b7" radius={[4, 4, 0, 0]} barSize={24} />
              <Bar dataKey="expense" name="지출" fill="#fda4af" radius={[4, 4, 0, 0]} barSize={24} />
              <Line
                type="monotone"
                dataKey="netProfit"
                name="순이익"
                stroke="#7dd3fc"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#7dd3fc', strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
