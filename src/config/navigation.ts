import {
  LayoutDashboard,
  Receipt,
  Tags,
  Settings,
  Puzzle,
  TrendingUp,
  Link2,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  key: string
  label: string
  href: string
  icon: LucideIcon
}

export interface NavCategory {
  key: string
  label: string
  icon: LucideIcon
  items: NavItem[]
  defaultOpen?: boolean
  isTemplate?: boolean
}

export const navigationConfig: NavCategory[] = [
  {
    key: 'sales',
    label: '매출관리',
    icon: TrendingUp,
    defaultOpen: true,
    isTemplate: true,
    items: [
      { key: 'dashboard', label: '대시보드', href: '/', icon: LayoutDashboard },
      { key: 'transactions', label: '거래', href: '/transactions', icon: Receipt },
      { key: 'categories', label: '카테고리', href: '/categories', icon: Tags },
    ],
  },
  {
    key: 'links',
    label: '링크 공유',
    icon: Link2,
    defaultOpen: true,
    isTemplate: true,
    items: [
      { key: 'links-main', label: '링크', href: '/links', icon: Link2 },
    ],
  },
  {
    key: 'settings',
    label: '설정',
    icon: Settings,
    defaultOpen: true,
    items: [
      { key: 'settings-general', label: '일반 설정', href: '/settings', icon: Settings },
      { key: 'settings-templates', label: '템플릿', href: '/settings/templates', icon: Puzzle },
    ],
  },
]
