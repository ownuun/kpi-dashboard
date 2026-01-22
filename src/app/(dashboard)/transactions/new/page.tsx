import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCategories } from '@/actions/categories'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TransactionForm } from '@/components/forms/transaction-form'

export default async function NewTransactionPage() {
  const result = await getCategories()

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">카테고리를 불러오는 데 실패했습니다</p>
        <Button asChild>
          <Link href="/transactions">돌아가기</Link>
        </Button>
      </div>
    )
  }

  const categories = result.data

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">
          거래를 추가하려면 먼저 카테고리를 만들어야 합니다
        </p>
        <Button asChild>
          <Link href="/categories">카테고리 관리하기</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/transactions">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">거래 추가</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>거래 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <TransactionForm categories={categories} />
        </CardContent>
      </Card>
    </div>
  )
}
