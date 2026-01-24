'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { FileUp, ChevronRight, Menu, Link2, Trash2 } from 'lucide-react'
import Link from 'next/link'
import {
  DndContext,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { FolderSidebar } from '@/components/links/folder-sidebar'
import { LinkList } from '@/components/links/link-list'
import { QuickLinkInput } from '@/components/links/quick-link-input'
import { getFolderTree } from '@/actions/link-folders'
import { getLinks, updateLink, transferLinkToFolder } from '@/actions/links'
import { toast } from 'sonner'
import type { LinkFolderTree, LinkFolderWithChildren, LinkWithDetails, LinkOwnerType } from '@/types/links'

export default function LinksPage() {
  const { data: session } = useSession()
  const [folderTree, setFolderTree] = useState<LinkFolderTree>({ personal: [], team: [], hasTeam: false })
  const [links, setLinks] = useState<LinkWithDetails[]>([])
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const [selectedOwnerType, setSelectedOwnerType] = useState<LinkOwnerType>('PERSONAL')
  const [isLoading, setIsLoading] = useState(true)
  const [breadcrumb, setBreadcrumb] = useState<{ id: string; name: string }[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [draggingLink, setDraggingLink] = useState<LinkWithDetails | null>(null)
  const [checkedCount, setCheckedCount] = useState(0)
  const [deleteCheckedFn, setDeleteCheckedFn] = useState<(() => Promise<void>) | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Custom collision detection: prioritize pointer position, fallback to rect intersection
  const customCollisionDetection: CollisionDetection = useCallback((args) => {
    const pointerCollisions = pointerWithin(args)
    if (pointerCollisions.length > 0) {
      return pointerCollisions
    }
    return rectIntersection(args)
  }, [])

  const loadData = useCallback(async () => {
    setIsLoading(true)
    const folderResult = await getFolderTree()
    if (folderResult.success) {
      setFolderTree(folderResult.data)
      const savedFolderId = localStorage.getItem('links-selected-folder')
      const savedOwnerType = localStorage.getItem('links-selected-owner') as LinkOwnerType | null
      
      if (savedFolderId && savedOwnerType) {
        setSelectedFolderId(savedFolderId)
        setSelectedOwnerType(savedOwnerType)
      } else if (folderResult.data.team.length > 0) {
        setSelectedFolderId(folderResult.data.team[0].id)
        setSelectedOwnerType('TEAM')
      } else if (folderResult.data.personal.length > 0) {
        setSelectedFolderId(folderResult.data.personal[0].id)
        setSelectedOwnerType('PERSONAL')
      }
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    loadContent()
  }, [selectedFolderId, selectedOwnerType, folderTree])

  async function loadContent() {
    if (!selectedFolderId && selectedOwnerType !== 'TEAM') return

    if (selectedFolderId) {
      localStorage.setItem('links-selected-folder', selectedFolderId)
      localStorage.setItem('links-selected-owner', selectedOwnerType)
    }

    const folders = selectedOwnerType === 'PERSONAL' ? folderTree.personal : folderTree.team
    setBreadcrumb(buildBreadcrumb(folders, selectedFolderId))

    const result = await getLinks({
      folderId: selectedFolderId || undefined,
      ownerType: selectedOwnerType,
    })

    if (result.success) {
      setLinks(result.data.links)
    }
  }

  function handleFolderSelect(folderId: string | null, ownerType?: LinkOwnerType) {
    setSelectedFolderId(folderId)
    if (ownerType) setSelectedOwnerType(ownerType)
  }

  function handleBreadcrumbClick(folderId: string | null) {
    setSelectedFolderId(folderId)
  }

  async function handleEditLink(link: LinkWithDetails) {
    const newTitle = prompt('링크 제목 수정', link.title)
    if (newTitle && newTitle !== link.title) {
      const result = await updateLink(link.id, { title: newTitle })
      if (result.success) {
        toast.success('링크가 수정되었습니다')
        loadContent()
      } else {
        toast.error(result.error || '수정에 실패했습니다')
      }
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event
    const link = links.find((l) => l.id === active.id)
    if (link) {
      setDraggingLink(link)
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDraggingLink(null)

    if (!over) return

    const overId = String(over.id)
    if (!overId.startsWith('folder-')) return

    const targetFolderId = overId.replace('folder-', '')
    const linkId = String(active.id)
    const link = links.find((l) => l.id === linkId)

    if (!link || link.folder.id === targetFolderId) return

    const targetFolder = findFolderById([...folderTree.personal, ...folderTree.team], targetFolderId)
    const willCopy = targetFolder && link.ownerType !== targetFolder.ownerType

    if (!willCopy) {
      setLinks((prev) => prev.filter((l) => l.id !== linkId))
    }

    const result = await transferLinkToFolder(linkId, targetFolderId)

    if (result.success) {
      const { action } = result.data
      if (action === 'moved') {
        toast.success('링크가 이동되었습니다')
      } else {
        toast.success('링크가 복사되었습니다')
      }
    } else {
      if (!willCopy) {
        setLinks((prev) => [...prev, link])
      }
      toast.error(result.error || '작업에 실패했습니다')
    }
  }

  async function handleMoveLink(link: LinkWithDetails, targetFolderId: string) {
    const targetFolder = findFolderById([...folderTree.personal, ...folderTree.team], targetFolderId)
    const willCopy = targetFolder && link.ownerType !== targetFolder.ownerType

    if (!willCopy) {
      setLinks((prev) => prev.filter((l) => l.id !== link.id))
    }

    const result = await transferLinkToFolder(link.id, targetFolderId)

    if (result.success) {
      const { action } = result.data
      if (action === 'moved') {
        toast.success('링크가 이동되었습니다')
      } else {
        toast.success('링크가 복사되었습니다')
      }
    } else {
      if (!willCopy) {
        setLinks((prev) => [...prev, link])
      }
      toast.error(result.error || '작업에 실패했습니다')
    }
  }

  function findFolderById(folders: LinkFolderWithChildren[], id: string): LinkFolderWithChildren | null {
    for (const folder of folders) {
      if (folder.id === id) return folder
      if (folder.children) {
        const found = findFolderById(folder.children, id)
        if (found) return found
      }
    }
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground">로딩 중...</div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={customCollisionDetection}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-4rem)] -m-6">
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={`
          fixed inset-y-0 left-0 z-50 md:relative md:z-0
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}>
          <FolderSidebar
            folderTree={folderTree}
            selectedFolderId={selectedFolderId}
            onSelectFolder={(id, type) => {
              handleFolderSelect(id, type)
              setSidebarOpen(false)
            }}
            onFolderChange={loadData}
          />
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 md:p-6 border-b bg-white">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setSidebarOpen(true)}
                >
                  <Menu className="h-5 w-5" />
                </Button>
                <h1 className="text-xl md:text-2xl font-semibold text-slate-800">링크</h1>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/links/import">
                  <FileUp className="h-4 w-4 md:mr-2" />
                  <span className="hidden md:inline">북마크 가져오기</span>
                </Link>
              </Button>
            </div>

            <QuickLinkInput
              folderTree={folderTree}
              selectedFolderId={selectedFolderId}
              selectedOwnerType={selectedOwnerType}
              onFolderSelect={handleFolderSelect}
              onLinkCreated={loadContent}
            />
          </div>

          <div className="flex-1 overflow-auto p-4 md:p-6">
            {breadcrumb.length > 0 && (
              <div className="flex items-center justify-between mb-3 min-h-8">
                <div className="flex items-center gap-1 text-sm flex-wrap">
                  <button
                    onClick={() => handleBreadcrumbClick(null)}
                    className="text-slate-500 hover:text-slate-700"
                  >
                    {selectedOwnerType === 'PERSONAL' ? '내 폴더' : '팀 폴더'}
                  </button>
                  {breadcrumb.map((item) => (
                    <div key={item.id} className="flex items-center gap-1">
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                      <button
                        onClick={() => handleBreadcrumbClick(item.id)}
                        className={`hover:text-slate-700 ${
                          item.id === selectedFolderId ? 'text-slate-800 font-medium' : 'text-slate-500'
                        }`}
                      >
                        {item.name}
                      </button>
                    </div>
                  ))}
                </div>
                {checkedCount > 0 && deleteCheckedFn && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600 hidden sm:block">{checkedCount}개 선택</span>
                    <Button variant="destructive" size="sm" className="h-7 px-2" onClick={deleteCheckedFn}>
                      <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline text-xs">선택 삭제</span>
                    </Button>
                  </div>
                )}
              </div>
            )}

            <LinkList
              links={links}
              folderId={selectedFolderId}
              showCreator={selectedOwnerType === 'TEAM'}
              onLinkChange={loadContent}
              onEdit={handleEditLink}
              onMoveToFolder={handleMoveLink}
              folderTree={folderTree}
              currentUserId={session?.user?.id}
              ownerType={selectedOwnerType}
              onCheckedChange={(count, deleteFn) => {
                setCheckedCount(count)
                setDeleteCheckedFn(() => deleteFn)
              }}
            />
          </div>
        </div>
      </div>

      <DragOverlay>
        {draggingLink && (
          <div className="flex items-center gap-2 p-3 bg-white border rounded-lg shadow-lg opacity-90">
            {draggingLink.favicon && (
              <img src={draggingLink.favicon} alt="" className="w-4 h-4 rounded" />
            )}
            <span className="font-medium text-slate-900 truncate max-w-[200px]">
              {draggingLink.title}
            </span>
            <Link2 className="h-3 w-3 text-slate-400 shrink-0" />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}

function buildBreadcrumb(
  folders: LinkFolderWithChildren[],
  targetId: string | null
): { id: string; name: string }[] {
  if (!targetId) return []
  
  function findPath(
    items: LinkFolderWithChildren[],
    id: string,
    path: { id: string; name: string }[] = []
  ): { id: string; name: string }[] | null {
    for (const item of items) {
      const newPath = [...path, { id: item.id, name: item.name }]
      if (item.id === id) return newPath
      if (item.children) {
        const found = findPath(item.children, id, newPath)
        if (found) return found
      }
    }
    return null
  }
  
  return findPath(folders, targetId) || []
}
