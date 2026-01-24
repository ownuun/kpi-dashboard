'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileUp, FolderTree, Loader2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ScrollArea } from '@/components/ui/scroll-area'
import { importChromeBookmarks } from '@/actions/import-bookmarks'
import type { BookmarkImportNode, LinkOwnerType } from '@/types/links'

type ImportStatus = 'idle' | 'loading' | 'success' | 'error'

interface ImportResult {
  foldersCreated: number
  linksCreated: number
  errors: string[]
}

function parseBookmarkHtml(html: string): BookmarkImportNode[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  function parseNode(dl: Element): BookmarkImportNode[] {
    const nodes: BookmarkImportNode[] = []
    const children = Array.from(dl.children)

    for (let i = 0; i < children.length; i++) {
      const child = children[i]

      if (child.tagName === 'DT') {
        const h3 = child.querySelector(':scope > H3')
        const a = child.querySelector(':scope > A')
        const nestedDl = child.querySelector(':scope > DL')

        if (h3) {
          const folderNode: BookmarkImportNode = {
            title: h3.textContent || '폴더',
            children: nestedDl ? parseNode(nestedDl) : [],
          }
          nodes.push(folderNode)
        } else if (a) {
          nodes.push({
            title: a.textContent || '',
            url: a.getAttribute('href') || undefined,
          })
        }
      }
    }

    return nodes
  }

  const rootDl = doc.querySelector('DL')
  if (!rootDl) return []

  return parseNode(rootDl)
}

export default function ImportPage() {
  const router = useRouter()
  const [bookmarks, setBookmarks] = useState<BookmarkImportNode[]>([])
  const [ownerType, setOwnerType] = useState<LinkOwnerType>('PERSONAL')
  const [rootFolderName, setRootFolderName] = useState('')
  const [status, setStatus] = useState<ImportStatus>('idle')
  const [result, setResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string

        if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
          const parsed = parseBookmarkHtml(content)
          if (parsed.length === 0) {
            setError('북마크를 찾을 수 없습니다')
            setBookmarks([])
            return
          }
          setBookmarks(parsed)
          setError(null)
        } else if (file.name.endsWith('.json')) {
          const json = JSON.parse(content)
          const roots = json.roots
          if (!roots) {
            setError('유효한 Chrome 북마크 파일이 아닙니다')
            setBookmarks([])
            return
          }

          const bookmarkNodes: BookmarkImportNode[] = []
          if (roots.bookmark_bar) bookmarkNodes.push(roots.bookmark_bar)
          if (roots.other) bookmarkNodes.push(roots.other)
          if (roots.synced) bookmarkNodes.push(roots.synced)

          setBookmarks(bookmarkNodes)
          setError(null)
        } else {
          setError('HTML 또는 JSON 파일만 지원합니다')
          setBookmarks([])
        }
      } catch {
        setError('파일을 파싱할 수 없습니다')
        setBookmarks([])
      }
    }
    reader.readAsText(file)
  }, [])

  const handleImport = async () => {
    if (bookmarks.length === 0) {
      toast.error('가져올 북마크가 없습니다')
      return
    }

    setStatus('loading')
    setError(null)

    const importResult = await importChromeBookmarks(
      bookmarks,
      ownerType,
      rootFolderName || undefined
    )

    if (importResult.success) {
      setStatus('success')
      setResult(importResult.data)
      toast.success(`${importResult.data.linksCreated}개 링크를 가져왔습니다`)
    } else {
      setStatus('error')
      setError(importResult.error || '가져오기에 실패했습니다')
      toast.error(importResult.error)
    }
  }

  const countItems = (nodes: BookmarkImportNode[]): { folders: number; links: number } => {
    let folders = 0
    let links = 0
    for (const node of nodes) {
      if (node.url) {
        links++
      } else if (node.children) {
        folders++
        const sub = countItems(node.children)
        folders += sub.folders
        links += sub.links
      }
    }
    return { folders, links }
  }

  const counts = countItems(bookmarks)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/links">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold text-slate-800">북마크 가져오기</h1>
      </div>

      {status === 'success' && result ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <CardTitle>가져오기 완료</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-slate-800">{result.foldersCreated}</div>
                <div className="text-sm text-slate-600">폴더 생성됨</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg text-center">
                <div className="text-2xl font-bold text-slate-800">{result.linksCreated}</div>
                <div className="text-sm text-slate-600">링크 가져옴</div>
              </div>
            </div>

            {result.errors.length > 0 && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-800 mb-2">
                  {result.errors.length}개 오류 발생
                </p>
                <ul className="text-xs text-amber-700 space-y-1">
                  {result.errors.slice(0, 5).map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                  {result.errors.length > 5 && (
                    <li>... 외 {result.errors.length - 5}개</li>
                  )}
                </ul>
              </div>
            )}

            <Button className="w-full" onClick={() => router.push('/links')}>
              링크 페이지로 이동
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Chrome 북마크 파일 선택</CardTitle>
              <CardDescription>
                Chrome에서 내보낸 북마크 HTML 파일을 선택하세요.
                <br />
                <span className="text-xs">
                  Chrome → 북마크 관리자 → ⋮ → 북마크 내보내기
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-slate-200 rounded-lg p-8 hover:border-slate-300 transition-colors flex flex-col items-center">
                <FileUp className="h-10 w-10 text-slate-400 mb-4" />
                <Label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  파일 선택
                </Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".html,.htm,.json"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <p className="text-sm text-slate-500 mt-2">HTML 또는 JSON 파일</p>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {bookmarks.length > 0 && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <FolderTree className="h-5 w-5 text-amber-500" />
                    <CardTitle>미리보기</CardTitle>
                  </div>
                  <CardDescription>
                    {counts.folders}개 폴더, {counts.links}개 링크
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-48 border rounded-lg p-3">
                    {bookmarks.map((node, i) => (
                      <BookmarkNodeView key={i} node={node} depth={0} />
                    ))}
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>가져오기 설정</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    <Label>저장 위치</Label>
                    <RadioGroup
                      value={ownerType}
                      onValueChange={(v: string) => setOwnerType(v as LinkOwnerType)}
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PERSONAL" id="personal" />
                        <Label htmlFor="personal" className="font-normal">
                          개인 링크
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="TEAM" id="team" />
                        <Label htmlFor="team" className="font-normal">
                          팀 링크
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="root-folder">루트 폴더 이름 (선택)</Label>
                    <Input
                      id="root-folder"
                      placeholder="예: Chrome 북마크"
                      value={rootFolderName}
                      onChange={(e) => setRootFolderName(e.target.value)}
                    />
                    <p className="text-xs text-slate-500">
                      비워두면 북마크 구조 그대로 가져옵니다
                    </p>
                  </div>

                  <Button
                    className="w-full"
                    onClick={handleImport}
                    disabled={status === 'loading'}
                  >
                    {status === 'loading' ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        가져오는 중...
                      </>
                    ) : (
                      <>
                        <FileUp className="h-4 w-4 mr-2" />
                        {counts.links}개 링크 가져오기
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </>
      )}
    </div>
  )
}

function BookmarkNodeView({ node, depth }: { node: BookmarkImportNode; depth: number }) {
  const isFolder = !node.url && node.children
  const [expanded, setExpanded] = useState(depth < 1)

  if (node.url) {
    return (
      <div
        className="flex items-center gap-2 py-1 text-sm text-slate-600 truncate"
        style={{ paddingLeft: depth * 16 }}
      >
        <span className="text-blue-500">🔗</span>
        <span className="truncate">{node.title || node.url}</span>
      </div>
    )
  }

  if (isFolder) {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 py-1 text-sm font-medium text-slate-700 hover:text-slate-900 w-full text-left"
          style={{ paddingLeft: depth * 16 }}
        >
          <span>{expanded ? '📂' : '📁'}</span>
          <span>{node.title}</span>
          <span className="text-xs text-slate-400">({node.children?.length || 0})</span>
        </button>
        {expanded && node.children?.map((child, i) => (
          <BookmarkNodeView key={i} node={child} depth={depth + 1} />
        ))}
      </div>
    )
  }

  return null
}
