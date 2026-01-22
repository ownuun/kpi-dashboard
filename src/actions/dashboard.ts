'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type {
  DashboardData,
  DashboardMetrics,
  CategoryBreakdown,
  MonthlyTrend,
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

async function getMetrics(teamId: string): Promise<DashboardMetrics> {
  const now = new Date()
  const { start: curStart, end: curEnd } = getMonthBounds(now)
  const { start: prevStart, end: prevEnd } = getPreviousMonthBounds(now)

  const [curIncome, curExpense, prevIncome, prevExpense] = await Promise.all([
    prisma.transaction.aggregate({
      where: { teamId, type: 'INCOME', date: { gte: curStart, lte: curEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { teamId, type: 'EXPENSE', date: { gte: curStart, lte: curEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { teamId, type: 'INCOME', date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: { teamId, type: 'EXPENSE', date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }),
  ])

  const incomeTotal = curIncome._sum.amount ?? 0
  const expenseTotal = curExpense._sum.amount ?? 0
  const prevIncomeTotal = prevIncome._sum.amount ?? 0
  const prevExpenseTotal = prevExpense._sum.amount ?? 0

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

async function getIncomeByCategory(teamId: string): Promise<CategoryBreakdown[]> {
  const now = new Date()
  const { start, end } = getMonthBounds(now)

  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { teamId, type: 'INCOME', date: { gte: start, lte: end } },
    _sum: { amount: true },
  })

  if (grouped.length === 0) return []

  const total = grouped.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0)
  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId) } },
    select: { id: true, name: true, color: true },
  })

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return grouped
    .map((g) => {
      const cat = categoryMap.get(g.categoryId)
      const amount = g._sum.amount ?? 0
      return {
        categoryId: g.categoryId,
        categoryName: cat?.name ?? 'Unknown',
        categoryColor: cat?.color ?? '#6B7280',
        total: amount,
        percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

async function getExpenseByCategory(teamId: string): Promise<CategoryBreakdown[]> {
  const now = new Date()
  const { start, end } = getMonthBounds(now)

  const grouped = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: { teamId, type: 'EXPENSE', date: { gte: start, lte: end } },
    _sum: { amount: true },
  })

  if (grouped.length === 0) return []

  const total = grouped.reduce((sum, g) => sum + (g._sum.amount ?? 0), 0)
  const categories = await prisma.category.findMany({
    where: { id: { in: grouped.map((g) => g.categoryId) } },
    select: { id: true, name: true, color: true },
  })

  const categoryMap = new Map(categories.map((c) => [c.id, c]))

  return grouped
    .map((g) => {
      const cat = categoryMap.get(g.categoryId)
      const amount = g._sum.amount ?? 0
      return {
        categoryId: g.categoryId,
        categoryName: cat?.name ?? 'Unknown',
        categoryColor: cat?.color ?? '#6B7280',
        total: amount,
        percentage: total > 0 ? Math.round((amount / total) * 1000) / 10 : 0,
      }
    })
    .sort((a, b) => b.total - a.total)
}

async function getMonthlyTrend(teamId: string): Promise<MonthlyTrend[]> {
  const trends: MonthlyTrend[] = []
  const now = new Date()

  for (let i = 5; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const { start, end } = getMonthBounds(date)

    const [income, expense] = await Promise.all([
      prisma.transaction.aggregate({
        where: { teamId, type: 'INCOME', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      prisma.transaction.aggregate({
        where: { teamId, type: 'EXPENSE', date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ])

    const incomeTotal = income._sum.amount ?? 0
    const expenseTotal = expense._sum.amount ?? 0

    trends.push({
      month: date.toLocaleDateString('ko-KR', { month: 'short' }),
      income: incomeTotal,
      expense: expenseTotal,
      netProfit: incomeTotal - expenseTotal,
    })
  }

  return trends
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

    const [metrics, incomeByCategory, expenseByCategory, monthlyTrend, recentTransactions] =
      await Promise.all([
        getMetrics(teamId),
        getIncomeByCategory(teamId),
        getExpenseByCategory(teamId),
        getMonthlyTrend(teamId),
        getRecentTransactions(teamId),
      ])

    return {
      success: true,
      data: {
        metrics,
        incomeByCategory,
        expenseByCategory,
        monthlyTrend,
        recentTransactions,
      },
    }
  } catch (error) {
    console.error('getDashboardData error:', error)
    return { success: false, error: 'Failed to fetch dashboard data' }
  }
}
