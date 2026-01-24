'use client'

import { useState, useEffect } from 'react'
import {
  arrayMove,
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { toast } from 'sonner'
import { LinkRow } from './link-row'
import { MoveToFolderDialog } from './move-to-folder-dialog'
import { reorderLinks, deleteLink, updateLink, deleteLinks } from '@/actions/links'
import type { LinkWithDetails, LinkFolderTree } from '@/types/links'

interface LinkListProps {
  links: LinkWithDetails[]
  folderId: string | null
  onEdit?: (link: LinkWithDetails) => void
  onCopyToPersonal?: (linkId: string) => void
  showCreator?: boolean
  onLinkChange?: () => void
  onMoveToFolder?: (link: LinkWithDetails, targetFolderId: string) => void
  folderTree?: LinkFolderTree
  currentUserId?: string
  ownerType?: 'PERSONAL' | 'TEAM'
  onCheckedChange?: (count: number, deleteChecked: () => Promise<void>) => void
}

export function LinkList({
  links: initialLinks,
  folderId,
  onEdit,
  onCopyToPersonal,
  showCreator = false,
  onLinkChange,
  onMoveToFolder,
  folderTree,
  currentUserId,
  ownerType = 'PERSONAL',
  onCheckedChange,
}: LinkListProps) {
  const [links, setLinks] = useState(initialLinks)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [movingLink, setMovingLink] = useState<LinkWithDetails | null>(null)
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setLinks(initialLinks)
    if (ownerType === 'TEAM' && currentUserId) {
      const viewedIds = new Set(
        initialLinks
          .filter(link => link.viewedBy?.some(v => v.id === currentUserId))
          .map(link => link.id)
      )
      setCheckedIds(viewedIds)
    } else {
      setCheckedIds(new Set())
    }
  }, [initialLinks, ownerType, currentUserId])

  useEffect(() => {
    onCheckedChange?.(checkedIds.size, handleDeleteChecked)
  }, [checkedIds.size])

  async function handleReorder(activeId: string, overId: string) {
    if (activeId === overId || !folderId) return

    const oldIndex = links.findIndex((link) => link.id === activeId)
    const newIndex = links.findIndex((link) => link.id === overId)
    
    if (oldIndex === -1 || newIndex === -1) return

    const newLinks = arrayMove(links, oldIndex, newIndex)
    setLinks(newLinks)

    const updates = newLinks.map((link, index) => ({
      id: link.id,
      sortOrder: index,
    }))

    const result = await reorderLinks(folderId, updates)
    if (!result.success) {
      setLinks(links)
      toast.error('순서 변경에 실패했습니다')
    }
  }

  async function handleDelete(linkId: string) {
    if (!confirm('이 링크를 삭제하시겠습니까?')) return

    const result = await deleteLink(linkId)
    if (result.success) {
      setLinks(links.filter((l) => l.id !== linkId))
      setCheckedIds(prev => {
        const next = new Set(prev)
        next.delete(linkId)
        return next
      })
      toast.success('링크가 삭제되었습니다')
      onLinkChange?.()
    } else {
      toast.error(result.error)
    }
  }

  async function handleDeleteChecked() {
    const checkedCount = checkedIds.size
    if (checkedCount === 0) return
    
    if (!confirm(`체크된 ${checkedCount}개의 링크를 삭제하시겠습니까?`)) return

    const result = await deleteLinks(Array.from(checkedIds))
    if (result.success) {
      setLinks(links.filter((l) => !checkedIds.has(l.id)))
      setCheckedIds(new Set())
      toast.success(`${result.data.deleted}개의 링크가 삭제되었습니다`)
      onLinkChange?.()
    } else {
      toast.error(result.error || '삭제에 실패했습니다')
    }
  }

  async function handleRatingChange(linkId: string, rating: number) {
    const result = await updateLink(linkId, { rating })
    if (result.success) {
      setLinks(links.map((l) => l.id === linkId ? { ...l, rating } : l))
    } else {
      toast.error(result.error || '별점 수정에 실패했습니다')
    }
  }

  function handleMoveClick(link: LinkWithDetails) {
    setMovingLink(link)
    setMoveDialogOpen(true)
  }

  function handleMoveConfirm(targetFolderId: string) {
    if (movingLink && onMoveToFolder) {
      onMoveToFolder(movingLink, targetFolderId)
    }
    setMoveDialogOpen(false)
    setMovingLink(null)
  }

  function handleCheckChange(linkId: string, checked: boolean) {
    setCheckedIds(prev => {
      const next = new Set(prev)
      if (checked) {
        next.add(linkId)
      } else {
        next.delete(linkId)
      }
      return next
    })
  }

  if (links.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <p className="text-muted-foreground">링크가 없습니다</p>
        <p className="text-sm text-muted-foreground mt-1">
          상단에서 URL을 입력하여 링크를 추가하세요
        </p>
      </div>
    )
  }

  return (
    <>
      <SortableContext
        items={links.map((l) => l.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {links.map((link) => (
            <LinkRow
              key={link.id}
              link={link}
              onEdit={onEdit}
              onDelete={handleDelete}
              onMove={onMoveToFolder && folderTree ? handleMoveClick : undefined}
              onCopyToPersonal={onCopyToPersonal}
              onRatingChange={handleRatingChange}
              showCreator={showCreator}
              currentUserId={currentUserId}
              isChecked={checkedIds.has(link.id)}
              onCheckChange={handleCheckChange}
            />
          ))}
        </div>
      </SortableContext>

      {folderTree && (
        <MoveToFolderDialog
          open={moveDialogOpen}
          onOpenChange={setMoveDialogOpen}
          folderTree={folderTree}
          currentFolderId={movingLink?.folder.id || null}
          linkOwnerType={movingLink?.ownerType}
          onConfirm={handleMoveConfirm}
        />
      )}
    </>
  )
}
