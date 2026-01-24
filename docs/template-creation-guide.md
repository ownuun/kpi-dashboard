# 템플릿 작성 가이드

> 새로운 템플릿을 추가할 때 참고하세요.

---

## 1. 템플릿 구조

### 1.1 디렉토리 구조

```
src/app/(dashboard)/
├── [template-route]/           # 템플릿 라우트 (예: employees, attendance)
│   ├── page.tsx                # 메인 페이지
│   ├── loading.tsx             # 로딩 상태
│   └── [id]/                   # 상세 페이지 (필요시)
│       └── page.tsx
```

### 1.2 필수 파일

| 파일 | 설명 | 필수 여부 |
|------|------|----------|
| `page.tsx` | 템플릿 메인 페이지 | O |
| `loading.tsx` | 로딩 스켈레톤 | O |
| `[slug]/page.tsx` | 상세/수정 페이지 | 선택 |

---

## 2. 템플릿 등록 체크리스트

새 템플릿을 추가할 때 아래 항목을 모두 완료해야 합니다.

### 2.1 데이터베이스

- [ ] `prisma/schema.prisma`에 필요한 모델 추가
- [ ] `prisma/seed.ts`에 템플릿 시드 데이터 추가
- [ ] Migration 실행 (`npx prisma migrate dev`)

### 2.2 백엔드

- [ ] `src/actions/[template].ts` - Server Actions 생성
- [ ] CRUD 함수 구현 (create, read, update, delete)
- [ ] 팀 기반 데이터 격리 확인 (`teamId` 필터링)

### 2.3 프론트엔드

- [ ] `src/app/(dashboard)/[route]/page.tsx` - 메인 페이지
- [ ] `src/app/(dashboard)/[route]/loading.tsx` - 로딩 상태
- [ ] 컴포넌트 분리 (폼, 테이블, 필터 등)

### 2.4 네비게이션

- [ ] `src/config/navigation.ts`에 템플릿 항목 추가
- [ ] 적절한 카테고리에 배치
- [ ] 아이콘 선택 (lucide-react)

### 2.5 템플릿 설정 페이지

- [ ] `src/app/(dashboard)/settings/templates/page.tsx` 업데이트
- [ ] 템플릿 정보 (이름, 설명, 아이콘) 추가

---

## 3. 네비게이션 설정

### 3.1 navigation.ts 구조

```typescript
// src/config/navigation.ts

export const navigationConfig: NavCategory[] = [
  {
    key: 'category-key',        // 고유 키
    label: '카테고리명',          // 표시 이름
    icon: CategoryIcon,         // Lucide 아이콘
    defaultOpen: true,          // 기본 펼침 여부
    items: [
      {
        key: 'template-key',    // 고유 키
        label: '템플릿명',        // 표시 이름
        href: '/route',         // 라우트 경로
        icon: TemplateIcon,     // Lucide 아이콘
      },
    ],
  },
]
```

### 3.2 예시: 인사관리 카테고리 추가

```typescript
{
  key: 'hr',
  label: '인사관리',
  icon: Users,
  defaultOpen: false,
  items: [
    { key: 'employees', label: '직원 목록', href: '/employees', icon: UserCheck },
    { key: 'attendance', label: '근태 관리', href: '/attendance', icon: Calendar },
    { key: 'payroll', label: '급여 관리', href: '/payroll', icon: DollarSign },
  ],
},
```

---

## 4. 템플릿 설정 페이지 업데이트

### 4.1 템플릿 정보 구조

```typescript
// src/app/(dashboard)/settings/templates/page.tsx

interface TemplateInfo {
  key: string           // DB 키와 일치
  name: string          // 표시 이름
  description: string   // 간단한 설명 (1줄)
  icon: React.ElementType
  isEnabled: boolean    // 현재 활성화 여부
  isDefault: boolean    // 기본 제공 여부 (매출관리만 true)
}
```

### 4.2 카테고리 정보 구조

```typescript
interface TemplateCategoryInfo {
  key: string
  name: string
  description: string   // 카테고리 설명 (1줄)
  icon: React.ElementType
  templates: TemplateInfo[]
}
```

---

## 5. 데이터베이스 시드

### 5.1 템플릿 카테고리 시드

```typescript
// prisma/seed.ts

const templateCategories = [
  { key: 'sales', name: '매출관리', icon: 'TrendingUp', order: 1 },
  { key: 'hr', name: '인사관리', icon: 'Users', order: 2 },
  { key: 'finance', name: '재무관리', icon: 'Wallet', order: 3 },
  { key: 'crm', name: '영업관리', icon: 'Handshake', order: 4 },
]
```

### 5.2 템플릿 시드

```typescript
const templates = [
  {
    key: 'dashboard',
    name: '대시보드',
    description: '핵심 지표를 한눈에 확인',
    categoryKey: 'sales',
    route: '/',
    icon: 'LayoutDashboard',
    isDefault: true,
    order: 1,
  },
  // ... 추가 템플릿
]
```

---

## 6. Server Actions 패턴

### 6.1 기본 구조

```typescript
// src/actions/[template].ts

'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ActionResult } from '@/types'

const createSchema = z.object({
  // 필드 정의
})

export async function create(
  formData: FormData
): Promise<ActionResult<{ id: string }>> {
  const session = await auth()
  if (!session?.user?.teamId) {
    return { success: false, error: 'Unauthorized' }
  }

  // 구현...
}

export async function getAll(): Promise<ActionResult<Item[]>> {
  const session = await auth()
  if (!session?.user?.teamId) {
    return { success: false, error: 'Unauthorized' }
  }

  const items = await prisma.item.findMany({
    where: { teamId: session.user.teamId },
    orderBy: { createdAt: 'desc' },
  })

  return { success: true, data: items }
}
```

### 6.2 중요 사항

- **팀 격리**: 모든 쿼리에 `teamId` 필터링 필수
- **권한 체크**: `session.user.role` 확인 (ADMIN만 가능한 작업)
- **Revalidation**: 데이터 변경 후 `revalidatePath()` 호출

---

## 7. UI 컴포넌트 가이드라인

### 7.1 사용 가능한 UI 컴포넌트

```
src/components/ui/
├── button.tsx
├── card.tsx
├── dialog.tsx
├── form.tsx
├── input.tsx
├── label.tsx
├── select.tsx
├── table.tsx
├── tabs.tsx
└── ...
```

### 7.2 스타일 가이드

- Tailwind CSS 사용
- shadcn/ui 컴포넌트 활용
- 일관된 색상: `slate` 팔레트
- 반응형: `sm:`, `md:`, `lg:` 브레이크포인트

---

## 8. 미리보기 이미지

### 8.1 저장 위치

```
public/templates/
├── dashboard-preview.png
├── transactions-preview.png
└── [template-key]-preview.png
```

### 8.2 이미지 규격

| 항목 | 값 |
|------|-----|
| 크기 | 800 x 450px (16:9) |
| 형식 | PNG 또는 WebP |
| 용량 | 200KB 이하 |

---

## 9. 테스트 체크리스트

새 템플릿 추가 후 아래 항목을 테스트하세요.

- [ ] 페이지 정상 로딩
- [ ] 로딩 상태 표시
- [ ] CRUD 동작 확인
- [ ] 다른 팀 데이터 접근 불가
- [ ] 사이드바 네비게이션 동작
- [ ] 모바일 네비게이션 동작
- [ ] 템플릿 설정 페이지에서 표시

---

## 10. 예시: 직원 목록 템플릿

### 10.1 Prisma 모델

```prisma
model Employee {
  id        String   @id @default(cuid())
  name      String
  email     String
  position  String?
  phone     String?
  
  teamId    String   @map("team_id")
  team      Team     @relation(fields: [teamId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  
  @@unique([teamId, email])
  @@map("employees")
}
```

### 10.2 navigation.ts 추가

```typescript
// hr 카테고리 items에 추가
{ key: 'employees', label: '직원 목록', href: '/employees', icon: UserCheck },
```

### 10.3 페이지 생성

```
src/app/(dashboard)/employees/
├── page.tsx
├── loading.tsx
└── employee-dialog.tsx
```

---

## 요약

| 단계 | 파일 |
|------|------|
| 1. 스키마 | `prisma/schema.prisma` |
| 2. 시드 | `prisma/seed.ts` |
| 3. 액션 | `src/actions/[template].ts` |
| 4. 페이지 | `src/app/(dashboard)/[route]/` |
| 5. 네비게이션 | `src/config/navigation.ts` |
| 6. 설정 페이지 | `src/app/(dashboard)/settings/templates/page.tsx` |
