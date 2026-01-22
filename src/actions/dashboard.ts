'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import type {
  DashboardData,
  DashboardMetrics,
  CategoryBreakdown,
  MonthlyTrend,
  WeeklyTrend,
  RecentTransaction,
  ActionResult,
} from '@/types'

function getMonthBounds(date: Date): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1)
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

function getPreviousMonthBounds(date: Date): { start: Date; end: Date } {
  const prev = new Date(date.getFullYear(), date.getMonth() - 1, 1)
  return getMonthBounds(prev)
}

interface MetricsRow {
  period: string
  type: string
  total: bigint | null
}

async function getMetrics(teamId: string): Promise<DashboardMetrics> {
  const now = new Date()
  const { start: curStart, end: curEnd } = getMonthBounds(now)
  const { start: prevStart, end: prevEnd } = getPreviousMonthBounds(now)

  const results = await prisma.$queryRaw<MetricsRow[]>`
    SELECT 
      CASE 
        WHEN date >= ${curStart} AND date <= ${curEnd} THEN 'current'
        ELSE 'previous'
      END as period,
      type,
      SUM(amount) as total
    FROM transactions
    WHERE team_id = ${teamId}
      AND ((date >= ${curStart} AND date <= ${curEnd}) 
           OR (date >= ${prevStart} AND date <= ${prevEnd}))
    GROUP BY 1, type
  `

  const getData = (period: string, type: string) => {
    const row = results.find(r => r.period === period && r.type === type)
    return Number(row?.total ?? 0)
  }

  const incomeTotal = getData('current', 'INCOME')
  const expenseTotal = getData('current', 'EXPENSE')
  const prevIncomeTotal = getData('previous', 'INCOME')
  const prevExpenseTotal = getData('previous', 'EXPENSE')

  const incomeChange = prevIncomeTotal > 0
    ? ((incomeTotal - prevIncomeTotal) / prevIncomeTotal) * 100
    : 0
  const expenseChange = prevExpenseTotal > 0
    ? ((expenseTotal - prevExpenseTotal) / prevExpenseTotal) * 100
    : 0

  const netProfit = incomeTotal - expenseTotal
  const prevNetProfit = prevIncomeTotal - prevExpenseTotal
  const netProfitChange = prevNetProfit !== 0
    ? ((netProfit - prevNetProfit) / Math.abs(prevNetProfit)) * 100
    : 0

  return {
    income: {
      total: incomeTotal,
      previousTotal: prevIncomeTotal,
      changePercent: Math.round(incomeChange * 10) / 10,
    },
    expense: {
      total: expenseTotal,
      previousTotal: prevExpenseTotal,
      changePercent: Math.round(expenseChange * 10) / 10,
    },
    netProfit: {
      total: netProfit,
      previousTotal: prevNetProfit,
      changePercent: Math.round(netProfitChange * 10) / 10,
    },
  }
}

interface CategoryRow {
  category_id: string
  name: string
  color: string
  type: string
  total: bigint
}

async function getCategoryBreakdown(teamId: string): Promise<{
  income: CategoryBreakdown[]
  expense: CategoryBreakdown[]
}> {
  const now = new Date()
  const { start, end } = getMonthBounds(now)

  const results = await prisma.$queryRaw<CategoryRow[]>`
    SELECT 
      t.category_id,
      c.name,
      c.color,
      t.type,
      SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.team_id = ${teamId}
      AND t.date >= ${start} AND t.date <= ${end}
    GROUP BY t.category_id, c.name, c.color, t.type
    ORDER BY total DESC
  `

  const processType = (type: string): CategoryBreakdown[] => {
    const filtered = results.filter(r => r.type === type)
    const total = filtered.reduce((sum, r) => sum + Number(r.total), 0)
    return filtered.map(r => ({
      categoryId: r.category_id,
      categoryName: r.name,
      categoryColor: r.color,
      total: Number(r.total),
      percentage: total > 0 ? Math.round((Number(r.total) / total) * 1000) / 10 : 0,
    }))
  }

  return {
    income: processType('INCOME'),
    expense: processType('EXPENSE'),
  }
}

interface TrendRow {
  period_start: Date
  type: string
  total: bigint
}

async function getMonthlyTrend(teamId: string): Promise<MonthlyTrend[]> {
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1)

  const results = await prisma.$queryRaw<TrendRow[]>`
    SELECT 
      DATE_TRUNC('month', date) as period_start,
      type,
      SUM(amount) as total
    FROM transactions
    WHERE team_id = ${teamId}
      AND date >= ${sixMonthsAgo}
    GROUP BY period_start, type
    ORDER BY period_start
  `

  const months: MonthlyTrend[] = []
  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const monthStart = date.getTime()
    
    const income = results.find(r => 
      r.type === 'INCOME' && new Date(r.period_start).getMonth() === date.getMonth() &&
      new Date(r.period_start).getFullYear() === date.getFullYear()
    )
    const expense = results.find(r => 
      r.type === 'EXPENSE' && new Date(r.period_start).getMonth() === date.getMonth() &&
      new Date(r.period_start).getFullYear() === date.getFullYear()
    )
    
    const incomeTotal = Number(income?.total ?? 0)
    const expenseTotal = Number(expense?.total ?? 0)
    
    months.push({
      month: date.toLocaleDateString('ko-KR', { month: 'short' }),
      income: incomeTotal,
      expense: expenseTotal,
      netProfit: incomeTotal - expenseTotal,
    })
  }

  return months
}

function getWeekBounds(date: Date): { start: Date; end: Date } {
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  const start = new Date(date.getFullYear(), date.getMonth(), diff)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 6)
  end.setHours(23, 59, 59, 999)
  return { start, end }
}

async function getWeeklyTrend(teamId: string): Promise<WeeklyTrend[]> {
  const now = new Date()
  const eightWeeksAgo = new Date(now)
  eightWeeksAgo.setDate(eightWeeksAgo.getDate() - 8 * 7)

  const results = await prisma.$queryRaw<TrendRow[]>`
    SELECT 
      DATE_TRUNC('week', date) as period_start,
      type,
      SUM(amount) as total
    FROM transactions
    WHERE team_id = ${teamId}
      AND date >= ${eightWeeksAgo}
    GROUP BY period_start, type
    ORDER BY period_start
  `

  const weeks: WeeklyTrend[] = []
  for (let i = 7; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i * 7)
    const { start } = getWeekBounds(date)
    
    const weekStart = new Date(start)
    weekStart.setHours(0, 0, 0, 0)
    
    const income = results.find(r => {
      const rStart = new Date(r.period_start)
      return r.type === 'INCOME' && 
        rStart.getFullYear() === weekStart.getFullYear() &&
        rStart.getMonth() === weekStart.getMonth() &&
        rStart.getDate() === weekStart.getDate()
    })
    const expense = results.find(r => {
      const rStart = new Date(r.period_start)
      return r.type === 'EXPENSE' && 
        rStart.getFullYear() === weekStart.getFullYear() &&
        rStart.getMonth() === weekStart.getMonth() &&
        rStart.getDate() === weekStart.getDate()
    })
    
    const incomeTotal = Number(income?.total ?? 0)
    const expenseTotal = Number(expense?.total ?? 0)
    
    weeks.push({
      week: `${start.getMonth() + 1}/${start.getDate()}`,
      income: incomeTotal,
      expense: expenseTotal,
      netProfit: incomeTotal - expenseTotal,
    })
  }

  return weeks
}

async function getRecentTransactions(
  teamId: string,
  limit = 10
): Promise<RecentTransaction[]> {
  const transactions = await prisma.transaction.findMany({
    where: { teamId },
    include: {
      category: { select: { name: true, color: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { date: 'desc' },
    take: limit,
  })

  return transactions.map((t) => ({
    id: t.id,
    type: t.type,
    amount: t.amount,
    description: t.description,
    date: t.date,
    categoryName: t.category.name,
    categoryColor: t.category.color,
    createdByName: t.createdBy.name,
  }))
}

export async function getDashboardData(): Promise<ActionResult<DashboardData>> {
  try {
    const session = await auth()

    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    const teamId = session.user.teamId

    const [metrics, categoryBreakdown, monthlyTrend, weeklyTrend, recentTransactions] =
      await Promise.all([
        getMetrics(teamId),
        getCategoryBreakdown(teamId),
        getMonthlyTrend(teamId),
        getWeeklyTrend(teamId),
        getRecentTransactions(teamId),
      ])

    return {
      success: true,
      data: {
        metrics,
        incomeByCategory: categoryBreakdown.income,
        expenseByCategory: categoryBreakdown.expense,
        monthlyTrend,
        weeklyTrend,
        recentTransactions,
      },
    }
  } catch (error) {
    console.error('getDashboardData error:', error)
    return { success: false, error: 'Failed to fetch dashboard data' }
  }
}
