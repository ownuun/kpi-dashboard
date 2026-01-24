# 링크 공유 기능 개발 기획서

> 작성일: 2026-01-24
> 기준 문서: `docs/link-sharing-spec.md` (v3.0 폴더 기반)

## 1. 개발 개요

### 1.1 목표
태그 기반 → 폴더 기반 링크 관리 시스템으로 전환

### 1.2 핵심 변경사항
| 항목 | Before (태그) | After (폴더) |
|------|--------------|--------------|
| 분류 체계 | 다대다 (링크-태그) | 일대다 (폴더-링크) |
| 구조 | Flat 태그 목록 | 계층형 폴더 트리 |
| 필수 여부 | 태그 선택 (선택) | 폴더 선택 필수 |
| 정렬 | 생성일 기준 | 커스텀 드래그 정렬 |

### 1.3 기술 스택 추가
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 2. 코드베이스 패턴 분석

### 2.1 Server Actions 패턴

**파일 구조:** `src/actions/*.ts`

```typescript
'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from '@/types'

// 1. Zod 스키마 정의
const createSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(50),
  // ...
})

// 2. 함수 시그니처: FormData 또는 객체 입력 → ActionResult<T> 반환
export async function createSomething(
  formData: FormData
): Promise<ActionResult<SomeType>> {
  try {
    // 3. 인증 체크
    const session = await auth()
    if (!session?.user?.teamId) {
      return { success: false, error: 'Unauthorized' }
    }

    // 4. 입력 파싱 및 검증
    const raw = { name: formData.get('name') as string }
    const parsed = createSchema.safeParse(raw)
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0].message }
    }

    // 5. 중복 체크 (필요시)
    const existing = await prisma.model.findFirst({ where: { ... } })
    if (existing) {
      return { success: false, error: '이미 존재합니다' }
    }

    // 6. DB 작업
    const result = await prisma.model.create({
      data: { ...parsed.data, teamId: session.user.teamId },
      include: { _count: { select: { ... } } },
    })

    // 7. 캐시 무효화
    revalidatePath('/path')

    // 8. 성공 반환
    return { success: true, data: result }
  } catch (error) {
    console.error('createSomething error:', error)
    return { success: false, error: '생성에 실패했습니다' }
  }
}
```

### 2.2 Page 패턴

**Server Component 페이지:** `src/app/(dashboard)/*/page.tsx`

```typescript
import { getSomething } from '@/actions/something'
import { SomeDialog } from './some-dialog'

export default async function SomePage() {
  // 1. Server Action으로 데이터 fetch
  const result = await getSomething()

  // 2. 에러 처리
  if (!result.success) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <p className="text-muted-foreground">데이터를 불러오는 데 실패했습니다</p>
      </div>
    )
  }

  const data = result.data

  // 3. UI 렌더링
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">제목</h1>
        <SomeDialog />
      </div>
      {/* 컨텐츠 */}
    </div>
  )
}
```

### 2.3 Client Component 패턴 (Form)

```typescript
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'

const formSchema = z.object({ ... })
type FormValues = z.infer<typeof formSchema>

interface SomeFormProps {
  initialData?: SomeType
  onSuccess?: () => void
}

export function SomeForm({ initialData, onSuccess }: SomeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { ... },
  })

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      // ... set form data

      const result = initialData
        ? await updateSomething(initialData.id, formData)
        : await createSomething(formData)

      if (result.success) {
        toast.success('완료되었습니다')
        onSuccess?.()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error('오류가 발생했습니다')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        {/* Form fields with shadcn/ui */}
      </form>
    </Form>
  )
}
```

### 2.4 Extension API 패턴

**Route Handler:** `src/app/api/extension/*/route.ts`

```typescript
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ authenticated: false }, { status: 401 })
    }

    const data = await prisma.model.findMany({ ... })
    return NextResponse.json(data)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    // ... process body

    return NextResponse.json({ success: true, data: result })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
```

---

## 3. dnd-kit 구현 패턴

### 3.1 기본 Sortable List

```typescript
'use client'

import { useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { SortableItem } from './sortable-item'

interface SortableListProps {
  items: { id: string; ... }[]
  onReorder: (ids: string[]) => Promise<void>
}

export function SortableList({ items, onReorder }: SortableListProps) {
  const [localItems, setLocalItems] = useState(items)

  // 모바일 터치 지원을 위한 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor),
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

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = localItems.findIndex((item) => item.id === active.id)
    const newIndex = localItems.findIndex((item) => item.id === over.id)
    const newItems = arrayMove(localItems, oldIndex, newIndex)

    setLocalItems(newItems) // 낙관적 업데이트
    await onReorder(newItems.map((item) => item.id)) // 서버 저장
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext
        items={localItems.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        {localItems.map((item) => (
          <SortableItem key={item.id} item={item} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
```

### 3.2 Sortable Item with Drag Handle

```typescript
'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'

interface SortableItemProps {
  item: { id: string; title: string }
}

export function SortableItem({ item }: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef, // 드래그 핸들용
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-white border rounded-lg"
    >
      {/* 드래그 핸들 - 모바일에서 필수 */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>

      <span>{item.title}</span>
    </div>
  )
}
```

---

## 4. Prisma Self-Relation 패턴

### 4.1 폴더 계층 구조 스키마

```prisma
model LinkFolder {
  id        String        @id @default(cuid())
  name      String
  sortOrder Int           @default(0)
  ownerType LinkOwnerType

  // 자기 참조 관계
  parentId  String?
  parent    LinkFolder?   @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children  LinkFolder[]  @relation("FolderHierarchy")

  // 소유자
  userId    String?
  user      User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  teamId    String?
  team      Team?         @relation(fields: [teamId], references: [id], onDelete: Cascade)

  links     Link[]

  @@index([parentId])
  @@index([userId, ownerType])
  @@index([teamId, ownerType])
}
```

### 4.2 폴더 트리 조회 쿼리

```typescript
// 재귀적으로 children을 포함하여 조회
async function getFolderTree(userId: string, teamId: string | null) {
  const personalFolders = await prisma.linkFolder.findMany({
    where: {
      userId,
      ownerType: 'PERSONAL',
      parentId: null, // 최상위 폴더만
    },
    include: {
      children: {
        include: {
          children: {
            include: {
              children: true, // 3단계까지 중첩
              _count: { select: { links: true } },
            },
            orderBy: { sortOrder: 'asc' },
          },
          _count: { select: { links: true } },
        },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { links: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  // 팀 폴더도 동일하게...
  return { personal: personalFolders, team: teamFolders }
}
```

### 4.3 폴더 이동 (parentId 변경)

```typescript
async function moveFolder(folderId: string, newParentId: string | null) {
  // 순환 참조 방지 검사
  if (newParentId) {
    const ancestors = await getAncestors(newParentId)
    if (ancestors.some((a) => a.id === folderId)) {
      throw new Error('Cannot move folder into its own descendant')
    }
  }

  await prisma.linkFolder.update({
    where: { id: folderId },
    data: { parentId: newParentId },
  })
}
```

---

## 5. 구현 태스크 상세

### Phase 1: 데이터베이스 (Day 1)

#### 1.1 Prisma 스키마 수정

**파일:** `prisma/schema.prisma`

```prisma
// 삭제할 모델
// - LinkTag
// - LinkTagOnLink

// 추가할 모델
model LinkFolder {
  id        String        @id @default(cuid())
  name      String
  icon      String?
  ownerType LinkOwnerType @map("owner_type")
  sortOrder Int           @default(0) @map("sort_order")

  parentId  String?       @map("parent_id")
  parent    LinkFolder?   @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children  LinkFolder[]  @relation("FolderHierarchy")

  userId    String?       @map("user_id")
  user      User?         @relation(fields: [userId], references: [id], onDelete: Cascade)

  teamId    String?       @map("team_id")
  team      Team?         @relation(fields: [teamId], references: [id], onDelete: Cascade)

  links     Link[]

  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  @@unique([userId, parentId, name, ownerType])
  @@unique([teamId, parentId, name, ownerType])
  @@index([userId, ownerType])
  @@index([teamId, ownerType])
  @@index([parentId])
  @@index([sortOrder])
  @@map("link_folders")
}

// Link 모델 수정
model Link {
  // ... 기존 필드 ...

  // 삭제: tags LinkTagOnLink[]
  // 추가:
  folderId    String        @map("folder_id")
  folder      LinkFolder    @relation(fields: [folderId], references: [id], onDelete: Cascade)
  sortOrder   Int           @default(0) @map("sort_order")
  sourceTeamLinkId String?  @map("source_team_link_id")

  @@index([folderId])
  @@index([sortOrder])
}

// User 모델 수정
model User {
  // 삭제: linkTags LinkTag[]
  // 추가:
  linkFolders LinkFolder[]
}

// Team 모델 수정
model Team {
  // 삭제: linkTags LinkTag[]
  // 추가:
  linkFolders LinkFolder[]
}
```

#### 1.2 마이그레이션

```bash
npx prisma migrate dev --name folder-based-links
```

---

### Phase 2: 타입 및 Server Actions (Day 2-3)

#### 2.1 타입 수정

**파일:** `src/types/links.ts`

```typescript
export type LinkOwnerType = 'PERSONAL' | 'TEAM'

// 폴더 타입
export interface LinkFolderBasic {
  id: string
  name: string
  icon: string | null
  ownerType: LinkOwnerType
  parentId: string | null
  sortOrder: number
}

export interface LinkFolderWithChildren extends LinkFolderBasic {
  children: LinkFolderWithChildren[]
  _count: { links: number }
}

export interface LinkFolderTree {
  personal: LinkFolderWithChildren[]
  team: LinkFolderWithChildren[]
}

// 링크 타입 수정
export interface LinkWithDetails {
  id: string
  url: string
  title: string
  description: string | null
  favicon: string | null
  rating: number
  ownerType: LinkOwnerType
  sortOrder: number
  folder: LinkFolderBasic  // 변경: tags → folder
  createdBy: { id: string; name: string | null; image: string | null }
  sourceTeamLinkId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateLinkInput {
  url: string
  title: string
  description?: string
  favicon?: string
  rating?: number
  ownerType: LinkOwnerType
  folderId: string  // 변경: tagIds → folderId (필수)
}

export interface LinkFilters {
  ownerType?: LinkOwnerType
  folderId?: string  // 변경: tagIds → folderId
  rating?: number
  search?: string
}
```

#### 2.2 폴더 Actions

**파일:** `src/actions/link-folders.ts` (신규)

| 함수 | 설명 |
|------|------|
| `getFolderTree()` | 개인+팀 폴더 트리 조회 |
| `createFolder(input)` | 폴더 생성 |
| `updateFolder(id, input)` | 폴더 수정 |
| `deleteFolder(id)` | 폴더 삭제 (하위 링크 포함) |
| `moveFolder(id, parentId)` | 폴더 이동 |
| `reorderFolders(updates)` | 폴더 순서 변경 |

#### 2.3 링크 Actions 수정

**파일:** `src/actions/links.ts` (수정)

| 변경 | 내용 |
|------|------|
| `createLink` | `tagIds` → `folderId` |
| `updateLink` | `tagIds` → `folderId` |
| `getLinks` | 태그 필터 → 폴더 필터 |
| `transformLink` | `tags` → `folder` |
| 추가: `moveLink` | 링크 폴더 이동 |
| 추가: `reorderLinks` | 링크 순서 변경 |
| 추가: `copyTeamLinkToPersonal` | 팀 → 개인 복사 |

#### 2.4 삭제할 파일

- `src/actions/link-tags.ts`

---

### Phase 3: UI 컴포넌트 (Day 4-6)

#### 3.1 폴더 사이드바

**파일:** `src/components/links/folder-sidebar.tsx`

```
┌──────────────┐
│ ▼ 내 폴더     │
│   📁 React   │
│     📁 공식  │ ← 중첩 폴더
│   📁 Node.js │
│              │
│ ▼ 팀 폴더     │
│   📁 공유자료 │
│   📥 전체    │ ← 팀 전체 링크
│              │
│ [+ 폴더]     │
└──────────────┘
```

**Props:**
```typescript
interface FolderSidebarProps {
  folderTree: LinkFolderTree
  selectedFolderId: string | null
  onSelectFolder: (folderId: string | null) => void
}
```

#### 3.2 폴더 트리 아이템 (재귀)

**파일:** `src/components/links/folder-tree-item.tsx`

```typescript
interface FolderTreeItemProps {
  folder: LinkFolderWithChildren
  level: number
  isSelected: boolean
  onSelect: () => void
}
```

#### 3.3 링크 목록 (Sortable)

**파일:** `src/components/links/link-list.tsx`

- DndContext + SortableContext 래핑
- 드래그 종료 시 `reorderLinks` 호출
- 낙관적 업데이트 적용

#### 3.4 링크 행

**파일:** `src/components/links/link-row.tsx`

```
≡ React 공식문서        ⭐⭐⭐⭐⭐  홍길동  1시간전
│  │                      │         │       │
│  └─ 제목                └─ 별점   │       └─ 날짜
└─ 드래그 핸들 (터치용)              └─ 생성자 (팀만)
```

#### 3.5 폴더 선택 모달

**파일:** `src/components/links/folder-select-modal.tsx`

- 폴더 트리 표시
- 검색 기능
- 새 폴더 생성 버튼

#### 3.6 빠른 입력

**파일:** `src/components/links/quick-link-input.tsx`

```
[URL 입력창] [📁 폴더선택 ▼] [저장]
```

- URL 붙여넣기 감지
- 폴더 선택 필수 검증
- AI 자동 폴더 선택 (API 키 있을 때)

---

### Phase 4: 페이지 및 네비게이션 (Day 7)

#### 4.1 메인 페이지

**파일:** `src/app/(dashboard)/links/page.tsx`

```typescript
import { getFolderTree } from '@/actions/link-folders'
import { getLinks } from '@/actions/links'
import { FolderSidebar } from '@/components/links/folder-sidebar'
import { LinkList } from '@/components/links/link-list'
import { QuickLinkInput } from '@/components/links/quick-link-input'

interface LinksPageProps {
  searchParams: Promise<{ folderId?: string }>
}

export default async function LinksPage({ searchParams }: LinksPageProps) {
  const params = await searchParams
  const folderId = params.folderId

  const [folderResult, linksResult] = await Promise.all([
    getFolderTree(),
    getLinks({ folderId }),
  ])

  // ... 렌더링
}
```

#### 4.2 네비게이션 추가

**파일:** `src/config/navigation.ts`

```typescript
import { Link2 } from 'lucide-react'

export const navigationConfig: NavCategory[] = [
  // ... 매출관리 ...
  {
    key: 'links',
    label: '링크',
    icon: Link2,
    defaultOpen: true,
    isTemplate: true,
    items: [
      { key: 'links-main', label: '링크 공유', href: '/links', icon: Link2 },
    ],
  },
  // ... 설정 ...
]
```

---

## 6. 테스트 체크리스트

### 6.1 폴더 기능
- [ ] 폴더 생성 (최상위, 중첩)
- [ ] 폴더 수정 (이름, 아이콘)
- [ ] 폴더 삭제 (하위 링크 함께 삭제 확인)
- [ ] 폴더 이동 (다른 폴더 하위로)
- [ ] 폴더 순서 드래그 변경

### 6.2 링크 기능
- [ ] 링크 생성 (폴더 선택 필수)
- [ ] 링크 수정 (폴더 변경 가능)
- [ ] 링크 삭제
- [ ] 링크 순서 드래그 변경
- [ ] 팀 → 개인 복사 (원본 유지 확인)

### 6.3 UI/UX
- [ ] 폴더 트리 접기/펴기
- [ ] 폴더 선택 시 링크 목록 필터링
- [ ] 드래그 핸들 모바일 터치 동작
- [ ] 빈 폴더 상태 표시
- [ ] 로딩 상태 표시

### 6.4 Extension API
- [ ] GET /api/extension/folders - 폴더 트리 반환
- [ ] POST /api/extension/links - folderId 필수 검증
- [ ] POST /api/extension/links/quick - AI 폴더 선택

---

## 7. 일정 추정

| Phase | 작업 | 예상 시간 |
|-------|------|----------|
| 1 | DB 스키마 + 마이그레이션 | 2시간 |
| 2 | 타입 + Server Actions | 4시간 |
| 3 | UI 컴포넌트 (6개) | 8시간 |
| 4 | 페이지 + 네비게이션 | 2시간 |
| 5 | Extension API 수정 | 2시간 |
| 6 | 테스트 + 버그 수정 | 2시간 |

**총 예상:** 20시간 (약 3일)

---

## 8. 위험 요소 및 대응

| 위험 | 영향 | 대응 |
|------|------|------|
| 기존 태그 데이터 손실 | 중 | 현재 실 데이터 없음 - 스킵 가능 |
| dnd-kit React 19 호환성 | 중 | 최신 버전 사용, 이슈 발생 시 대안 검토 |
| 중첩 폴더 쿼리 성능 | 낮 | 3단계 제한, 필요시 페이지네이션 |
| 순환 참조 버그 | 중 | moveFolder에 순환 검사 로직 필수 |

---

## 9. 파일 생성/수정 목록

### 신규 생성
```
src/actions/link-folders.ts
src/components/links/folder-sidebar.tsx
src/components/links/folder-tree-item.tsx
src/components/links/folder-select-modal.tsx
src/components/links/folder-create-dialog.tsx
src/components/links/link-list.tsx
src/components/links/link-row.tsx
src/components/links/quick-link-input.tsx
src/app/(dashboard)/links/page.tsx
src/app/(dashboard)/links/loading.tsx
src/app/api/extension/folders/route.ts
```

### 수정
```
prisma/schema.prisma
src/types/links.ts
src/actions/links.ts
src/config/navigation.ts
src/app/api/extension/links/route.ts
src/app/api/extension/links/quick/route.ts
```

### 삭제
```
src/actions/link-tags.ts
```
