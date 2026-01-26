import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatKRW, formatShortDate } from '@/lib/format'
import type { RecentTransaction } from '@/types'

interface RecentTransactionsProps {
  transactions: RecentTransaction[]
}

export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  return (
    <Card className="shadow-sm border-slate-200/60 bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base font-semibold text-slate-700">최근 거래</CardTitle>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/transactions" className="flex items-center gap-1">
            전체 보기
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-8">
            아직 거래 내역이 없습니다
          </p>
        ) : (
          <div className="space-y-2">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex flex-col gap-1.5 rounded-lg p-2.5 border border-slate-100 hover:bg-muted/50 transition-colors sm:grid sm:grid-cols-[auto_1fr_auto_auto] sm:items-center sm:gap-4 sm:border-0 sm:p-2"
              >
                <div className="flex items-center justify-between sm:justify-start">
                  <Badge
                    variant="outline"
                    className="text-xs"
                    style={{
                      borderColor: tx.categoryColor,
                      color: tx.categoryColor,
                    }}
                  >
                    {tx.categoryName}
                  </Badge>
                  <span className="text-xs text-muted-foreground sm:hidden">
                    {formatShortDate(tx.date)}
                  </span>
                </div>
                <p className="text-sm font-medium truncate hidden sm:block">
                  {tx.description || tx.categoryName}
                </p>
                <p className="text-xs text-muted-foreground hidden sm:block w-14 text-right">
                  {formatShortDate(tx.date)}
                </p>
                <span
                  className={cn(
                    'font-mono text-sm font-medium w-24 text-right hidden sm:block',
                    tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                  )}
                >
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {formatKRW(tx.amount)}
                </span>
                <div className="flex items-center justify-between sm:hidden">
                  <span className="text-sm font-medium truncate">
                    {tx.description || tx.categoryName}
                  </span>
                  <span
                    className={cn(
                      'font-mono text-sm font-medium shrink-0',
                      tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                    )}
                  >
                    {tx.type === 'INCOME' ? '+' : '-'}
                    {formatKRW(tx.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
