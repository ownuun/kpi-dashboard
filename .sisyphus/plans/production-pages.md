# Production-Ready Pages for KPI Dashboard

## TL;DR

> **Quick Summary**: Next.js 16 KPI Dashboard 앱에 404 페이지, 개인정보처리방침, 이용약관, 문의 페이지, Footer 컴포넌트를 추가하여 production-ready 상태로 만듭니다.
> 
> **Deliverables**:
> - `src/app/not-found.tsx` - 404 에러 페이지
> - `src/app/(public)/privacy/page.tsx` - 개인정보처리방침
> - `src/app/(public)/terms/page.tsx` - 이용약관
> - `src/app/(public)/contact/page.tsx` - 문의 페이지
> - `src/app/(public)/layout.tsx` - 공개 페이지 레이아웃
> - `src/app/(auth)/layout.tsx` - 인증 페이지 레이아웃 (Footer 추가)
> - `src/components/layout/footer.tsx` - Footer 컴포넌트
> - `src/middleware.ts` 업데이트 - 공개 라우트 추가
> 
> **Estimated Effort**: Short (~2-3 hours)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Task 1 (Footer) → Task 2,3,4 (Layouts/Pages) → Task 5 (Middleware)

---

## Context

### Original Request
Next.js 16 KPI Dashboard 앱에 프로덕션에 필요한 페이지들을 추가:
1. 404 Page (not-found.tsx) - Korean, styled
2. Privacy Policy (/privacy) - Korean, mentions Google OAuth
3. Terms of Service (/terms) - Korean, SaaS terms
4. Contact Page (/contact) - Form with mailto: link
5. Footer Component - Links to above, copyright

### Interview Summary
**Key Discussions**:
- **Footer 범위**: 모든 공개 페이지 + 404 + 온보딩 포함
- **문의 폼**: mailto: 링크 방식으로 이메일 클라이언트 열기
- **404 동작**: '홈으로' 버튼은 /login으로 이동
- **테스트**: 자동 테스트 없이 수동 검증

**Research Findings**:
- 기존 디자인 패턴: Card 기반 레이아웃, bg-gray-50, 중앙 정렬
- 기존 에러 페이지(error.tsx): Card + 아이콘 + 제목 + 설명 + 버튼 패턴
- (auth) 라우트 그룹에 layout.tsx 없음 - 새로 생성 필요
- middleware.ts의 PUBLIC_ROUTES에 새 페이지 추가 필요

### Metis Review
**Identified Gaps** (addressed):
- Middleware 업데이트 필요 → Task 5에서 처리
- (auth)/layout.tsx 생성 필요 → Task 3에서 처리
- 404 페이지 Footer 여부 → 표시하기로 결정
- 온보딩 Footer 여부 → 표시하기로 결정

---

## Work Objectives

### Core Objective
KPI Dashboard 앱에 production-ready 공개 페이지들을 추가하여 사용자에게 법적 정보 제공 및 문의 수단 제공

### Concrete Deliverables
- Footer 컴포넌트: 개인정보처리방침, 이용약관, 문의 링크 + 저작권
- 404 페이지: 한국어 에러 메시지 + 로그인 버튼 + Footer
- 개인정보처리방침 페이지: Google OAuth 데이터 수집 언급
- 이용약관 페이지: SaaS 서비스 관련 조항 (플레이스홀더)
- 문의 페이지: 이름, 이메일, 내용 폼 + mailto: 링크

### Definition of Done
- [ ] 모든 공개 페이지에서 Footer 표시됨
- [ ] 404 페이지가 존재하지 않는 라우트에서 표시됨
- [ ] 문의 폼 제출 시 이메일 클라이언트가 열림
- [ ] 모든 페이지가 한국어로 표시됨
- [ ] 모바일에서 반응형으로 동작함

### Must Have
- Footer는 재사용 가능한 컴포넌트로 구현
- 기존 shadcn/ui 컴포넌트 사용 (Card, Button, Separator 등)
- 기존 디자인 패턴 준수 (bg-gray-50, 중앙 정렬)
- 한국어 UI

### Must NOT Have (Guardrails)
- ❌ 백엔드 이메일 발송 API 구현
- ❌ 대시보드 내부에 Footer 표시
- ❌ 복잡한 폼 유효성 검사 (HTML5 기본 검증만)
- ❌ 실제 법적 문서 작성 (플레이스홀더만)
- ❌ 소셜 미디어 링크, 뉴스레터 구독 등 추가 기능
- ❌ 인증 상태에 따른 조건부 렌더링
- ❌ 새로운 CSS 파일 추가 (Tailwind만 사용)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (vitest)
- **User wants tests**: Manual-only
- **Framework**: N/A (manual verification)

### Automated Verification (Playwright Browser)

Each page will be verified via Playwright browser automation:

**Evidence Requirements:**
- Screenshots saved to `.sisyphus/evidence/`
- Navigation verified programmatically
- Form interaction tested
- Mobile responsiveness checked (viewport resize)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Footer 컴포넌트 생성

Wave 2 (After Wave 1):
├── Task 2: (public) 레이아웃 + 공개 페이지 생성
├── Task 3: (auth) 레이아웃 업데이트
└── Task 4: 404 페이지 생성

Wave 3 (After Wave 2):
└── Task 5: Middleware 업데이트

Critical Path: Task 1 → Task 2 → Task 5
Parallel Speedup: ~40% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4 | None |
| 2 | 1 | 5 | 3, 4 |
| 3 | 1 | 5 | 2, 4 |
| 4 | 1 | 5 | 2, 3 |
| 5 | 2, 3, 4 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | delegate_task(category="visual-engineering", load_skills=["frontend-ui-ux"]) |
| 2 | 2, 3, 4 | 3x parallel delegate_task(category="visual-engineering", load_skills=["frontend-ui-ux"]) |
| 3 | 5 | delegate_task(category="quick") |

---

## TODOs

- [ ] 1. Footer 컴포넌트 생성

  **What to do**:
  - `src/components/layout/footer.tsx` 생성
  - 링크: 개인정보처리방침(/privacy), 이용약관(/terms), 문의(/contact)
  - 저작권: © 2025 KPI Dashboard. All rights reserved.
  - 반응형: 모바일에서 링크 세로 정렬
  - 기존 스타일: text-muted-foreground, text-sm

  **Must NOT do**:
  - 소셜 미디어 링크 추가
  - 뉴스레터 구독 폼 추가
  - 인증 상태 확인 로직

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 생성 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: shadcn/ui 디자인 시스템 활용

  **Parallelization**:
  - **Can Run In Parallel**: NO (다른 태스크가 이 태스크에 의존)
  - **Parallel Group**: Wave 1 (단독)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None (can start immediately)

  **References**:

  **Pattern References**:
  - `src/components/layout/header.tsx` - 기존 레이아웃 컴포넌트 패턴 (스타일링, export 방식)
  - `src/components/layout/sidebar.tsx` - 네비게이션 링크 패턴

  **API/Type References**:
  - `src/lib/utils.ts:cn()` - 클래스명 병합 유틸리티

  **External References**:
  - `lucide-react` - 아이콘 라이브러리 (필요시)

  **WHY Each Reference Matters**:
  - `header.tsx`: Footer와 동일한 레이아웃 계층 컴포넌트로 스타일링 패턴 참고
  - `cn()`: 조건부 클래스 적용을 위한 필수 유틸리티

  **Acceptance Criteria**:

  **Automated Verification (Playwright):**
  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/login
  2. Wait for: footer element to be visible
  3. Assert: footer contains link with text "개인정보처리방침"
  4. Assert: footer contains link with text "이용약관"
  5. Assert: footer contains link with text "문의"
  6. Assert: footer contains text "© 2025 KPI Dashboard"
  7. Click: link "개인정보처리방침"
  8. Assert: URL is http://localhost:3000/privacy
  9. Screenshot: .sisyphus/evidence/task-1-footer.png
  ```

  **Evidence to Capture:**
  - [ ] Screenshot of footer on login page
  - [ ] Screenshot of footer on mobile viewport (375px)

  **Commit**: YES
  - Message: `feat(ui): add Footer component with navigation links`
  - Files: `src/components/layout/footer.tsx`
  - Pre-commit: `npm run lint`

---

- [ ] 2. (public) 레이아웃 + 공개 페이지 생성

  **What to do**:
  - `src/app/(public)/layout.tsx` 생성 - Footer 포함, bg-gray-50 배경
  - `src/app/(public)/privacy/page.tsx` 생성 - 개인정보처리방침
    - 한국어 플레이스홀더 내용
    - Google OAuth 데이터 수집 언급 (이메일, 이름, 프로필 사진)
    - Card 기반 레이아웃
  - `src/app/(public)/terms/page.tsx` 생성 - 이용약관
    - 한국어 SaaS 관련 플레이스홀더 내용
    - 서비스 이용, 데이터 처리, 책임 제한 등 기본 항목
  - `src/app/(public)/contact/page.tsx` 생성 - 문의
    - 폼 필드: 이름, 이메일, 문의 내용
    - 제출 버튼 클릭 시 mailto:slit.amazing@gmail.com 링크 열기
    - Subject: [KPI Dashboard 문의] {이름}
    - Body: 이메일, 내용 포함
    - 'use client' 필요 (폼 상태 관리)
  - 모든 페이지에 metadata 추가 (title, description)

  **Must NOT do**:
  - 백엔드 API 호출
  - 실제 법적 문서 작성
  - 복잡한 폼 유효성 검사

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 여러 UI 페이지 생성 작업
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 페이지 레이아웃 및 폼 디자인

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/app/(auth)/login/page.tsx:7-11` - 공개 페이지 레이아웃 패턴 (min-h-screen, flex center, bg-gray-50)
  - `src/app/error.tsx:19-50` - Card 기반 에러/정보 페이지 패턴
  - `src/components/forms/transaction-form.tsx` - 폼 구현 패턴 (Input, Label, Button)

  **API/Type References**:
  - `src/components/ui/card.tsx` - Card, CardHeader, CardTitle, CardDescription, CardContent
  - `src/components/ui/button.tsx` - Button 컴포넌트
  - `src/components/ui/input.tsx` - Input 컴포넌트
  - `src/components/ui/label.tsx` - Label 컴포넌트
  - `src/components/ui/separator.tsx` - Separator 컴포넌트

  **External References**:
  - `mailto: URL scheme` - mailto:email?subject=...&body=...

  **WHY Each Reference Matters**:
  - `login/page.tsx`: 동일한 공개 페이지 스타일 적용을 위한 필수 참고
  - `error.tsx`: Card 기반 정보 페이지 구조의 좋은 예시
  - `transaction-form.tsx`: 폼 필드 배치 및 스타일링 패턴

  **Acceptance Criteria**:

  **Automated Verification (Playwright):**
  ```
  # Privacy page:
  1. Navigate to: http://localhost:3000/privacy
  2. Assert: page title contains "개인정보처리방침"
  3. Assert: page contains text "Google"
  4. Assert: footer is visible
  5. Screenshot: .sisyphus/evidence/task-2-privacy.png

  # Terms page:
  1. Navigate to: http://localhost:3000/terms
  2. Assert: page title contains "이용약관"
  3. Assert: footer is visible
  4. Screenshot: .sisyphus/evidence/task-2-terms.png

  # Contact page:
  1. Navigate to: http://localhost:3000/contact
  2. Assert: page contains input[name="name"]
  3. Assert: page contains input[name="email"]
  4. Assert: page contains textarea[name="message"]
  5. Fill: input[name="name"] with "테스트"
  6. Fill: input[name="email"] with "test@example.com"
  7. Fill: textarea[name="message"] with "테스트 문의입니다"
  8. Assert: submit button is visible
  9. Assert: footer is visible
  10. Screenshot: .sisyphus/evidence/task-2-contact.png
  ```

  **Evidence to Capture:**
  - [ ] Screenshot of privacy page
  - [ ] Screenshot of terms page
  - [ ] Screenshot of contact page with form filled

  **Commit**: YES
  - Message: `feat(pages): add privacy, terms, and contact pages`
  - Files: `src/app/(public)/layout.tsx`, `src/app/(public)/privacy/page.tsx`, `src/app/(public)/terms/page.tsx`, `src/app/(public)/contact/page.tsx`
  - Pre-commit: `npm run lint`

---

- [ ] 3. (auth) 레이아웃 업데이트 - Footer 추가

  **What to do**:
  - `src/app/(auth)/layout.tsx` 생성
  - children 렌더링 + Footer 포함
  - 기존 로그인/온보딩 페이지 스타일 유지 (bg-gray-50 아님, 개별 페이지에서 처리)
  - min-h-screen, flex column, footer at bottom

  **Must NOT do**:
  - 인증 체크 로직 추가 (개별 페이지에서 처리)
  - 기존 페이지 스타일 변경

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 레이아웃 컴포넌트 생성
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 레이아웃 구조 설계

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/app/(dashboard)/layout.tsx` - 라우트 그룹 레이아웃 패턴
  - `src/app/(auth)/login/page.tsx` - 현재 로그인 페이지 구조

  **WHY Each Reference Matters**:
  - `(dashboard)/layout.tsx`: 라우트 그룹 레이아웃 파일 구조 참고
  - `login/page.tsx`: Footer 추가 후에도 기존 스타일이 유지되어야 함

  **Acceptance Criteria**:

  **Automated Verification (Playwright):**
  ```
  # Login page with footer:
  1. Navigate to: http://localhost:3000/login
  2. Assert: page contains "Google로 시작하기" button
  3. Assert: footer is visible at bottom
  4. Assert: footer contains "개인정보처리방침" link
  5. Screenshot: .sisyphus/evidence/task-3-login-footer.png

  # Onboarding page with footer (requires auth, may need mock):
  # If accessible:
  1. Navigate to: http://localhost:3000/onboarding
  2. Assert: footer is visible at bottom
  3. Screenshot: .sisyphus/evidence/task-3-onboarding-footer.png
  ```

  **Evidence to Capture:**
  - [ ] Screenshot of login page with footer
  - [ ] Screenshot verifying footer position (bottom of page)

  **Commit**: YES
  - Message: `feat(layout): add (auth) layout with footer`
  - Files: `src/app/(auth)/layout.tsx`
  - Pre-commit: `npm run lint`

---

- [ ] 4. 404 페이지 생성

  **What to do**:
  - `src/app/not-found.tsx` 생성
  - 한국어 에러 메시지: "페이지를 찾을 수 없습니다"
  - 설명: "요청하신 페이지가 존재하지 않거나 이동되었습니다"
  - "로그인으로 돌아가기" 버튼 → /login 링크
  - error.tsx 스타일 참고 (Card + 아이콘 + 메시지)
  - Footer 포함 (직접 import)
  - bg-gray-50 배경, 중앙 정렬

  **Must NOT do**:
  - 에러 추적/분석 기능
  - 검색 박스 추가
  - 추천 페이지 목록

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 에러 페이지 UI 구현
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 에러 페이지 디자인

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/app/error.tsx:19-50` - 에러 페이지 UI 패턴 (Card + icon + title + description + button)
  - `src/app/(auth)/login/page.tsx:7` - 중앙 정렬 레이아웃 (min-h-screen flex items-center justify-center)

  **API/Type References**:
  - `src/components/ui/card.tsx` - Card 컴포넌트
  - `src/components/ui/button.tsx` - Button 컴포넌트
  - `lucide-react:FileQuestion` - 404 아이콘으로 적합

  **WHY Each Reference Matters**:
  - `error.tsx`: 기존 에러 페이지와 일관된 디자인 유지
  - `lucide-react`: 적절한 404 아이콘 선택

  **Acceptance Criteria**:

  **Automated Verification (Playwright):**
  ```
  # 404 page:
  1. Navigate to: http://localhost:3000/nonexistent-page-12345
  2. Assert: page contains text "페이지를 찾을 수 없습니다"
  3. Assert: page contains button or link with text containing "로그인"
  4. Assert: footer is visible
  5. Click: button/link containing "로그인"
  6. Assert: URL is http://localhost:3000/login
  7. Screenshot: .sisyphus/evidence/task-4-404.png
  ```

  **Evidence to Capture:**
  - [ ] Screenshot of 404 page
  - [ ] Screenshot verifying navigation to login works

  **Commit**: YES
  - Message: `feat(pages): add 404 not-found page`
  - Files: `src/app/not-found.tsx`
  - Pre-commit: `npm run lint`

---

- [ ] 5. Middleware 업데이트 - 공개 라우트 추가

  **What to do**:
  - `src/middleware.ts`의 PUBLIC_ROUTES 배열에 추가:
    - `/privacy`
    - `/terms`
    - `/contact`
  - 인증되지 않은 사용자도 위 페이지 접근 가능하도록

  **Must NOT do**:
  - 기존 라우트 보호 로직 변경
  - 다른 보안 설정 수정

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 배열 수정 작업
  - **Skills**: []
    - 특별한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: NO (최종 태스크)
  - **Parallel Group**: Wave 3 (단독)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 2, 3, 4

  **References**:

  **Pattern References**:
  - `src/middleware.ts:4-6` - PUBLIC_ROUTES 배열 정의

  **WHY Each Reference Matters**:
  - `middleware.ts`: 정확한 배열 위치와 기존 값 확인

  **Acceptance Criteria**:

  **Automated Verification (Playwright):**
  ```
  # Test public access without auth:
  1. Clear cookies/session
  2. Navigate to: http://localhost:3000/privacy
  3. Assert: page loads successfully (not redirected to login)
  4. Assert: page contains "개인정보처리방침"
  
  5. Navigate to: http://localhost:3000/terms
  6. Assert: page loads successfully (not redirected to login)
  7. Assert: page contains "이용약관"
  
  8. Navigate to: http://localhost:3000/contact
  9. Assert: page loads successfully (not redirected to login)
  10. Assert: page contains contact form
  11. Screenshot: .sisyphus/evidence/task-5-public-access.png
  ```

  **Evidence to Capture:**
  - [ ] Screenshot confirming public access to privacy page
  - [ ] Terminal output of `npm run lint` passing

  **Commit**: YES
  - Message: `feat(middleware): add public routes for legal and contact pages`
  - Files: `src/middleware.ts`
  - Pre-commit: `npm run lint`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(ui): add Footer component with navigation links` | footer.tsx | npm run lint |
| 2 | `feat(pages): add privacy, terms, and contact pages` | (public)/*.tsx | npm run lint |
| 3 | `feat(layout): add (auth) layout with footer` | (auth)/layout.tsx | npm run lint |
| 4 | `feat(pages): add 404 not-found page` | not-found.tsx | npm run lint |
| 5 | `feat(middleware): add public routes for legal and contact pages` | middleware.ts | npm run lint |

---

## Success Criteria

### Verification Commands
```bash
npm run lint     # Expected: No errors
npm run build    # Expected: Build successful
npm run dev      # Expected: Dev server starts
```

### Final Checklist
- [ ] Footer 컴포넌트가 재사용 가능하게 구현됨
- [ ] 모든 공개 페이지에서 Footer 표시됨 (login, onboarding, privacy, terms, contact, 404)
- [ ] 404 페이지가 존재하지 않는 라우트에서 표시됨
- [ ] 문의 폼 제출 시 이메일 클라이언트가 열림
- [ ] 모든 페이지가 한국어로 표시됨
- [ ] 모바일에서 반응형으로 동작함
- [ ] 인증 없이 /privacy, /terms, /contact 접근 가능
- [ ] 대시보드 페이지에는 Footer가 표시되지 않음
