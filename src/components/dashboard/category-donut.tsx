'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatKRW } from '@/lib/format'
import type { CategoryBreakdown } from '@/types'

interface CategoryDonutProps {
  title: string
  data: CategoryBreakdown[]
}

export function CategoryDonut({ title, data }: CategoryDonutProps) {
  if (data.length === 0) {
    return (
      <Card className="shadow-sm border-slate-200/60 bg-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-semibold text-slate-700">{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[200px] items-center justify-center">
          <p className="text-sm text-slate-400">데이터가 없습니다</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="shadow-sm border-slate-200/60 bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold text-slate-700">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={2}
                dataKey="total"
                nameKey="categoryName"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.categoryColor} strokeWidth={0} />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null
                  const item = payload[0].payload as CategoryBreakdown
                  return (
                    <div className="rounded-lg border bg-background p-2 shadow-lg">
                      <p className="font-medium">{item.categoryName}</p>
                      <p className="text-sm">{formatKRW(item.total)}</p>
                      <p className="text-xs text-muted-foreground">{item.percentage}%</p>
                    </div>
                  )
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
          {data.slice(0, 5).map((item) => (
            <div key={item.categoryId} className="flex items-center text-xs">
              <span
                className="mr-1.5 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.categoryColor }}
              />
              <span className="text-slate-500">{item.categoryName}</span>
              <span className="ml-1 font-medium text-slate-700">{item.percentage}%</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
