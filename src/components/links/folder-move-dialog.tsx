'use client'

import { useState } from 'react'
import { Folder, FolderOpen, ChevronRight, Home } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { moveFolder } from '@/actions/link-folders'
import type { LinkFolderWithChildren } from '@/types/links'

interface FolderMoveDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folder: LinkFolderWithChildren
  allFolders: LinkFolderWithChildren[]
  onSuccess: () => void
}

function getAllDescendantIds(folder: LinkFolderWithChildren): Set<string> {
  const ids = new Set<string>([folder.id])
  for (const child of folder.children || []) {
    for (const id of getAllDescendantIds(child)) {
      ids.add(id)
    }
  }
  return ids
}

function FolderOption({
  folder,
  depth,
  selectedId,
  onSelect,
  disabledIds,
}: {
  folder: LinkFolderWithChildren
  depth: number
  selectedId: string | null
  onSelect: (id: string | null) => void
  disabledIds: Set<string>
}) {
  const [isOpen, setIsOpen] = useState(true)
  const hasChildren = folder.children && folder.children.length > 0
  const isDisabled = disabledIds.has(folder.id)
  const isSelected = selectedId === folder.id

  return (
    <div>
      <div
        className={cn(
          'flex items-center gap-1.5 py-1.5 px-2 rounded-md transition-colors',
          isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-slate-100',
          isSelected && !isDisabled && 'bg-blue-50 text-blue-700'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => !isDisabled && onSelect(folder.id)}
      >
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-slate-200 rounded shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              setIsOpen(!isOpen)
            }}
          >
            <ChevronRight
              className={cn(
                'h-3.5 w-3.5 text-slate-400 transition-transform duration-200',
                isOpen && 'rotate-90'
              )}
            />
          </button>
        ) : (
          <span className="w-[18px] shrink-0" />
        )}
        {isOpen && hasChildren ? (
          <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
        ) : (
          <Folder className="h-4 w-4 text-amber-500 shrink-0" />
        )}
        <span className="flex-1 truncate text-sm">{folder.name}</span>
      </div>
      {hasChildren && isOpen && (
        <div>
          {folder.children.map((child) => (
            <FolderOption
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              disabledIds={disabledIds}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export function FolderMoveDialog({
  open,
  onOpenChange,
  folder,
  allFolders,
  onSuccess,
}: FolderMoveDialogProps) {
  const [selectedId, setSelectedId] = useState<string | null>(folder.parentId)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const disabledIds = getAllDescendantIds(folder)

  const handleMove = async () => {
    if (selectedId === folder.parentId) {
      onOpenChange(false)
      return
    }

    setIsSubmitting(true)
    try {
      const result = await moveFolder(folder.id, selectedId)
      if (result.success) {
        toast.success('폴더가 이동되었습니다')
        onOpenChange(false)
        onSuccess()
      } else {
        toast.error(result.error || '폴더 이동에 실패했습니다')
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  const isRootSelected = selectedId === null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>폴더 이동: {folder.name}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[300px] border rounded-md">
          <div className="p-2">
            <div
              className={cn(
                'flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors',
                'hover:bg-slate-100',
                isRootSelected && 'bg-blue-50 text-blue-700'
              )}
              onClick={() => setSelectedId(null)}
            >
              <Home className="h-4 w-4 text-slate-500 shrink-0" />
              <span className="text-sm font-medium">최상위</span>
            </div>

            {allFolders.map((f) => (
              <FolderOption
                key={f.id}
                folder={f}
                depth={0}
                selectedId={selectedId}
                onSelect={setSelectedId}
                disabledIds={disabledIds}
              />
            ))}
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleMove} disabled={isSubmitting}>
            {isSubmitting ? '이동 중...' : '이동'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
