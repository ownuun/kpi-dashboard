import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { formatKRWParts, formatPercent } from '@/lib/format'

interface MetricCardProps {
  title: string
  value: number
  changePercent?: number
  type?: 'income' | 'expense' | 'profit' | 'cumulative'
  className?: string
}

export function MetricCard({
  title,
  value,
  changePercent,
  type = 'profit',
  className,
}: MetricCardProps) {
  const isPositive = changePercent !== undefined && changePercent > 0
  const isNeutral = changePercent === undefined || changePercent === 0

  const colorMap: Record<string, string> = {
    income: 'text-emerald-500',
    expense: 'text-rose-500',
    profit: value >= 0 ? 'text-sky-600' : 'text-rose-500',
    cumulative: value >= 0 ? 'text-violet-600' : 'text-rose-500',
  }

  return (
    <Card className={cn('overflow-hidden shadow-sm border-slate-200/60 bg-white', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 md:pb-2 md:pt-5 md:px-6">
        <CardTitle className="text-xs md:text-sm font-medium text-slate-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 md:px-6 md:pb-5">
        <div className={cn('font-semibold font-mono tracking-tight', colorMap[type])}>
          <span className="text-sm sm:text-xs lg:text-lg">{formatKRWParts(value).symbol}</span>
          <span className="text-lg sm:text-sm lg:text-xl">{formatKRWParts(value).number}</span>
        </div>
        {changePercent !== undefined && (
          <div className="mt-2 flex items-center text-xs">
            {isNeutral ? (
              <Minus className="mr-1 h-3 w-3 text-slate-400" />
            ) : isPositive ? (
              <ArrowUpRight className="mr-1 h-3 w-3 text-emerald-500" />
            ) : (
              <ArrowDownRight className="mr-1 h-3 w-3 text-rose-500" />
            )}
            <span
              className={cn(
                'font-medium',
                isNeutral
                  ? 'text-slate-400'
                  : isPositive
                  ? 'text-emerald-500'
                  : 'text-rose-500'
              )}
            >
              {formatPercent(changePercent)}
            </span>
            <span className="ml-1.5 text-slate-400">전월 대비</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
