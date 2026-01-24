# 링크 공유 기능 기술 명세서

> 작성일: 2026-01-24
> 버전: 3.0 (폴더 기반으로 변경)

## 목차
1. [개요](#1-개요)
2. [데이터베이스 스키마](#2-데이터베이스-스키마)
3. [API 설계 (Server Actions)](#3-api-설계-server-actions)
4. [웹 앱 페이지 및 컴포넌트](#4-웹-앱-페이지-및-컴포넌트)
5. [Chrome Extension 구조](#5-chrome-extension-구조)
6. [AI 자동 폴더 선택 기능](#6-ai-자동-폴더-선택-기능)
7. [구현 순서](#7-구현-순서)
8. [기존 코드 마이그레이션](#8-기존-코드-마이그레이션)

---

## 1. 개요

### 1.1 기능 요약
사용자가 유용한 링크를 저장하고 **폴더**로 정리할 수 있는 기능. 개인 링크와 팀 링크를 분리하여 관리하며, 다양한 무료 AI API를 통해 자동 폴더 선택 가능.

### 1.2 핵심 요구사항 (v3.0 - 폴더 기반)

| 구분 | 설명 |
|------|------|
| **개인 폴더** | 본인만 볼 수 있는 폴더 및 링크 |
| **팀 폴더** | 팀원 모두가 볼 수 있는 폴더 및 링크 |
| **폴더 시스템** | 계층형 폴더 구조 (Chrome 북마크처럼 중첩 가능) |
| **폴더 필수** | 링크 저장 시 반드시 폴더 선택 필요 (미분류 없음) |
| **팀 → 개인 복사** | 팀 링크를 개인 폴더로 복사 (원본 유지) |
| **메타데이터** | 메모, 별점(0-5), favicon |
| **AI 폴더 선택** | AI가 기존 폴더 중 적합한 폴더 선택 (새 폴더 생성 안함) |
| **드래그앤드롭** | 링크 및 폴더 순서 커스텀 정렬 |
| **북마크 가져오기** | Chrome 북마크 HTML 파일 가져오기 |

### 1.3 핵심 UX 플로우

**폴더 선택 필수:**
```
URL 붙여넣기 → 폴더 선택 → Enter → 저장 완료
```

**AI 자동 모드 (API 키 있을 때):**
```
URL 붙여넣기 → Enter → AI가 기존 폴더에서 선택 → 자동 저장 완료
```

### 1.4 기존 프로젝트 스택

| 항목 | 현재 패턴 |
|------|----------|
| **프레임워크** | Next.js 16 (App Router) |
| **인증** | NextAuth v5 (JWT 전략, Google OAuth) |
| **DB** | Prisma + PostgreSQL |
| **Server Actions** | `'use server'` + Zod 검증 + `ActionResult<T>` 타입 |
| **UI** | shadcn/ui + Tailwind CSS + lucide-react 아이콘 |
| **폼** | react-hook-form + @hookform/resolvers/zod |

### 1.5 추가 의존성

```json
{
  "@dnd-kit/core": "^6.x",
  "@dnd-kit/sortable": "^8.x",
  "@dnd-kit/utilities": "^3.x"
}
```

---

## 2. 데이터베이스 스키마

### 2.1 현재 스키마 (삭제 대상)

현재 태그 기반 구조가 구현되어 있음:
- `LinkTag` 모델
- `LinkTagOnLink` 모델 (다대다 연결)
- `Link.tags` 관계

### 2.2 새로운 폴더 기반 스키마

```prisma
// prisma/schema.prisma

// ============================================
// 링크 공유 모델 (v3.0 - 폴더 기반)
// ============================================

enum LinkOwnerType {
  PERSONAL
  TEAM
}

// 폴더 모델 (계층형)
model LinkFolder {
  id        String        @id @default(cuid())
  name      String
  icon      String?       // Emoji or Lucide icon name
  ownerType LinkOwnerType @map("owner_type")
  sortOrder Int           @default(0) @map("sort_order")
  
  // 계층 구조 (자기 참조)
  parentId  String?       @map("parent_id")
  parent    LinkFolder?   @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children  LinkFolder[]  @relation("FolderHierarchy")
  
  // 소유자 (PERSONAL일 때 userId 사용, TEAM일 때 teamId 사용)
  userId    String?       @map("user_id")
  user      User?         @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  teamId    String?       @map("team_id")
  team      Team?         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  // 폴더에 속한 링크들
  links     Link[]
  
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")
  
  // 같은 부모 폴더 내에서 폴더 이름 중복 방지
  @@unique([userId, parentId, name, ownerType])
  @@unique([teamId, parentId, name, ownerType])
  @@index([userId, ownerType])
  @@index([teamId, ownerType])
  @@index([parentId])
  @@index([sortOrder])
  @@map("link_folders")
}

// 링크 모델 (수정)
model Link {
  id          String        @id @default(cuid())
  url         String
  title       String
  description String?       @db.Text  // 메모
  favicon     String?                 // favicon URL
  rating      Int           @default(0)  // 0-5 별점
  ownerType   LinkOwnerType @map("owner_type")
  sortOrder   Int           @default(0) @map("sort_order")  // 폴더 내 정렬 순서
  
  // 폴더 (필수)
  folderId    String        @map("folder_id")
  folder      LinkFolder    @relation(fields: [folderId], references: [id], onDelete: Cascade)
  
  // 소유자
  userId      String?       @map("user_id")
  user        User?         @relation("PersonalLinks", fields: [userId], references: [id], onDelete: Cascade)
  
  teamId      String?       @map("team_id")
  team        Team?         @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  // 생성자 (팀 링크의 경우 누가 추가했는지)
  createdById String        @map("created_by_id")
  createdBy   User          @relation("CreatedLinks", fields: [createdById], references: [id])
  
  // 복사 원본 추적 (팀 → 개인 복사 시)
  sourceTeamLinkId String?  @map("source_team_link_id")
  
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  
  @@index([userId, ownerType])
  @@index([teamId, ownerType])
  @@index([folderId])
  @@index([rating])
  @@index([sortOrder])
  @@index([createdAt])
  @@map("links")
}
```

### 2.3 User 모델 업데이트

```prisma
model User {
  // ... 기존 필드들 ...
  
  // 링크 공유 관련 (수정)
  linkFolders    LinkFolder[]  // 변경: linkTags → linkFolders
  personalLinks  Link[]        @relation("PersonalLinks")
  createdLinks   Link[]        @relation("CreatedLinks")
  
  // AI 자동 폴더 선택 설정 (기존 유지)
  aiProvider       String? @map("ai_provider")
  aiApiKey         String? @map("ai_api_key") @db.Text
  aiModel          String? @map("ai_model")
  aiAutoTagEnabled Boolean @default(true) @map("ai_auto_tag_enabled")  // 이제 AI 자동 폴더 선택 의미
  
  // 링크 저장 설정 (기존 유지)
  linkSavePersonal Boolean @default(true) @map("link_save_personal")
  linkSaveTeam     Boolean @default(false) @map("link_save_team")
}
```

### 2.4 Team 모델 업데이트

```prisma
model Team {
  // ... 기존 필드들 ...
  
  // 링크 공유 관련 (수정)
  linkFolders    LinkFolder[]  // 변경: linkTags → linkFolders
  links          Link[]
}
```

### 2.5 삭제할 모델

```prisma
// 아래 모델들 삭제
model LinkTag { ... }
model LinkTagOnLink { ... }
```

---

## 3. API 설계 (Server Actions)

### 3.1 타입 정의

```typescript
// src/types/links.ts

export type LinkOwnerType = 'PERSONAL' | 'TEAM'

// ============================================
// 폴더 타입
// ============================================

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
  _count: {
    links: number
  }
}

export interface LinkFolderTree {
  personal: LinkFolderWithChildren[]
  team: LinkFolderWithChildren[]
}

// ============================================
// 링크 타입
// ============================================

export interface LinkWithDetails {
  id: string
  url: string
  title: string
  description: string | null
  favicon: string | null
  rating: number
  ownerType: LinkOwnerType
  sortOrder: number
  folder: LinkFolderBasic
  createdBy: {
    id: string
    name: string | null
    image: string | null
  }
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

export interface UpdateLinkInput {
  title?: string
  description?: string
  rating?: number
  folderId?: string  // 변경: tagIds → folderId
}

export interface LinkFilters {
  ownerType?: LinkOwnerType
  folderId?: string  // 변경: tagIds → folderId
  rating?: number
  search?: string
  startDate?: Date
  endDate?: Date
}

export interface PaginatedLinks {
  links: LinkWithDetails[]
  total: number
  page: number
  perPage: number
  totalPages: number
}

// ============================================
// AI 폴더 추천
// ============================================

export interface AIFolderResult {
  folderId: string
  folderName: string
  folderPath: string  // "React > 공식문서" 형태
  confidence: number
  reason: string
}

// ============================================
// Chrome 북마크 가져오기
// ============================================

export interface BookmarkImportNode {
  title: string
  url?: string
  children?: BookmarkImportNode[]
}

export interface BookmarkImportResult {
  foldersCreated: number
  linksCreated: number
  errors: string[]
}

// ============================================
// 사용자 설정
// ============================================

export interface LinkSaveSettings {
  savePersonal: boolean
  saveTeam: boolean
}

export type AIProvider =
  | 'cerebras'
  | 'groq'
  | 'gemini'
  | 'openrouter'
  | 'together'
  | 'cohere'
  | 'glm'
  | 'mistral'

export interface AISettings {
  provider: AIProvider | null
  apiKey: string | null
  model: string | null
  autoFolderEnabled: boolean  // 변경: autoTagEnabled → autoFolderEnabled
}
```

### 3.2 Server Actions - 폴더 관리

**파일:** `src/actions/link-folders.ts`

| 함수명 | 설명 | 입력 | 출력 |
|--------|------|------|------|
| `getFolderTree()` | 폴더 트리 조회 (개인+팀) | - | `ActionResult<LinkFolderTree>` |
| `getFolders(ownerType)` | 폴더 목록 조회 (flat) | `'PERSONAL' \| 'TEAM'` | `ActionResult<LinkFolderBasic[]>` |
| `createFolder(input)` | 폴더 생성 | `{ name, icon?, parentId?, ownerType }` | `ActionResult<LinkFolderBasic>` |
| `updateFolder(id, input)` | 폴더 수정 | `id, { name?, icon? }` | `ActionResult<LinkFolderBasic>` |
| `deleteFolder(id)` | 폴더 삭제 (하위 링크도 삭제) | `id` | `ActionResult` |
| `moveFolder(id, parentId)` | 폴더 이동 | `id, newParentId \| null` | `ActionResult<LinkFolderBasic>` |
| `reorderFolders(ids)` | 폴더 순서 변경 | `{ id, sortOrder }[]` | `ActionResult` |

### 3.3 Server Actions - 링크 관리

**파일:** `src/actions/links.ts` (수정)

| 함수명 | 설명 | 변경사항 |
|--------|------|----------|
| `getLinks(filters, page, perPage)` | 링크 목록 조회 | `tagIds` → `folderId` 필터 |
| `getLinkById(id)` | 링크 단일 조회 | `tags` → `folder` 관계 |
| `createLink(input)` | 링크 생성 | `tagIds` → `folderId` (필수) |
| `updateLink(id, input)` | 링크 수정 | `tagIds` → `folderId` |
| `deleteLink(id)` | 링크 삭제 | 변경 없음 |
| `moveLink(id, folderId)` | 링크 폴더 이동 | **신규** |
| `reorderLinks(folderId, ids)` | 링크 순서 변경 | **신규** |
| `copyTeamLinkToPersonal(linkId, folderId)` | 팀 링크 → 개인 폴더 복사 | **신규** |

### 3.4 Server Actions - AI 폴더 선택

**파일:** `src/actions/ai-folders.ts` (신규, 기존 ai-tags.ts 대체)

| 함수명 | 설명 |
|--------|------|
| `suggestFolder(url, title, ownerType)` | AI로 폴더 추천 (기존 폴더에서 선택) |
| `quickSaveLink(url, ownerType)` | 빠른 저장 (AI 자동 폴더 선택) |

### 3.5 Server Actions - 북마크 가져오기

**파일:** `src/actions/import-bookmarks.ts` (수정)

| 함수명 | 설명 |
|--------|------|
| `parseBookmarkHtml(html)` | Chrome 북마크 HTML 파싱 |
| `importBookmarks(nodes, ownerType, targetFolderId?)` | 북마크 가져오기 (폴더 구조 유지) |

---

## 4. 웹 앱 페이지 및 컴포넌트

### 4.1 라우트 구조

```
src/app/(dashboard)/links/
├── page.tsx                    # 메인 링크 목록 페이지 (폴더 사이드바 포함)
├── loading.tsx                 # 로딩 상태
└── import/
    └── page.tsx               # Chrome 북마크 가져오기 페이지
```

### 4.2 컴포넌트 구조

```
src/components/links/
├── folder-sidebar.tsx         # 폴더 트리 사이드바 (핵심)
├── folder-tree-item.tsx       # 폴더 트리 아이템 (재귀 컴포넌트)
├── folder-create-dialog.tsx   # 폴더 생성 다이얼로그
├── folder-select-modal.tsx    # 폴더 선택 모달 (링크 저장 시)
├── quick-link-input.tsx       # URL 입력 + 빠른 저장 (수정)
├── link-list.tsx              # 링크 목록 (드래그앤드롭)
├── link-row.tsx               # 링크 행 컴포넌트
├── link-dialog.tsx            # 링크 상세/수정 다이얼로그
├── star-rating.tsx            # 별점 컴포넌트
└── bookmark-import-wizard.tsx # 북마크 가져오기 위자드
```

### 4.3 메인 페이지 UI (확정된 레이아웃)

```
┌────────────────────────────────────────────────────────────────────┐
│ 🔗 링크                                          [북마크 가져오기] │
├──────────────┬─────────────────────────────────────────────────────┤
│ ▼ 내 폴더     │ [URL 입력창] [📁 폴더선택 ▼] [저장]                │
│   📁 React   │ ─────────────────────────────────────────────────── │
│     📁 공식  │ 📁 React > 공식  (12개)                             │
│   📁 Node.js │ ─────────────────────────────────────────────────── │
│              │ ≡ React 공식문서        ⭐⭐⭐⭐⭐  홍길동  1시간전 │
│ ▼ 팀 폴더     │ ≡ Next.js Docs         ⭐⭐⭐⭐☆  김철수  2시간전 │
│   📁 공유자료 │                                                     │
│   📥 전체    │ ← 드래그로 순서 변경 가능                           │
│              │                                                     │
│ [+ 폴더]     │                                                     │
└──────────────┴─────────────────────────────────────────────────────┘
```

### 4.4 레이아웃 상세

| 영역 | 설명 |
|------|------|
| **왼쪽 사이드바** | 폴더 트리 (개인 + 팀), 접기/펼치기 가능 |
| **오른쪽 상단** | URL 입력창 + 폴더 선택 드롭다운 + 저장 버튼 |
| **오른쪽 중앙** | 현재 선택된 폴더 경로 + 링크 개수 |
| **오른쪽 하단** | 링크 목록 (드래그 핸들 + 제목 + 별점 + 생성자 + 날짜) |

### 4.5 링크 행 표시 정보

| 항목 | 표시 위치 | 조건 |
|------|----------|------|
| 드래그 핸들 (≡) | 왼쪽 | 항상 표시 (모바일에서만) |
| 제목 | 중앙 | 항상 표시 |
| URL | 제목 아래 (작은 텍스트) | 항상 표시 |
| 별점 (⭐) | 오른쪽 | 항상 표시 |
| 등록일 | 오른쪽 | 공간 있을 때 |
| 생성자 | 오른쪽 | 공간 있을 때 (팀 링크만) |

### 4.6 드래그앤드롭 상세

**데스크톱:**
- 행 전체를 드래그하여 순서 변경
- 다른 폴더로 드래그하여 이동

**모바일:**
- ≡ 핸들을 터치하여 드래그
- 길게 터치하여 순서 변경

**구현:**
- `@dnd-kit/core` + `@dnd-kit/sortable` 사용
- TouchSensor 추가로 모바일 지원

### 4.7 폴더 선택 모달

```
┌─────────────────────────────────────┐
│ 폴더 선택                      [X]  │
├─────────────────────────────────────┤
│ 🔍 [검색...]                        │
├─────────────────────────────────────┤
│ ▼ 내 폴더                           │
│   📁 React                          │
│     📁 공식문서  ← 클릭 시 선택     │
│     📁 튜토리얼                     │
│   📁 Node.js                        │
│                                     │
│ ▼ 팀 폴더                           │
│   📁 공유자료                       │
│   📁 프로젝트                       │
├─────────────────────────────────────┤
│ 선택: React > 공식문서              │
│                          [+ 새 폴더] │
└─────────────────────────────────────┘
```

### 4.8 팀 → 개인 복사 UI

팀 링크에서 우클릭 또는 메뉴:
```
┌─────────────────────────┐
│ 📋 복사하기              │
│ 📁 내 폴더로 복사 →      │  ← 클릭 시 폴더 선택 모달
│ ✏️ 수정                  │
│ 🗑️ 삭제                  │
└─────────────────────────┘
```

### 4.9 네비게이션 업데이트

`src/config/navigation.ts`:

```typescript
import { Link2 } from 'lucide-react'

export const navigationConfig: NavCategory[] = [
  // ... 기존 매출관리 ...
  {
    key: 'links',
    label: '링크',
    icon: Link2,
    defaultOpen: true,
    isTemplate: true,  // 템플릿 시스템과 연동
    items: [
      { key: 'links-main', label: '링크 공유', href: '/links', icon: Link2 },
    ],
  },
  // ... 기존 설정 ...
]
```

---

## 5. Chrome Extension 구조

### 5.1 Extension Popup UI (폴더 버전)

```
┌─────────────────────────────────────┐
│ 🔗 링크 저장                    ⚙️  │
├─────────────────────────────────────┤
│ 📄 React - A JavaScript library...  │
│    https://react.dev                │
├─────────────────────────────────────┤
│ 📁 폴더: [폴더 선택 ▼]              │  ← 클릭하면 폴더 트리
│         React > 공식문서            │  ← 선택된 폴더 경로
├─────────────────────────────────────┤
│ [✓] 개인  [ ] 팀                    │
├─────────────────────────────────────┤
│ [✓] Chrome 북마크에도 추가          │
│     📁 [북마크바 > 개발 ▼]          │
├─────────────────────────────────────┤
│ [▶ AI 자동 선택] [저장]             │
└─────────────────────────────────────┘
```

### 5.2 Extension API 엔드포인트 (수정)

```
src/app/api/extension/
├── auth/check/route.ts      # GET - 인증 상태
├── folders/route.ts         # GET - 폴더 트리 (신규)
├── links/route.ts           # POST - 링크 생성 (folderId 필수)
├── links/quick/route.ts     # POST - 빠른 저장 (AI 폴더 선택)
└── settings/route.ts        # GET/POST - 저장 설정
```

---

## 6. AI 자동 폴더 선택 기능

### 6.1 동작 방식

1. 사용자가 AI Provider 선택 + API 키 설정
2. URL 붙여넣기 + Enter
3. 서버에서 URL 메타데이터 추출 (제목, 설명)
4. **AI API 호출 → 기존 폴더 목록에서 적합한 폴더 선택**
5. 자동으로 링크 저장 + 선택된 폴더에 저장
6. 완료 알림

### 6.2 AI 프롬프트 (폴더 버전)

```typescript
const prompt = `
당신은 링크 분류 전문가입니다. 주어진 링크에 가장 적합한 폴더를 기존 폴더 목록에서 선택해주세요.

## 링크 정보
- URL: ${url}
- 제목: ${title}
- 설명: ${description || '없음'}

## 사용 가능한 폴더 (이 중에서만 선택)
${folders.map(f => `- ${f.path} (id: ${f.id})`).join('\n')}

## 규칙
1. 반드시 위 폴더 목록에서만 선택하세요
2. 가장 구체적인 하위 폴더를 우선 선택하세요
3. 적합한 폴더가 없으면 가장 상위의 일반적인 폴더를 선택하세요
4. **절대로 새 폴더를 제안하지 마세요**

## 응답 형식 (JSON만 출력)
{
  "folderId": "선택한 폴더 ID",
  "reason": "선택 이유 (한 문장)"
}
`
```

### 6.3 폴더 경로 생성

```typescript
// 폴더 경로 예시: "React > 공식문서 > Hooks"
function getFolderPath(folder: LinkFolderWithChildren, folders: LinkFolderWithChildren[]): string {
  const path: string[] = [folder.name]
  let current = folder
  
  while (current.parentId) {
    const parent = findFolder(folders, current.parentId)
    if (parent) {
      path.unshift(parent.name)
      current = parent
    } else {
      break
    }
  }
  
  return path.join(' > ')
}
```

---

## 7. 구현 순서

### Phase 1: 데이터베이스 마이그레이션 (1일)

| 순서 | 작업 | 파일 |
|------|------|------|
| 1-1 | LinkFolder 모델 추가 | `prisma/schema.prisma` |
| 1-2 | Link 모델 수정 (folderId 추가) | `prisma/schema.prisma` |
| 1-3 | LinkTag, LinkTagOnLink 삭제 | `prisma/schema.prisma` |
| 1-4 | User, Team 관계 수정 | `prisma/schema.prisma` |
| 1-5 | 마이그레이션 실행 | `npx prisma migrate dev --name folder-based-links` |

### Phase 2: 타입 및 Server Actions (2-3일)

| 순서 | 작업 | 파일 |
|------|------|------|
| 2-1 | 타입 정의 수정 | `src/types/links.ts` |
| 2-2 | 폴더 CRUD Actions | `src/actions/link-folders.ts` (신규) |
| 2-3 | 링크 Actions 수정 | `src/actions/links.ts` |
| 2-4 | 태그 Actions 삭제 | `src/actions/link-tags.ts` 삭제 |
| 2-5 | AI 폴더 선택 Actions | `src/actions/ai-folders.ts` (신규) |
| 2-6 | 북마크 가져오기 수정 | `src/actions/import-bookmarks.ts` |
| 2-7 | Extension API 수정 | `src/app/api/extension/*` |

### Phase 3: UI 컴포넌트 (3-4일)

| 순서 | 작업 | 파일 |
|------|------|------|
| 3-1 | 폴더 사이드바 | `src/components/links/folder-sidebar.tsx` |
| 3-2 | 폴더 트리 아이템 | `src/components/links/folder-tree-item.tsx` |
| 3-3 | 폴더 선택 모달 | `src/components/links/folder-select-modal.tsx` |
| 3-4 | 빠른 입력 수정 | `src/components/links/quick-link-input.tsx` |
| 3-5 | 링크 목록 (dnd) | `src/components/links/link-list.tsx` |
| 3-6 | 링크 행 | `src/components/links/link-row.tsx` |
| 3-7 | 메인 페이지 | `src/app/(dashboard)/links/page.tsx` |
| 3-8 | 북마크 가져오기 | `src/app/(dashboard)/links/import/page.tsx` |

### Phase 4: 네비게이션 및 마무리 (1일)

| 순서 | 작업 | 파일 |
|------|------|------|
| 4-1 | 네비게이션 추가 | `src/config/navigation.ts` |
| 4-2 | 설정 페이지 수정 | 필요시 |

### 예상 총 기간
- **최소**: 1주 (풀타임)
- **일반**: 1.5주

---

## 8. 기존 코드 마이그레이션

### 8.1 현재 구현된 코드 (유지/수정 필요)

| 파일 | 상태 | 조치 |
|------|------|------|
| `prisma/schema.prisma` | 태그 기반 | 폴더 기반으로 수정 |
| `src/types/links.ts` | 태그 기반 | 폴더 기반으로 수정 |
| `src/actions/links.ts` | 태그 기반 | 폴더 기반으로 수정 |
| `src/actions/link-tags.ts` | 태그 관리 | **삭제** |
| `src/app/api/extension/links/route.ts` | 태그 기반 | 폴더 기반으로 수정 |
| `src/app/api/extension/links/quick/route.ts` | 태그 기반 | 폴더 기반으로 수정 |

### 8.2 신규 생성 파일

| 파일 | 설명 |
|------|------|
| `src/actions/link-folders.ts` | 폴더 CRUD |
| `src/actions/ai-folders.ts` | AI 폴더 선택 |
| `src/components/links/folder-sidebar.tsx` | 폴더 사이드바 |
| `src/components/links/folder-tree-item.tsx` | 폴더 트리 아이템 |
| `src/components/links/folder-select-modal.tsx` | 폴더 선택 모달 |
| `src/components/links/link-list.tsx` | 링크 목록 |
| `src/components/links/link-row.tsx` | 링크 행 |
| `src/app/(dashboard)/links/page.tsx` | 메인 페이지 |
| `src/app/(dashboard)/links/import/page.tsx` | 북마크 가져오기 |
| `src/app/api/extension/folders/route.ts` | 폴더 API |

### 8.3 데이터 마이그레이션 전략

기존 태그 기반 데이터가 있는 경우:
1. 각 태그를 최상위 폴더로 변환
2. 태그에 연결된 링크들을 해당 폴더로 이동
3. 기존 다대다 관계를 일대다로 변환 (가장 관련성 높은 태그의 폴더 선택)

**주의**: 현재 실제 링크 데이터가 없다면 마이그레이션 스크립트 불필요

---

## 부록: 체크리스트

### 데이터베이스
- [ ] LinkFolder 모델 추가
- [ ] Link 모델에 folderId 추가 (필수)
- [ ] Link 모델에 sortOrder 추가
- [ ] LinkTag, LinkTagOnLink 모델 삭제
- [ ] User.linkTags → User.linkFolders 변경
- [ ] Team.linkTags → Team.linkFolders 변경

### Server Actions
- [ ] link-folders.ts 생성 (CRUD + reorder)
- [ ] links.ts 수정 (tagIds → folderId)
- [ ] ai-folders.ts 생성 (AI 폴더 선택)
- [ ] link-tags.ts 삭제
- [ ] import-bookmarks.ts 수정

### UI 컴포넌트
- [ ] folder-sidebar.tsx (폴더 트리)
- [ ] folder-tree-item.tsx (재귀 렌더링)
- [ ] folder-select-modal.tsx (폴더 선택)
- [ ] link-list.tsx (dnd-kit 적용)
- [ ] link-row.tsx (드래그 핸들)
- [ ] quick-link-input.tsx 수정

### 기능
- [ ] 폴더 계층 구조 (중첩 폴더)
- [ ] 폴더 내 링크 드래그앤드롭 정렬
- [ ] 폴더 간 링크 이동
- [ ] 팀 → 개인 링크 복사 (원본 유지)
- [ ] AI 기존 폴더 선택 (새 폴더 생성 안함)
- [ ] Chrome 북마크 HTML 가져오기 (폴더 구조 유지)

### Extension
- [ ] 폴더 API 엔드포인트 추가
- [ ] 폴더 선택 UI
- [ ] 빠른 저장 (AI 폴더 선택)
