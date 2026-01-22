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
          <div className="space-y-3">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between rounded-lg p-2 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Badge
                    variant="outline"
                    style={{
                      borderColor: tx.categoryColor,
                      color: tx.categoryColor,
                    }}
                  >
                    {tx.categoryName}
                  </Badge>
                  <div>
                    <p className="text-sm font-medium">
                      {tx.description || tx.categoryName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatShortDate(tx.date)}
                    </p>
                  </div>
                </div>
                <span
                  className={cn(
                    'font-mono text-sm font-medium',
                    tx.type === 'INCOME' ? 'text-emerald-500' : 'text-rose-500'
                  )}
                >
                  {tx.type === 'INCOME' ? '+' : '-'}
                  {formatKRW(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
