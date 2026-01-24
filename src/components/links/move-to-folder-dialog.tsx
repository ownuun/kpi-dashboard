'use client'

import { useState } from 'react'
import { Folder, FolderOpen, ChevronRight, ArrowRight, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import type { LinkFolderTree, LinkFolderWithChildren, LinkOwnerType } from '@/types/links'

interface MoveToFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  folderTree: LinkFolderTree
  currentFolderId: string | null
  linkOwnerType?: LinkOwnerType
  onConfirm: (targetFolderId: string) => void
}

export function MoveToFolderDialog({
  open,
  onOpenChange,
  folderTree,
  currentFolderId,
  linkOwnerType,
  onConfirm,
}: MoveToFolderDialogProps) {
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())

  const toggleExpand = (folderId: string) => {
    const newExpanded = new Set(expandedFolders)
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId)
    } else {
      newExpanded.add(folderId)
    }
    setExpandedFolders(newExpanded)
  }

  const handleConfirm = () => {
    if (selectedFolderId) {
      onConfirm(selectedFolderId)
      setSelectedFolderId(null)
    }
  }

  const getActionType = (targetFolder: LinkFolderWithChildren): 'move' | 'copy' => {
    if (!linkOwnerType) return 'move'
    return linkOwnerType === targetFolder.ownerType ? 'move' : 'copy'
  }

  const renderFolder = (folder: LinkFolderWithChildren, level: number = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const isSelected = selectedFolderId === folder.id
    const isCurrent = currentFolderId === folder.id
    const hasChildren = folder.children && folder.children.length > 0
    const actionType = getActionType(folder)

    return (
      <div key={folder.id}>
        <button
          onClick={() => !isCurrent && setSelectedFolderId(folder.id)}
          disabled={isCurrent}
          className={cn(
            'flex items-center gap-2 w-full py-2 px-2 rounded-md text-sm transition-colors',
            isCurrent && 'opacity-50 cursor-not-allowed',
            !isCurrent && 'hover:bg-slate-100',
            isSelected && 'bg-blue-50 text-blue-700 font-medium'
          )}
          style={{ paddingLeft: `${level * 16 + 8}px` }}
        >
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleExpand(folder.id)
              }}
              className="p-0.5 hover:bg-slate-200 rounded shrink-0"
            >
              <ChevronRight
                className={cn(
                  'h-3.5 w-3.5 text-slate-400 transition-transform',
                  isExpanded && 'rotate-90'
                )}
              />
            </button>
          ) : (
            <span className="w-[18px] shrink-0" />
          )}

          {isExpanded && hasChildren ? (
            <FolderOpen className="h-4 w-4 text-amber-500 shrink-0" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500 shrink-0" />
          )}

          <span className="flex-1 truncate text-left">{folder.name}</span>

          {isSelected && (
            <span className={cn(
              'text-xs px-1.5 py-0.5 rounded',
              actionType === 'copy' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
            )}>
              {actionType === 'copy' ? '복사' : '이동'}
            </span>
          )}

          {isCurrent && (
            <span className="text-xs text-slate-400">현재</span>
          )}
        </button>

        {hasChildren && isExpanded && (
          <div>
            {folder.children.map((child) => renderFolder(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>폴더 선택</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[300px] -mx-6 px-6">
          <div className="space-y-4">
            {folderTree.hasTeam && (
              <div>
                <p className="text-xs font-medium text-slate-500 px-2 mb-1">
                  팀 폴더
                </p>
                {folderTree.team.length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-2">
                    폴더가 없습니다
                  </p>
                ) : (
                  folderTree.team.map((folder) => renderFolder(folder))
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-slate-500 px-2 mb-1">
                내 폴더
              </p>
              {folderTree.personal.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-2">
                  폴더가 없습니다
                </p>
              ) : (
                folderTree.personal.map((folder) => renderFolder(folder))
              )}
            </div>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedFolderId}
          >
            {selectedFolderId && linkOwnerType && (() => {
              const allFolders = [...folderTree.personal, ...folderTree.team]
              const findFolder = (folders: LinkFolderWithChildren[]): LinkFolderWithChildren | null => {
                for (const f of folders) {
                  if (f.id === selectedFolderId) return f
                  if (f.children) {
                    const found = findFolder(f.children)
                    if (found) return found
                  }
                }
                return null
              }
              const targetFolder = findFolder(allFolders)
              if (targetFolder && targetFolder.ownerType !== linkOwnerType) {
                return (
                  <>
                    <Copy className="h-4 w-4 mr-1" />
                    복사
                  </>
                )
              }
              return (
                <>
                  <ArrowRight className="h-4 w-4 mr-1" />
                  이동
                </>
              )
            })()}
            {!selectedFolderId && '선택'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
