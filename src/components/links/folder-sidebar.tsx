'use client'

import React, { useState, useCallback, useEffect } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { FolderPlus, User, Users, Folder, FolderOpen, ChevronRight, MoreHorizontal, Pencil, Trash2, Move } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { FolderCreateDialog } from './folder-create-dialog'
import { FolderMoveDialog } from './folder-move-dialog'
import type { LinkFolderTree, LinkFolderWithChildren, LinkOwnerType } from '@/types/links'

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

function saveExpandedFolders(folders: Set<string>) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...folders]))
}

interface FolderItemProps {
  folder: LinkFolderWithChildren
  depth: number
  selectedFolderId: string | null
  onSelect: (id: string, ownerType: LinkOwnerType) => void
  ownerType: LinkOwnerType
  expandedFolders: Set<string>
  onToggleExpand: (id: string) => void
  onEdit: (folder: LinkFolderWithChildren) => void
  onMove: (folder: LinkFolderWithChildren) => void
  onDelete: (id: string) => void
  isDraggingLink?: boolean
}

function FolderItem({
  folder,
  depth,
  selectedFolderId,
  onSelect,
  ownerType,
  expandedFolders,
  onToggleExpand,
  onEdit,
  onMove,
  onDelete,
  isDraggingLink,
}: FolderItemProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
    disabled: !isDraggingLink,
  })

  const hasChildren = folder.children && folder.children.length > 0
  const isSelected = selectedFolderId === folder.id
  const isOpen = expandedFolders.has(folder.id)

  const handleClick = () => {
    onSelect(folder.id, ownerType)
    if (hasChildren) {
      onToggleExpand(folder.id)
    }
  }

  const handleChevronClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onToggleExpand(folder.id)
  }

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        'w-full rounded-md transition-all',
        isOver && isDraggingLink && 'ring-2 ring-blue-500 ring-inset bg-blue-50/50'
      )}
    >
      <div
        className={cn(
          'group flex items-center gap-1.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors overflow-hidden',
          'hover:bg-slate-100',
          isSelected && 'bg-blue-50 text-blue-700 font-medium'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <button
            className="p-0.5 hover:bg-slate-200 rounded shrink-0"
            onClick={handleChevronClick}
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
        <span className="flex-1 min-w-0 truncate text-sm">{folder.name}</span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(folder)}>
              <Pencil className="h-4 w-4 mr-2" />
              수정
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onMove(folder)}>
              <Move className="h-4 w-4 mr-2" />
              이동
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(folder.id)}
              className="text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {hasChildren && isOpen && (
        <div className="mt-0.5 w-full overflow-hidden">
          {folder.children.map((child) => (
            <FolderItem
              key={child.id}
              folder={child}
              depth={depth + 1}
              selectedFolderId={selectedFolderId}
              onSelect={onSelect}
              ownerType={ownerType}
              expandedFolders={expandedFolders}
              onToggleExpand={onToggleExpand}
              onEdit={onEdit}
              onMove={onMove}
              onDelete={onDelete}
              isDraggingLink={isDraggingLink}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FolderSidebarProps {
  folderTree: LinkFolderTree
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null, ownerType?: LinkOwnerType) => void
  onFolderChange?: () => void
  isDraggingLink?: boolean
}

export function FolderSidebar({
  folderTree,
  selectedFolderId,
  onSelectFolder,
  onFolderChange,
  isDraggingLink = false,
}: FolderSidebarProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createOwnerType, setCreateOwnerType] = useState<LinkOwnerType>('PERSONAL')
  const [editingFolder, setEditingFolder] = useState<LinkFolderWithChildren | null>(null)
  const [movingFolder, setMovingFolder] = useState<LinkFolderWithChildren | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(() => getExpandedFolders())

  useEffect(() => {
    setExpandedFolders(getExpandedFolders())
  }, [])

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      saveExpandedFolders(next)
      return next
    })
  }, [])

  const handleCreateFolder = (ownerType: LinkOwnerType) => {
    setCreateOwnerType(ownerType)
    setEditingFolder(null)
    setCreateDialogOpen(true)
  }

  const handleEditFolder = (folder: LinkFolderWithChildren) => {
    setEditingFolder(folder)
    setCreateOwnerType(folder.ownerType)
    setCreateDialogOpen(true)
  }

  const handleMoveFolder = (folder: LinkFolderWithChildren) => {
    setMovingFolder(folder)
  }

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('이 폴더와 하위 링크가 모두 삭제됩니다. 계속하시겠습니까?')) return

    const { deleteFolder } = await import('@/actions/link-folders')
    const result = await deleteFolder(folderId)

    if (result.success) {
      toast.success('폴더가 삭제되었습니다')
      onFolderChange?.()
    } else {
      toast.error(result.error || '폴더 삭제에 실패했습니다')
    }
  }

  const handleDialogClose = (open: boolean) => {
    setCreateDialogOpen(open)
    if (!open) {
      onFolderChange?.()
    }
  }

  const renderFolderSection = (
    folders: LinkFolderWithChildren[],
    ownerType: LinkOwnerType,
    title: string,
    icon: React.ReactNode
  ) => (
    <div className="w-full overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          {icon}
          {title}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => handleCreateFolder(ownerType)}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {folders.length === 0 ? (
        <p className="text-xs text-muted-foreground px-2 py-4 text-center">
          폴더가 없습니다
        </p>
      ) : (
        <div className="space-y-0.5 w-full overflow-hidden">
          {folders.map((folder) => (
            <FolderItem
              key={folder.id}
              folder={folder}
              depth={0}
              selectedFolderId={selectedFolderId}
              onSelect={(id, type) => onSelectFolder(id, type)}
              ownerType={ownerType}
              expandedFolders={expandedFolders}
              onToggleExpand={handleToggleExpand}
              onEdit={handleEditFolder}
              onMove={handleMoveFolder}
              onDelete={handleDeleteFolder}
              isDraggingLink={isDraggingLink}
            />
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div 
      className="border-r bg-slate-50 flex flex-col h-full overflow-hidden"
      style={{ width: '256px', minWidth: '256px', maxWidth: '256px' }}
    >
      <ScrollArea className="flex-1 h-full">
        <div className="p-3 space-y-4" style={{ width: '244px' }}>
          {folderTree.hasTeam && renderFolderSection(folderTree.team, 'TEAM', '팀 폴더', <Users className="h-4 w-4" />)}
          {renderFolderSection(folderTree.personal, 'PERSONAL', '내 폴더', <User className="h-4 w-4" />)}
        </div>
      </ScrollArea>

      <FolderCreateDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        ownerType={createOwnerType}
        editingFolder={editingFolder}
      />

      {movingFolder && (
        <FolderMoveDialog
          open={!!movingFolder}
          onOpenChange={(open) => !open && setMovingFolder(null)}
          folder={movingFolder}
          allFolders={movingFolder.ownerType === 'TEAM' ? folderTree.team : folderTree.personal}
          onSuccess={() => onFolderChange?.()}
        />
      )}
    </div>
  )
}
