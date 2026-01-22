'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Pencil, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createCategory, updateCategory } from '@/actions/categories'
import type { CategoryWithCount } from '@/types'

const COLORS = [
  '#3B82F6',
  '#8B5CF6',
  '#10B981',
  '#EF4444',
  '#F97316',
  '#EC4899',
  '#14B8A6',
  '#6B7280',
  '#84CC16',
  '#06B6D4',
]

interface CategoryDialogProps {
  category?: CategoryWithCount
}

export function CategoryDialog({ category }: CategoryDialogProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const [name, setName] = useState(category?.name ?? '')
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>(category?.type ?? 'EXPENSE')
  const [color, setColor] = useState(category?.color ?? COLORS[0])

  const isEdit = !!category

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast.error('카테고리 이름을 입력해주세요')
      return
    }

    setIsLoading(true)

    try {
      const formData = new FormData()
      formData.set('name', name.trim())
      formData.set('color', color)

      if (isEdit) {
        const result = await updateCategory(category.id, formData)
        if (result.success) {
          toast.success('카테고리가 수정되었습니다')
          setOpen(false)
          router.refresh()
        } else {
          toast.error(result.error)
        }
      } else {
        formData.set('type', type)
        const result = await createCategory(formData)
        if (result.success) {
          toast.success('카테고리가 생성되었습니다')
          setOpen(false)
          setName('')
          setType('EXPENSE')
          setColor(COLORS[0])
          router.refresh()
        } else {
          toast.error(result.error)
        }
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            카테고리 추가
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? '카테고리 수정' : '새 카테고리'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input
              id="name"
              placeholder="카테고리 이름"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {!isEdit && (
            <div className="space-y-2">
              <Label>유형</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as 'INCOME' | 'EXPENSE')}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCOME">수입</SelectItem>
                  <SelectItem value="EXPENSE">지출</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label>색상</Label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`h-8 w-8 rounded-full transition-all ${
                    color === c ? 'ring-2 ring-offset-2 ring-primary' : ''
                  }`}
                  style={{ backgroundColor: c }}
                  disabled={isLoading}
                />
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : isEdit ? (
              '수정하기'
            ) : (
              '추가하기'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
