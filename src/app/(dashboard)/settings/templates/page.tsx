'use client'

import { useState } from 'react'
import Image from 'next/image'
import { LayoutDashboard, Receipt, Tags, X, Check } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import * as VisuallyHidden from '@radix-ui/react-visually-hidden'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const salesTemplate = {
  key: 'sales',
  name: '매출관리',
  description: '수입과 지출을 체계적으로 관리하고 핵심 지표를 한눈에 파악하세요.',
  image: '/templates/sales-dashboard.png',
  color: 'from-blue-500 to-indigo-600',
  templates: [
    { key: 'dashboard', name: '대시보드', description: '핵심 지표를 한눈에 확인', icon: LayoutDashboard },
    { key: 'transactions', name: '거래', description: '수입/지출 내역 관리', icon: Receipt },
    { key: 'categories', name: '카테고리', description: '거래 분류 체계 관리', icon: Tags },
  ],
}

export default function TemplatesPage() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800">템플릿</h1>
        <p className="text-muted-foreground mt-1">
          필요한 기능을 선택하여 대시보드를 구성하세요
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <button
          onClick={() => setIsOpen(true)}
          className="group text-left rounded-xl border border-slate-200 bg-white overflow-hidden transition-all hover:shadow-lg hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          <div className="h-36 relative overflow-hidden">
            <Image
              src={salesTemplate.image}
              alt={salesTemplate.name}
              fill
              className="object-cover object-top"
            />
          </div>
          <div className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
                {salesTemplate.name}
              </h3>
              <Badge className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-100">기본</Badge>
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {salesTemplate.description}
            </p>
          </div>
        </button>
      </div>

      <div className="pt-8 border-t">
        <p className="text-sm text-muted-foreground text-center">
          더 많은 템플릿이 곧 추가될 예정입니다
        </p>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[95vw] md:w-[70vw] sm:max-w-none h-[85vh] md:h-[70vh] p-0 gap-0 overflow-hidden [&>button]:hidden">
          <VisuallyHidden.Root>
            <DialogTitle>매출관리 템플릿 상세</DialogTitle>
          </VisuallyHidden.Root>
          <div className="flex flex-col md:flex-row h-full overflow-hidden">
            <div className="h-48 md:h-auto md:w-1/2 relative shrink-0 bg-slate-100">
              <Image
                src={salesTemplate.image}
                alt={salesTemplate.name}
                fill
                className="object-cover object-top"
              />
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-3 left-3 rounded-full p-1.5 bg-black/20 hover:bg-black/30 transition-colors md:hidden"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
            
            <div className="flex-1 p-5 md:p-6 overflow-y-auto min-h-0">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl md:text-2xl font-bold text-slate-800 mb-1">
                    {salesTemplate.name}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {salesTemplate.description}
                  </p>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="hidden md:flex rounded-full p-1.5 hover:bg-slate-100 transition-colors shrink-0 ml-4"
                >
                  <X className="h-5 w-5 text-slate-500" />
                </button>
              </div>
              
              <div className="mb-5">
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">포함된 기능</h4>
                <div className="space-y-2">
                  {salesTemplate.templates.map((template) => (
                    <div key={template.key} className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">
                        <template.icon className="h-4 w-4 text-slate-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{template.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <Button disabled className="w-full" size="default">
                  <Check className="h-4 w-4 mr-2" />
                  사용 중
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  기본 템플릿은 비활성화할 수 없습니다
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
