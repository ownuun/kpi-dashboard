'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { deleteCategory } from '@/actions/categories'

interface DeleteCategoryButtonProps {
  categoryId: string
  transactionCount: number
}

export function DeleteCategoryButton({
  categoryId,
  transactionCount,
}: DeleteCategoryButtonProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const canDelete = transactionCount === 0

  const handleDelete = async () => {
    if (!canDelete) return

    setIsDeleting(true)
    try {
      const result = await deleteCategory(categoryId)
      if (result.success) {
        toast.success('카테고리가 삭제되었습니다')
        setOpen(false)
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('삭제 중 오류가 발생했습니다')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>카테고리 삭제</DialogTitle>
          <DialogDescription>
            {canDelete
              ? '이 카테고리를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.'
              : `이 카테고리에 ${transactionCount}건의 거래가 있습니다. 먼저 거래를 삭제하거나 다른 카테고리로 이동해주세요.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting || !canDelete}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                삭제 중...
              </>
            ) : (
              '삭제'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
