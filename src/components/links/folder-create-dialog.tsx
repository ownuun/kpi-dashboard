'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { createFolder, updateFolder } from '@/actions/link-folders'
import type { LinkFolderWithChildren, LinkOwnerType } from '@/types/links'

const formSchema = z.object({
  name: z.string().min(1, '폴더 이름을 입력해주세요').max(100),
  icon: z.string().max(50).optional(),
})

type FormValues = z.infer<typeof formSchema>

interface FolderCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ownerType: LinkOwnerType
  editingFolder?: LinkFolderWithChildren | null
  parentId?: string | null
}

export function FolderCreateDialog({
  open,
  onOpenChange,
  ownerType,
  editingFolder,
  parentId,
}: FolderCreateDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isEditing = !!editingFolder

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      icon: '',
    },
  })

  useEffect(() => {
    if (editingFolder) {
      form.reset({
        name: editingFolder.name,
        icon: editingFolder.icon || '',
      })
    } else {
      form.reset({ name: '', icon: '' })
    }
  }, [editingFolder, form])

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)

    try {
      const result = isEditing
        ? await updateFolder(editingFolder!.id, values)
        : await createFolder({
            ...values,
            ownerType,
            parentId: parentId ?? null,
          })

      if (result.success) {
        toast.success(isEditing ? '폴더가 수정되었습니다' : '폴더가 생성되었습니다')
        onOpenChange(false)
        form.reset()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '폴더 수정' : '새 폴더'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>폴더 이름</FormLabel>
                  <FormControl>
                    <Input placeholder="폴더 이름" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                취소
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? '저장 중...' : isEditing ? '수정' : '생성'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
