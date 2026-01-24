'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { navigationConfig, type NavCategory } from '@/config/navigation'

interface SidebarProps {
  enabledTemplates?: string[]
}

function NavCategorySection({ category }: { category: NavCategory }) {
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

export function Sidebar({ enabledTemplates = ['sales'] }: SidebarProps) {
  const filteredNavigation = useMemo(() => {
    return navigationConfig.filter((category) => {
      if (!category.isTemplate) return true
      return enabledTemplates.includes(category.key)
    })
  }, [enabledTemplates])

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-slate-200/70 bg-white hidden lg:block">
      <div className="flex h-16 items-center border-b border-slate-200/70 px-6">
        <Link href="/" className="text-lg font-semibold text-slate-800">
          KPI Dashboard
        </Link>
      </div>

      <nav className="p-4 space-y-2">
        {filteredNavigation.map((category) => (
          <NavCategorySection key={category.key} category={category} />
        ))}
      </nav>
    </aside>
  )
}
