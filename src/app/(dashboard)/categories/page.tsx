import { getCategories } from '@/actions/categories'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CategoryDialog } from './category-dialog'
import { DeleteCategoryButton } from './delete-category-button'

export default async function CategoriesPage() {
  const result = await getCategories()

  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <p className="text-muted-foreground">카테고리를 불러오는 데 실패했습니다</p>
      </div>
    )
  }

  const categories = result.data
  const incomeCategories = categories.filter((c) => c.type === 'INCOME')
  const expenseCategories = categories.filter((c) => c.type === 'EXPENSE')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">카테고리 관리</h1>
        <CategoryDialog />
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList>
          <TabsTrigger value="income">수입 카테고리</TabsTrigger>
          <TabsTrigger value="expense">지출 카테고리</TabsTrigger>
        </TabsList>

        <TabsContent value="income" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">수입 카테고리</CardTitle>
            </CardHeader>
            <CardContent>
              {incomeCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  수입 카테고리가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {incomeCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium">{cat.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {cat._count.transactions}건
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <CategoryDialog category={cat} />
                        <DeleteCategoryButton
                          categoryId={cat.id}
                          transactionCount={cat._count.transactions}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">지출 카테고리</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseCategories.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  지출 카테고리가 없습니다
                </p>
              ) : (
                <div className="space-y-2">
                  {expenseCategories.map((cat) => (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className="h-4 w-4 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-medium">{cat.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {cat._count.transactions}건
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <CategoryDialog category={cat} />
                        <DeleteCategoryButton
                          categoryId={cat.id}
                          transactionCount={cat._count.transactions}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
