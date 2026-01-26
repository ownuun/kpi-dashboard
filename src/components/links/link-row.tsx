'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { MoreHorizontal, Pencil, Trash2, Copy, FolderInput, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { StarRatingModal } from './star-rating-modal'
import { recordLinkView, unrecordLinkView } from '@/actions/links'
import type { LinkWithDetails } from '@/types/links'

interface LinkRowProps {
  link: LinkWithDetails
  onEdit?: (link: LinkWithDetails) => void
  onDelete?: (linkId: string) => void
  onCopyToPersonal?: (linkId: string) => void
  onRatingChange?: (linkId: string, rating: number) => void
  onMove?: (link: LinkWithDetails) => void
  showCreator?: boolean
  currentUserId?: string
  isChecked?: boolean
  onCheckChange?: (linkId: string, checked: boolean) => void
}

export function LinkRow({
  link,
  onEdit,
  onDelete,
  onCopyToPersonal,
  onRatingChange,
  onMove,
  showCreator = false,
  currentUserId,
  isChecked = false,
  onCheckChange,
}: LinkRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: link.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  const timeAgo = formatDistanceToNow(new Date(link.createdAt), {
    addSuffix: true,
    locale: ko,
  })

  const handleRowClick = async (e: React.MouseEvent) => {
    const target = e.target as HTMLElement
    if (target.closest('[data-no-navigate]')) return
    
    window.open(link.url, '_blank', 'noopener,noreferrer')
    
    if (link.ownerType === 'TEAM' && !isChecked && onCheckChange && currentUserId) {
      onCheckChange(link.id, true)
      await recordLinkView(link.id)
    }
  }

  const handleCheckboxChange = async (checked: boolean) => {
    onCheckChange?.(link.id, checked)
    
    if (link.ownerType === 'TEAM' && currentUserId) {
      if (checked) {
        await recordLinkView(link.id)
      } else {
        await unrecordLinkView(link.id)
      }
    }
  }

  const handleCopyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(link.url)
      toast.success('URL이 복사되었습니다')
    } catch {
      toast.error('복사에 실패했습니다')
    }
  }

  const handleRatingChange = (rating: number) => {
    onRatingChange?.(link.id, rating)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'group flex items-center gap-3 p-3 bg-white border rounded-lg transition-all duration-200 touch-none relative overflow-hidden',
        'hover:shadow-sm cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-50 shadow-lg',
        isChecked && 'bg-emerald-50/50 border-emerald-200'
      )}
      onClick={handleRowClick}
    >
      {isChecked && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-500" />
      )}
      
      <GripVertical className="h-4 w-4 text-slate-300 shrink-0" />
      
      <div data-no-navigate onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isChecked}
          onCheckedChange={handleCheckboxChange}
          className="data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
        />
      </div>

      <div className={cn("flex-1 min-w-0 transition-opacity", isChecked && "opacity-60")}>
        <div className="flex items-center gap-2">
          {link.favicon && (
            <img
              src={link.favicon}
              alt=""
              className={cn("w-4 h-4 rounded", isChecked && "grayscale")}
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
          )}
          <span className={cn(
            "text-sm font-medium truncate",
            isChecked ? "text-slate-400 line-through" : "text-slate-900"
          )}>
            {link.title}
          </span>
        </div>
        <button
          onClick={handleCopyUrl}
          data-no-navigate
          className={cn(
            "flex items-center gap-1 text-xs mt-0.5 text-left max-w-full overflow-hidden",
            isChecked ? "text-slate-400" : "text-slate-500 hover:text-blue-500"
          )}
          title="클릭하여 URL 복사"
        >
          <Copy className="h-3 w-3 shrink-0" />
          <span className={cn("truncate", isChecked && "line-through")}>{link.url}</span>
        </button>
      </div>

      <div className="flex items-center gap-3 shrink-0" data-no-navigate>
        <div className="flex flex-col items-start gap-1">
          {showCreator && link.createdBy && (
            <div className="flex items-center gap-1">
            {link.createdBy.image ? (
              <img
                src={link.createdBy.image}
                alt={link.createdBy.name || ''}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center">
                <span className="text-[10px] text-slate-500">
                  {link.createdBy.name?.charAt(0) || '?'}
                </span>
              </div>
            )}
              <span className="text-xs text-slate-500">
                {link.createdBy.name}
              </span>
            </div>
          )}
          <StarRatingModal
            value={link.rating}
            onChange={handleRatingChange}
            readonly={!onRatingChange}
          />
        </div>

        <span className="text-xs text-slate-400 hidden md:block">{timeAgo}</span>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 md:opacity-0 md:group-hover:opacity-100 touch-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onCloseAutoFocus={(e) => e.preventDefault()}>
            {onEdit && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(link) }}>
                <Pencil className="h-4 w-4 mr-2" />
                수정
              </DropdownMenuItem>
            )}
            {onMove && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onMove(link) }}>
                <FolderInput className="h-4 w-4 mr-2" />
                폴더 이동
              </DropdownMenuItem>
            )}
            {onCopyToPersonal && link.ownerType === 'TEAM' && (
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onCopyToPersonal(link.id) }}>
                <Copy className="h-4 w-4 mr-2" />
                내 폴더로 복사
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); onDelete(link.id) }}
                className="text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                삭제
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
