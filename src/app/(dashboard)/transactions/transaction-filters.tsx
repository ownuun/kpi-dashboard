'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { CategoryWithCount } from '@/types'

interface TransactionFiltersProps {
  categories: CategoryWithCount[]
  currentType?: 'INCOME' | 'EXPENSE'
  currentCategoryId?: string
}

export function TransactionFilters({
  categories,
  currentType,
  currentCategoryId,
}: TransactionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const updateFilter = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString())

    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.delete('page')

    router.push(`/transactions?${params.toString()}`)
  }

  const clearFilters = () => {
    router.push('/transactions')
  }

  const hasFilters = currentType || currentCategoryId

  const filteredCategories = currentType
    ? categories.filter((c) => c.type === currentType)
    : categories

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Select
        value={currentType || 'all'}
        onValueChange={(v) => {
          updateFilter('type', v)
          if (v !== 'all' && v !== currentType) {
            updateFilter('categoryId', undefined)
          }
        }}
      >
        <SelectTrigger className="w-[120px]">
          <SelectValue placeholder="유형" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 유형</SelectItem>
          <SelectItem value="INCOME">수입</SelectItem>
          <SelectItem value="EXPENSE">지출</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={currentCategoryId || 'all'}
        onValueChange={(v) => updateFilter('categoryId', v)}
      >
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="카테고리" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">전체 카테고리</SelectItem>
          {filteredCategories.map((cat) => (
            <SelectItem key={cat.id} value={cat.id}>
              <div className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          필터 초기화
        </Button>
      )}
    </div>
  )
}
