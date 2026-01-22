import Link from 'next/link'
import { Plus } from 'lucide-react'
import { getDashboardData } from '@/actions/dashboard'
import { Button } from '@/components/ui/button'
import { MetricCard } from '@/components/dashboard/metric-card'
import { TrendChart } from '@/components/dashboard/trend-chart'
import { CategoryDonut } from '@/components/dashboard/category-donut'
import { RecentTransactions } from '@/components/dashboard/recent-transactions'

export default async function DashboardPage() {
  const result = await getDashboardData()

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">데이터를 불러오는 데 실패했습니다</p>
        <Button asChild>
          <Link href="/">새로고침</Link>
        </Button>
      </div>
    )
  }

  const { metrics, incomeByCategory, expenseByCategory, monthlyTrend, recentTransactions } =
    result.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">대시보드</h1>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="mr-2 h-4 w-4" />
            거래 추가
          </Link>
        </Button>
      </div>

      <TrendChart data={monthlyTrend} />

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard
          title="이번 달 수입"
          value={metrics.income.total}
          changePercent={metrics.income.changePercent}
          type="income"
        />
        <MetricCard
          title="이번 달 지출"
          value={metrics.expense.total}
          changePercent={metrics.expense.changePercent}
          type="expense"
        />
        <MetricCard
          title="이번 달 순이익"
          value={metrics.netProfit.total}
          changePercent={metrics.netProfit.changePercent}
          type="profit"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <CategoryDonut title="수입 카테고리" data={incomeByCategory} />
        <CategoryDonut title="지출 카테고리" data={expenseByCategory} />
      </div>

      <RecentTransactions transactions={recentTransactions} />
    </div>
  )
}
