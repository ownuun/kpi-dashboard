'use client'

import { useState } from 'react'
import { FolderPlus, User, Users } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { FolderTreeItem } from './folder-tree-item'
import { FolderCreateDialog } from './folder-create-dialog'
import type { LinkFolderTree, LinkFolderWithChildren, LinkOwnerType } from '@/types/links'

interface FolderSidebarProps {
  folderTree: LinkFolderTree
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null, ownerType?: LinkOwnerType) => void
  onFolderChange?: () => void
}

export function FolderSidebar({
  folderTree,
  selectedFolderId,
  onSelectFolder,
  onFolderChange,
}: FolderSidebarProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createOwnerType, setCreateOwnerType] = useState<LinkOwnerType>('PERSONAL')
  const [editingFolder, setEditingFolder] = useState<LinkFolderWithChildren | null>(null)

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

  return (
    <div className="w-64 border-r bg-slate-50 flex flex-col h-full">
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {folderTree.hasTeam && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <Users className="h-4 w-4" />
                  팀 폴더
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleCreateFolder('TEAM')}
                >
                  <FolderPlus className="h-4 w-4" />
                </Button>
              </div>

              {folderTree.team.length === 0 ? (
                <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                  폴더가 없습니다
                </p>
              ) : (
                <div className="space-y-0.5 mt-1">
                  {folderTree.team.map((folder, index) => (
                    <FolderTreeItem
                      key={folder.id}
                      folder={folder}
                      level={0}
                      selectedFolderId={selectedFolderId}
                      onSelect={(id) => onSelectFolder(id, 'TEAM')}
                      onEdit={handleEditFolder}
                      onDelete={handleDeleteFolder}
                      isLast={index === folderTree.team.length - 1}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <User className="h-4 w-4" />
                내 폴더
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => handleCreateFolder('PERSONAL')}
              >
                <FolderPlus className="h-4 w-4" />
              </Button>
            </div>

            {folderTree.personal.length === 0 ? (
              <p className="text-xs text-muted-foreground px-2 py-4 text-center">
                폴더가 없습니다
              </p>
            ) : (
              <div className="space-y-0.5">
                {folderTree.personal.map((folder, index) => (
                  <FolderTreeItem
                    key={folder.id}
                    folder={folder}
                    level={0}
                    selectedFolderId={selectedFolderId}
                    onSelect={(id) => onSelectFolder(id, 'PERSONAL')}
                    onEdit={handleEditFolder}
                    onDelete={handleDeleteFolder}
                    isLast={index === folderTree.personal.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <FolderCreateDialog
        open={createDialogOpen}
        onOpenChange={handleDialogClose}
        ownerType={createOwnerType}
        editingFolder={editingFolder}
      />
    </div>
  )
}
