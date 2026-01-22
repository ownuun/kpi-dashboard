import Link from 'next/link'
import { Plus, Trash2 } from 'lucide-react'
import { getTransactions, deleteTransaction } from '@/actions/transactions'
import { getCategories } from '@/actions/categories'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { formatKRW, formatDate } from '@/lib/format'
import { TransactionFilters } from './transaction-filters'
import { DeleteButton } from './delete-button'

interface TransactionsPageProps {
  searchParams: Promise<{
    type?: string
    categoryId?: string
    page?: string
  }>
}

export default async function TransactionsPage({ searchParams }: TransactionsPageProps) {
  const params = await searchParams
  const page = Number(params.page) || 1
  const type = params.type as 'INCOME' | 'EXPENSE' | undefined
  const categoryId = params.categoryId

  const [transactionsResult, categoriesResult] = await Promise.all([
    getTransactions({ type, categoryId }, page, 20),
    getCategories(),
  ])

  if (!transactionsResult.success || !categoriesResult.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">데이터를 불러오는 데 실패했습니다</p>
        <Button asChild>
          <Link href="/transactions">새로고침</Link>
        </Button>
      </div>
    )
  }

  const { transactions, total, totalPages } = transactionsResult.data
  const categories = categoriesResult.data

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">거래 내역</h1>
          <p className="text-sm text-muted-foreground">총 {total}건</p>
        </div>
        <Button asChild>
          <Link href="/transactions/new">
            <Plus className="mr-2 h-4 w-4" />
            거래 추가
          </Link>
        </Button>
      </div>

      <TransactionFilters
        categories={categories}
        currentType={type}
        currentCategoryId={categoryId}
      />

      {transactions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <p className="text-muted-foreground">거래 내역이 없습니다</p>
          <Button asChild>
            <Link href="/transactions/new">첫 거래 추가하기</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>날짜</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>설명</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="text-sm">
                      {formatDate(tx.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={tx.type === 'INCOME' ? 'default' : 'destructive'}>
                        {tx.type === 'INCOME' ? '수입' : '지출'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: tx.category.color }}
                        />
                        {tx.category.name}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate">
                      {tx.description || '-'}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right font-mono font-medium',
                        tx.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'
                      )}
                    >
                      {tx.type === 'INCOME' ? '+' : '-'}
                      {formatKRW(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <DeleteButton transactionId={tx.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              {page > 1 && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: '/transactions',
                      query: { ...params, page: page - 1 },
                    }}
                  >
                    이전
                  </Link>
                </Button>
              )}
              <span className="text-sm text-muted-foreground">
                {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Button variant="outline" size="sm" asChild>
                  <Link
                    href={{
                      pathname: '/transactions',
                      query: { ...params, page: page + 1 },
                    }}
                  >
                    다음
                  </Link>
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
