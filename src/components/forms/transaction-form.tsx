'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { format } from 'date-fns'
import { CalendarIcon } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { CurrencyInput } from './currency-input'
import { cn } from '@/lib/utils'
import { createTransaction, updateTransaction } from '@/actions/transactions'
import type { CategoryWithCount, TransactionWithCategory } from '@/types'

const formSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE']),
  amount: z.number().min(1, '금액을 입력해주세요'),
  categoryId: z.string().min(1, '카테고리를 선택해주세요'),
  date: z.date(),
  description: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

interface TransactionFormProps {
  categories: CategoryWithCount[]
  initialData?: TransactionWithCategory
  onSuccess?: () => void
}

export function TransactionForm({
  categories,
  initialData,
  onSuccess,
}: TransactionFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: initialData?.type ?? 'EXPENSE',
      amount: initialData?.amount ?? 0,
      categoryId: initialData?.category.id ?? '',
      date: initialData?.date ? new Date(initialData.date) : new Date(),
      description: initialData?.description ?? '',
    },
  })

  const selectedType = form.watch('type')
  const filteredCategories = categories.filter((c) => c.type === selectedType)

  const handleTypeChange = (type: 'INCOME' | 'EXPENSE') => {
    form.setValue('type', type)
    form.setValue('categoryId', '')
  }

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.set('type', values.type)
      formData.set('amount', values.amount.toString())
      formData.set('categoryId', values.categoryId)
      formData.set('date', values.date.toISOString())
      if (values.description) {
        formData.set('description', values.description)
      }

      const result = initialData
        ? await updateTransaction(initialData.id, formData)
        : await createTransaction(formData)

      if (result.success) {
        toast.success(initialData ? '거래가 수정되었습니다' : '거래가 등록되었습니다')
        onSuccess?.()
        router.push('/transactions')
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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>유형</FormLabel>
              <FormControl>
                <Tabs
                  value={field.value}
                  onValueChange={(v) => handleTypeChange(v as 'INCOME' | 'EXPENSE')}
                >
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="INCOME">수입</TabsTrigger>
                    <TabsTrigger value="EXPENSE">지출</TabsTrigger>
                  </TabsList>
                </Tabs>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>금액</FormLabel>
              <FormControl>
                <CurrencyInput
                  value={field.value}
                  onValueChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="categoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>카테고리</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>날짜</FormLabel>
              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full pl-3 text-left font-normal',
                        !field.value && 'text-muted-foreground'
                      )}
                    >
                      {field.value ? (
                        format(field.value, 'yyyy년 MM월 dd일')
                      ) : (
                        <span>날짜 선택</span>
                      )}
                      <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={field.value}
                    onSelect={field.onChange}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명 (선택)</FormLabel>
              <FormControl>
                <Input placeholder="거래 설명" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : initialData ? '수정하기' : '저장하기'}
        </Button>
      </form>
    </Form>
  )
}
