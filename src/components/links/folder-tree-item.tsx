'use client'

import { useState, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChevronRight, Folder, FolderOpen, GripVertical, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { LinkFolderWithChildren } from '@/types/links'

interface FolderTreeItemProps {
  folder: LinkFolderWithChildren
  level: number
  selectedFolderId: string | null
  onSelect: (folderId: string) => void
  onEdit?: (folder: LinkFolderWithChildren) => void
  onDelete?: (folderId: string) => void
  isLast?: boolean
  disableSortable?: boolean
}

const STORAGE_KEY = 'links-folder-expanded'

function getExpandedFolders(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? new Set(JSON.parse(stored)) : new Set()
  } catch {
    return new Set()
  }
}

function setExpandedFolders(folders: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...folders]))
}

export function FolderTreeItem({
  folder,
  level,
  selectedFolderId,
  onSelect,
  onEdit,
  onDelete,
  isLast = false,
  disableSortable = false,
}: FolderTreeItemProps) {
  const [isOpen, setIsOpen] = useState(false)
  const hasChildren = folder.children && folder.children.length > 0
  const isSelected = selectedFolderId === folder.id

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    data: {
      type: 'folder',
      folder,
    },
  })

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: folder.id, disabled: disableSortable })

  const style = disableSortable ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const setNodeRef = (node: HTMLElement | null) => {
    setDroppableRef(node)
    if (!disableSortable) {
      setSortableRef(node)
    }
  }

  useEffect(() => {
    const expanded = getExpandedFolders()
    if (expanded.size === 0 && level === 0) {
      setIsOpen(true)
    } else {
      setIsOpen(expanded.has(folder.id))
    }
  }, [folder.id, level])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    const expanded = getExpandedFolders()
    if (open) {
      expanded.add(folder.id)
    } else {
      expanded.delete(folder.id)
    }
    setExpandedFolders(expanded)
  }

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    handleOpenChange(!isOpen)
  }

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
        <div
          className={cn(
            'group flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
            'hover:bg-slate-100',
            isSelected && 'bg-blue-50 text-blue-700 font-medium',
            isOver && 'bg-blue-100 ring-2 ring-blue-400 ring-inset'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
          onClick={() => {
            onSelect(folder.id)
            if (hasChildren) {
              handleOpenChange(!isOpen)
            }
          }}
        >
        {!disableSortable && (
          <button
            {...attributes}
            {...listeners}
            className="p-0.5 md:opacity-0 md:group-hover:opacity-100 hover:bg-slate-200 rounded shrink-0 cursor-grab active:cursor-grabbing touch-none"
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5 text-slate-400" />
          </button>
        )}

        {hasChildren ? (
          <CollapsibleTrigger asChild onClick={handleToggle}>
            <button className="p-0.5 hover:bg-slate-200 rounded shrink-0">
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                  isOpen && 'rotate-90'
                )}
              />
            </button>
          </CollapsibleTrigger>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}

        {isOpen && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
        )}

        <span className="flex-1 truncate text-sm">{folder.name}</span>

        {(onEdit || onDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onEdit && (
                <DropdownMenuItem onClick={() => onEdit(folder)}>
                  <Pencil className="h-4 w-4 mr-2" />
                  수정
                </DropdownMenuItem>
              )}
              {onDelete && (
                <DropdownMenuItem
                  onClick={() => onDelete(folder.id)}
                  className="text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

        {hasChildren && (
          <CollapsibleContent>
            <div className="mt-0.5">
              {folder.children.map((child, index) => (
                <FolderTreeItem
                  key={child.id}
                  folder={child}
                  level={level + 1}
                  selectedFolderId={selectedFolderId}
                  onSelect={onSelect}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  isLast={index === folder.children.length - 1}
                  disableSortable={disableSortable}
                />
              ))}
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  )
}
