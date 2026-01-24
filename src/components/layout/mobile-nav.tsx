'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import { navigationConfig, type NavCategory } from '@/config/navigation'

interface MobileNavProps {
  enabledTemplates?: string[]
}

function MobileNavCategory({ 
  category, 
  onItemClick 
}: { 
  category: NavCategory
  onItemClick: () => void 
}) {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(category.defaultOpen ?? false)
  
  const hasActiveItem = category.items.some(item => 
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
  )

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors',
          hasActiveItem
            ? 'text-slate-900'
            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
        )}
      >
        <span className="flex items-center gap-2">
          <category.icon className="h-4 w-4" />
          {category.label}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      <div
        className={cn(
          'overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-96' : 'max-h-0'
        )}
      >
        <div className="ml-4 space-y-1 border-l border-slate-200 pl-3">
          {category.items.map((item) => {
            const isActive = pathname === item.href
            
            return (
              <Link
                key={item.key}
                href={item.href}
                onClick={onItemClick}
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-slate-100 text-slate-900 font-medium'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function MobileNav({ enabledTemplates = ['sales'] }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  const filteredNavigation = useMemo(() => {
    return navigationConfig.filter((category) => {
      if (!category.isTemplate) return true
      return enabledTemplates.includes(category.key)
    })
  }, [enabledTemplates])

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">메뉴 열기</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <SheetHeader className="h-16 flex items-center justify-center border-b border-slate-200/70 px-6">
          <SheetTitle className="text-lg font-semibold text-slate-800">
            KPI Dashboard
          </SheetTitle>
        </SheetHeader>
        <nav className="p-4 space-y-2">
          {filteredNavigation.map((category) => (
            <MobileNavCategory 
              key={category.key} 
              category={category}
              onItemClick={() => setOpen(false)}
            />
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  )
}
