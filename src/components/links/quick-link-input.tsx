'use client'

import { useState } from 'react'
import { Folder, Loader2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FolderTreeItem } from './folder-tree-item'
import { createLink } from '@/actions/links'
import type { LinkFolderTree, LinkFolderWithChildren, LinkOwnerType } from '@/types/links'

interface QuickLinkInputProps {
  folderTree: LinkFolderTree
  selectedFolderId: string | null
  selectedOwnerType: LinkOwnerType
  onFolderSelect: (folderId: string, ownerType: LinkOwnerType) => void
  onLinkCreated?: () => void
}

export function QuickLinkInput({
  folderTree,
  selectedFolderId,
  selectedOwnerType,
  onFolderSelect,
  onLinkCreated,
}: QuickLinkInputProps) {
  const [url, setUrl] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [folderPopoverOpen, setFolderPopoverOpen] = useState(false)

  const selectedFolder = findFolder(
    selectedOwnerType === 'PERSONAL' ? folderTree.personal : folderTree.team,
    selectedFolderId
  )

  async function saveLink(inputUrl: string) {
    if (!inputUrl.trim()) {
      toast.error('URL을 입력해주세요')
      return
    }

    if (!selectedFolderId) {
      toast.error('폴더를 선택해주세요')
      setFolderPopoverOpen(true)
      return
    }

    setIsSubmitting(true)

    try {
      let validUrl = inputUrl.trim()
      if (!validUrl.startsWith('http://') && !validUrl.startsWith('https://')) {
        validUrl = 'https://' + validUrl
      }

      let title = new URL(validUrl).hostname.replace('www.', '')
      let favicon: string | null = null

      try {
        const metaResponse = await fetch(`/api/links/metadata?url=${encodeURIComponent(validUrl)}`)
        if (metaResponse.ok) {
          const metadata = await metaResponse.json()
          title = metadata.title || title
          favicon = metadata.favicon || null
        }
      } catch {
      }

      const result = await createLink({
        url: validUrl,
        title,
        favicon,
        ownerType: selectedOwnerType,
        folderId: selectedFolderId,
      })

      if (result.success) {
        toast.success('링크가 저장되었습니다')
        setUrl('')
        onLinkCreated?.()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('올바른 URL을 입력해주세요')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    await saveLink(url)
  }

  async function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pastedText = e.clipboardData.getData('text')
    if (pastedText && (pastedText.startsWith('http://') || pastedText.startsWith('https://') || pastedText.includes('.'))) {
      e.preventDefault()
      setUrl(pastedText)
      await saveLink(pastedText)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Input
          type="text"
          placeholder="URL 붙여넣기..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onPaste={handlePaste}
          className="w-full pr-20"
          disabled={isSubmitting}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hidden lg:block">
          Enter로 저장
        </span>
      </div>

      <Popover open={folderPopoverOpen} onOpenChange={setFolderPopoverOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="gap-2 min-w-[140px] justify-start"
          >
            <Folder className="h-4 w-4 text-amber-500" />
            <span className="truncate">
              {selectedFolder?.name || '폴더 선택'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <ScrollArea className="h-[300px]">
            <div className="p-2 space-y-3">
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
                    folderTree.team.map((folder) => (
                      <FolderTreeItem
                        key={folder.id}
                        folder={folder}
                        level={0}
                        selectedFolderId={selectedFolderId}
                        onSelect={(id) => {
                          onFolderSelect(id, 'TEAM')
                          setFolderPopoverOpen(false)
                        }}
                      />
                    ))
                  )}
                </div>
              )}

              {folderTree.personal.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-slate-500 px-2 mb-1">
                    내 폴더
                  </p>
                  {folderTree.personal.map((folder) => (
                    <FolderTreeItem
                      key={folder.id}
                      folder={folder}
                      level={0}
                      selectedFolderId={selectedFolderId}
                      onSelect={(id) => {
                        onFolderSelect(id, 'PERSONAL')
                        setFolderPopoverOpen(false)
                      }}
                    />
                  ))}
                </div>
              )}

              {folderTree.personal.length === 0 && !folderTree.hasTeam && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  폴더가 없습니다
                </p>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Plus className="h-4 w-4" />
        )}
        <span className="ml-1 hidden sm:inline">저장</span>
      </Button>
    </form>
  )
}

function findFolder(
  folders: LinkFolderWithChildren[],
  id: string | null
): LinkFolderWithChildren | null {
  if (!id) return null

  for (const folder of folders) {
    if (folder.id === id) return folder
    if (folder.children) {
      const found = findFolder(folder.children, id)
      if (found) return found
    }
  }
  return null
}
