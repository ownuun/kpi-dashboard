import { TransactionType } from '@prisma/client'

// ============================================
// 공통 타입
// ============================================

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string }

// ============================================
// 대시보드 타입
// ============================================

export interface DashboardMetrics {
  income: {
    total: number
    previousTotal: number
    changePercent: number
  }
  expense: {
    total: number
    previousTotal: number
    changePercent: number
  }
  netProfit: {
    total: number
    previousTotal: number
    changePercent: number
  }
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  categoryColor: string
  total: number
  percentage: number
}

export interface MonthlyTrend {
  month: string
  income: number
  expense: number
  netProfit: number
}

export interface RecentTransaction {
  id: string
  type: TransactionType
  amount: number
  description: string | null
  date: Date
  categoryName: string
  categoryColor: string
  createdByName: string | null
}

export interface DashboardData {
  metrics: DashboardMetrics
  incomeByCategory: CategoryBreakdown[]
  expenseByCategory: CategoryBreakdown[]
  monthlyTrend: MonthlyTrend[]
  recentTransactions: RecentTransaction[]
}

// ============================================
// 거래 타입
// ============================================

export interface TransactionWithCategory {
  id: string
  type: TransactionType
  amount: number
  description: string | null
  date: Date
  category: {
    id: string
    name: string
    color: string
  }
  createdBy: {
    name: string | null
  }
  createdAt: Date
}

export interface TransactionFilters {
  startDate?: Date
  endDate?: Date
  type?: TransactionType
  categoryId?: string
}

export interface PaginatedTransactions {
  transactions: TransactionWithCategory[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ============================================
// 카테고리 타입
// ============================================

export interface CategoryWithCount {
  id: string
  name: string
  type: TransactionType
  color: string
  _count: {
    transactions: number
  }
}

// ============================================
// 팀 타입
// ============================================

export interface TeamWithMembers {
  id: string
  name: string
  inviteCode: string
  users: {
    id: string
    name: string | null
    email: string
    image: string | null
  }[]
  _count: {
    users: number
    transactions: number
  }
}
