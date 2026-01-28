# KPI Dashboard 배포 준비 작업

## TL;DR

> **Quick Summary**: Next.js 16 KPI 대시보드의 프로덕션 배포를 위한 보안 강화, 에러 처리, CI/CD, 테스팅, 모니터링 인프라 구축
> 
> **Deliverables**:
> - 보안 취약점 수정 (SSRF, CORS, 헤더, Rate Limiting)
> - 에러 바운더리 및 Health Check 엔드포인트
> - Vitest 기반 테스트 인프라 + 핵심 테스트
> - GitHub Actions CI/CD 파이프라인
> - Sentry 모니터링 (설치만)
> - Prisma 마이그레이션 및 시드 데이터
> 
> **Estimated Effort**: Large (2-3 days)
> **Parallel Execution**: YES - 4 waves
> **Critical Path**: Task 1 → Task 3 → Task 11 → Task 15

---

## Context

### Original Request
KPI Dashboard (Next.js 16.1.4) 프로젝트의 배포 준비 작업 전체를 계획하고 실행. 7개 explore 에이전트가 수집한 분석 결과를 기반으로 21개 이상의 태스크를 6개 Phase로 나누어 실행.

### Interview Summary
**Key Discussions**:
- **Test framework**: Vitest 선택 (Next.js 16 + React 19 호환성 최적)
- **Production domain**: Vercel 기본 도메인 (환경변수 `NEXT_PUBLIC_APP_URL`로 설정)
- **Sentry**: 설치만, DSN은 환경변수 placeholder
- **Rate limiting**: 일반 100req, 인증 10req, 메타데이터 20req / 15분 / IP
- **Seed data**: TemplateCategory 기본 데이터만

**Research Findings** (7 explore agents):
- 95 TypeScript 파일, 0% 테스트 커버리지
- 55+ console.error 인스턴스 (구조화된 로깅 필요)
- 18 Prisma 모델, 인덱싱 양호
- `.env` 파일에 실제 시크릿 커밋됨 (CRITICAL)
- SSRF 취약점: `/api/links/metadata` (인증 없음, 임의 URL 요청)

### Current Environment Variables
```
DATABASE_URL, DIRECT_URL, AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET, AUTH_URL, TEAM_CREATE_SECRET
```

---

## Work Objectives

### Core Objective
프로덕션 환경에서 안전하고 모니터링 가능하며 유지보수 용이한 배포를 위한 인프라 구축

### Concrete Deliverables
1. `.env.example` - 모든 필수 환경변수 문서화
2. 보안 수정된 `/api/links/metadata/route.ts`
3. 보안 헤더가 추가된 `next.config.ts`
4. Rate limiting이 포함된 `middleware.ts`
5. `/src/app/error.tsx` + `/src/app/global-error.tsx`
6. `/src/app/api/health/route.ts`
7. Sentry 설정 파일들
8. `/.github/workflows/ci.yml`
9. `vitest.config.ts` + 테스트 설정
10. `/prisma/seed.ts` + 마이그레이션 파일
11. 핵심 유닛 테스트 파일들

### Definition of Done
- [ ] `bun run build` 성공 (에러 없음)
- [ ] `bun run test` 통과 (새 테스트 포함)
- [ ] `bun run lint` 통과
- [ ] Health check 엔드포인트 응답 확인
- [ ] CORS 헤더가 환경변수 기반으로 동작 확인

### Must Have
- 모든 보안 취약점 수정
- 에러 바운더리 (사용자에게 친화적인 에러 페이지)
- Health check 엔드포인트
- CI/CD 파이프라인 (lint, build, test)
- 최소 1개 유닛 테스트 (format.ts)

### Must NOT Have (Guardrails)
- 실제 시크릿을 코드나 `.env.example`에 포함하지 않음
- 기존 API 계약을 변경하지 않음 (응답 형식 유지)
- UI 텍스트는 한국어 유지
- Docker 설정 (Vercel 배포 대상)
- Redis 설정 (향후 확장으로 연기)
- E2E 테스트 (이번 스코프 외)

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: NO (현재 없음 → 설치 필요)
- **User wants tests**: YES (TDD 아닌 tests-after)
- **Framework**: Vitest + React Testing Library

### Test Workflow
1. Task 15에서 Vitest 인프라 설치 및 설정
2. Task 18에서 `format.ts` 유닛 테스트 작성
3. Task 19에서 server action 테스트 작성 (선택적)

### Manual Verification (항상 포함)
- 각 태스크별 구체적인 검증 명령어 포함
- API 변경: curl로 응답 확인
- UI 변경: 브라우저에서 직접 확인
- 빌드: `bun run build` 성공 여부

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately - 독립적인 작업들):
├── Task 1: .env.example 생성
├── Task 6: error.tsx 생성
├── Task 7: global-error.tsx 생성
├── Task 8: health check 엔드포인트
├── Task 13: Prisma 마이그레이션
└── Task 15: Vitest 설치 및 설정

Wave 2 (After Wave 1 - 보안 수정):
├── Task 2: SSRF 수정 (depends: 1 - 환경변수 참조)
├── Task 3: CORS 수정 (depends: 1)
├── Task 4: 보안 헤더 추가 (depends: 3)
└── Task 14: Prisma seed (depends: 13)

Wave 3 (After Wave 2 - 통합 작업):
├── Task 5: Rate limiting (depends: 4)
├── Task 9: Sentry 설치 (depends: 1)
├── Task 10: Logger 유틸리티 (depends: 9)
├── Task 11: CI/CD workflow (depends: 1, 15)
└── Task 18: format.ts 테스트 (depends: 15)

Wave 4 (Final - 검증 및 마무리):
├── Task 19: Server action 테스트 (depends: 18)
├── Task 20: Cache 헤더 설정 (depends: 4)
└── Task 21: Web Vitals (depends: 9)

Critical Path: Task 1 → Task 3 → Task 4 → Task 11 → Final verification
Parallel Speedup: ~60% faster than sequential
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2,3,9,11 | 6,7,8,13,15 |
| 2 | 1 | None | 3,4,14 |
| 3 | 1 | 4,5 | 2,14 |
| 4 | 3 | 5,20 | 2,14 |
| 5 | 4 | None | 9,10,11,18 |
| 6 | None | None | 1,7,8,13,15 |
| 7 | None | None | 1,6,8,13,15 |
| 8 | None | None | 1,6,7,13,15 |
| 9 | 1 | 10,21 | 5,11,18 |
| 10 | 9 | None | 5,11,18 |
| 11 | 1,15 | None | 5,9,10,18 |
| 13 | None | 14 | 1,6,7,8,15 |
| 14 | 13 | None | 2,3,4 |
| 15 | None | 11,18,19 | 1,6,7,8,13 |
| 18 | 15 | 19 | 5,9,10,11 |
| 19 | 18 | None | 20,21 |
| 20 | 4 | None | 19,21 |
| 21 | 9 | None | 19,20 |

---

## TODOs

### Phase 1: Security (CRITICAL)

---

- [ ] 1. `.env.example` 템플릿 생성

  **What to do**:
  - 프로젝트 루트에 `.env.example` 파일 생성
  - 모든 필수 환경변수를 placeholder와 설명과 함께 문서화
  - 새로 추가할 변수들 포함: `NEXT_PUBLIC_APP_URL`, `SENTRY_DSN`

  **Must NOT do**:
  - 실제 시크릿 값을 포함하지 않음
  - `.env`나 `.env.local` 파일 수정하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 파일 생성, 간단한 템플릿 작업
  - **Skills**: 없음
    - 특별한 도메인 지식 불필요
  - **Skills Evaluated but Omitted**:
    - `git-master`: 파일 생성만 필요, 커밋은 마지막에 일괄 처리

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 6,7,8,13,15)
  - **Blocks**: Tasks 2,3,9,11
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - 현재 환경변수 목록: `DATABASE_URL`, `DIRECT_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_URL`, `TEAM_CREATE_SECRET`

  **Documentation References**:
  - Next.js 환경변수 문서: `NEXT_PUBLIC_` prefix는 클라이언트에 노출됨

  **WHY Each Reference Matters**:
  - 현재 환경변수 목록을 기반으로 `.env.example` 작성해야 누락 방지

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 파일 존재 확인: `ls -la .env.example`
  - [ ] 내용 검증: `cat .env.example` → 모든 필수 변수 포함 확인
  - [ ] 실제 값 없음 확인: `grep -E "^[A-Z].*=.+" .env.example` → placeholder만 존재

  **Commit**: YES
  - Message: `chore: add .env.example template for deployment`
  - Files: `.env.example`
  - Pre-commit: None

---

- [ ] 2. SSRF 취약점 수정 (`/api/links/metadata`)

  **What to do**:
  - 인증 체크 추가 (NextAuth 세션 확인)
  - URL 화이트리스트/블랙리스트 검증 추가
  - 내부 IP 주소 차단 (127.0.0.1, 10.x.x.x, 192.168.x.x, 169.254.x.x)
  - localhost 차단
  - 스키마 검증 (http/https만 허용)

  **Must NOT do**:
  - 응답 형식 변경하지 않음 (`{ title, favicon }` 유지)
  - 기존 기능 제거하지 않음

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: 보안 관련 작업, 꼼꼼한 검증 필요
  - **Skills**: 없음
    - Next.js API route 표준 패턴 사용
  - **Skills Evaluated but Omitted**:
    - `playwright`: API 수정이므로 브라우저 테스트 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3,4,14)
  - **Blocks**: None
  - **Blocked By**: Task 1 (환경변수 참조)

  **References**:

  **Pattern References**:
  - `/src/app/api/links/metadata/route.ts:1-66` - 현재 취약한 구현 (수정 대상)
  - `/src/lib/auth.ts` - NextAuth 설정 (인증 체크용)
  - `/src/middleware.ts:1-10` - auth import 패턴

  **API/Type References**:
  - 현재 응답 형식: `{ title: string, favicon: string | null }`

  **External References**:
  - OWASP SSRF Prevention: URL 검증 패턴 참고

  **WHY Each Reference Matters**:
  - 현재 route.ts를 보고 어디에 인증/검증을 추가할지 파악
  - auth.ts에서 세션 가져오는 방법 확인
  - 응답 형식은 기존 계약 유지해야 함

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 비인증 요청 차단 확인:
    ```bash
    curl -X GET "http://localhost:3000/api/links/metadata?url=https://google.com"
    ```
    Expected: 401 Unauthorized

  - [ ] 내부 IP 차단 확인:
    ```bash
    # 인증 후 (세션 쿠키 필요)
    curl -X GET "http://localhost:3000/api/links/metadata?url=http://127.0.0.1/admin" --cookie "session=..."
    ```
    Expected: 400 Bad Request (blocked URL)

  - [ ] 정상 요청 성공 확인:
    ```bash
    curl -X GET "http://localhost:3000/api/links/metadata?url=https://github.com" --cookie "session=..."
    ```
    Expected: 200 OK with `{ title, favicon }`

  **Commit**: YES
  - Message: `fix(security): add auth and URL validation to metadata endpoint`
  - Files: `src/app/api/links/metadata/route.ts`
  - Pre-commit: `bun run build`

---

- [ ] 3. CORS 설정 수정

  **What to do**:
  - `next.config.ts`에서 wildcard (`*`) CORS를 환경변수 기반으로 변경
  - `NEXT_PUBLIC_APP_URL` 환경변수 사용
  - 개발/프로덕션 환경 자동 구분 (`NODE_ENV` 활용)
  - 크롬 익스텐션 origin 고려 (`chrome-extension://`)

  **Must NOT do**:
  - 기존 `/api/extension/*` 라우트 기능 제거하지 않음
  - 개발 환경에서 localhost 접근 차단하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 설정 파일 수정, 명확한 패턴
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 백엔드 설정 변경

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2,4,14)
  - **Blocks**: Tasks 4,5
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `/next.config.ts:1-20` - 현재 CORS 설정 (수정 대상)

  **Documentation References**:
  - Next.js headers 문서: https://nextjs.org/docs/app/api-reference/next-config-js/headers

  **WHY Each Reference Matters**:
  - 현재 headers() 함수 구조를 유지하면서 origin 값만 동적으로 변경

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 빌드 성공: `bun run build` → 에러 없음
  - [ ] CORS 헤더 확인 (개발):
    ```bash
    curl -I -X OPTIONS http://localhost:3000/api/extension/test \
      -H "Origin: http://localhost:3000"
    ```
    Expected: `Access-Control-Allow-Origin: http://localhost:3000`

  **Commit**: YES
  - Message: `fix(security): replace CORS wildcard with environment-based origins`
  - Files: `next.config.ts`
  - Pre-commit: `bun run build`

---

- [ ] 4. 보안 헤더 추가

  **What to do**:
  - `next.config.ts`에 전역 보안 헤더 추가
  - 필수 헤더들:
    - `X-Content-Type-Options: nosniff`
    - `X-Frame-Options: DENY`
    - `X-XSS-Protection: 1; mode=block`
    - `Referrer-Policy: strict-origin-when-cross-origin`
    - `Permissions-Policy: camera=(), microphone=(), geolocation=()`
    - `Content-Security-Policy` (기본 정책)
  - 모든 라우트에 적용 (`source: "/:path*"`)

  **Must NOT do**:
  - 기존 CORS 설정 덮어쓰지 않음 (별도 source로 유지)
  - CSP가 인라인 스크립트를 완전 차단하지 않음 (Next.js 호환성)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: 보안 헤더는 잘못 설정 시 앱 동작 불가
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 헤더 설정은 서버 구성

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2,3,14)
  - **Blocks**: Tasks 5,20
  - **Blocked By**: Task 3

  **References**:

  **Pattern References**:
  - `/next.config.ts:1-20` - 현재 headers 설정 (확장 대상)

  **External References**:
  - OWASP Secure Headers: https://owasp.org/www-project-secure-headers/
  - Next.js Security Headers 예시: https://nextjs.org/docs/advanced-features/security-headers

  **WHY Each Reference Matters**:
  - 기존 headers 배열에 추가해야 CORS 설정과 공존

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 빌드 성공: `bun run build`
  - [ ] 보안 헤더 확인:
    ```bash
    curl -I http://localhost:3000/
    ```
    Expected: 
    - `X-Frame-Options: DENY`
    - `X-Content-Type-Options: nosniff`
    - `Content-Security-Policy: ...`

  **Commit**: YES
  - Message: `feat(security): add security headers (CSP, X-Frame-Options, etc.)`
  - Files: `next.config.ts`
  - Pre-commit: `bun run build`

---

- [ ] 5. Rate Limiting 미들웨어 추가

  **What to do**:
  - 간단한 in-memory rate limiter 구현 (Map 기반)
  - IP 기반 제한:
    - 일반 API: 100 requests / 15분
    - 인증 API (`/api/auth/*`): 10 requests / 15분
    - 메타데이터 API (`/api/links/metadata`): 20 requests / 15분
  - `src/lib/rate-limit.ts` 유틸리티 생성
  - 미들웨어에 통합

  **Must NOT do**:
  - Redis 의존성 추가하지 않음 (in-memory만)
  - 기존 인증 플로우 방해하지 않음

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: 미들웨어 로직 복잡, 기존 auth 로직과 통합 필요
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `git-master`: 구현 작업이 주

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential after Wave 2
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `/src/middleware.ts:1-67` - 현재 미들웨어 구조 (통합 대상)

  **External References**:
  - Next.js Middleware 문서: https://nextjs.org/docs/app/building-your-application/routing/middleware
  - Rate limiting 패턴: sliding window counter

  **WHY Each Reference Matters**:
  - 기존 auth 미들웨어 구조를 유지하면서 rate limiting 추가해야 함

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 빌드 성공: `bun run build`
  - [ ] Rate limit 동작 확인 (11번째 인증 요청):
    ```bash
    for i in {1..11}; do
      curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/auth/session
    done
    ```
    Expected: 처음 10개는 200/401, 11번째는 429 Too Many Requests

  **Commit**: YES
  - Message: `feat(security): add rate limiting middleware`
  - Files: `src/lib/rate-limit.ts`, `src/middleware.ts`
  - Pre-commit: `bun run build`

---

### Phase 2: Error Handling & Monitoring

---

- [ ] 6. Global Error Boundary 생성 (`error.tsx`)

  **What to do**:
  - `/src/app/error.tsx` 생성 (App Router error boundary)
  - 사용자 친화적인 한국어 에러 메시지
  - "다시 시도" 버튼 (`reset()` 함수 사용)
  - 에러 정보 콘솔 로깅 (개발 환경)
  - shadcn/ui 컴포넌트 스타일 사용

  **Must NOT do**:
  - 민감한 에러 정보를 사용자에게 노출하지 않음
  - 영어 메시지 사용하지 않음

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: UI 컴포넌트 생성, 사용자 경험 중요
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: 에러 페이지 UX 디자인
  - **Skills Evaluated but Omitted**:
    - `playwright`: 에러 상태 테스트는 수동 확인으로 충분

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1,7,8,13,15)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/src/app/layout.tsx` - 루트 레이아웃 구조 참고
  - `/src/components/ui/button.tsx` - shadcn Button 사용 (있다면)

  **Documentation References**:
  - Next.js Error Handling: https://nextjs.org/docs/app/building-your-application/routing/error-handling

  **WHY Each Reference Matters**:
  - App Router의 error.tsx는 특정 규칙을 따라야 함 ('use client' 필수)
  - 기존 UI 스타일과 일관성 유지

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 파일 존재: `ls src/app/error.tsx` → 존재
  - [ ] 'use client' 지시문 확인: `head -1 src/app/error.tsx` → `'use client'`
  - [ ] 빌드 성공: `bun run build`
  - [ ] 에러 페이지 확인: 개발 서버에서 의도적 에러 발생 시 한국어 에러 페이지 표시

  **Commit**: YES (Task 7과 함께)
  - Message: `feat(error): add error boundaries for better UX`
  - Files: `src/app/error.tsx`, `src/app/global-error.tsx`
  - Pre-commit: `bun run build`

---

- [ ] 7. Root Error Boundary 생성 (`global-error.tsx`)

  **What to do**:
  - `/src/app/global-error.tsx` 생성 (루트 레이아웃 에러용)
  - 완전히 독립적인 HTML 구조 (layout 밖에서 렌더링)
  - 한국어 에러 메시지
  - 새로고침 버튼

  **Must NOT do**:
  - 외부 컴포넌트 import 최소화 (레이아웃 깨질 수 있음)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: 독립 UI 페이지 생성
  - **Skills**: [`frontend-ui-ux`]
  - **Skills Evaluated but Omitted**:
    - 다른 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1,6,8,13,15)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - Task 6의 `error.tsx` 스타일 참고

  **Documentation References**:
  - Next.js global-error: https://nextjs.org/docs/app/building-your-application/routing/error-handling#handling-errors-in-root-layouts

  **WHY Each Reference Matters**:
  - global-error.tsx는 자체 html, body 태그를 포함해야 함

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 파일 존재: `ls src/app/global-error.tsx` → 존재
  - [ ] html 태그 포함: `grep "<html" src/app/global-error.tsx` → 존재
  - [ ] 빌드 성공: `bun run build`

  **Commit**: YES (Task 6과 함께)
  - Message: `feat(error): add error boundaries for better UX`
  - Files: `src/app/error.tsx`, `src/app/global-error.tsx`
  - Pre-commit: `bun run build`

---

- [ ] 8. Health Check 엔드포인트 생성

  **What to do**:
  - `/src/app/api/health/route.ts` 생성
  - 기본 상태 체크: `{ status: "ok", timestamp: ISO string }`
  - 데이터베이스 연결 체크 (Prisma `$queryRaw`)
  - 환경 정보 포함 (NODE_ENV)

  **Must NOT do**:
  - 민감한 정보 노출하지 않음 (DB URL 등)
  - 인증 요구하지 않음 (모니터링 도구 접근 위해)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단순 API 엔드포인트, 명확한 요구사항
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `ultrabrain`: 간단한 상태 체크만

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1,6,7,13,15)
  - **Blocks**: None
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/src/lib/prisma.ts` - Prisma 클라이언트 import 방법
  - `/src/app/api/links/metadata/route.ts:1-10` - API route 구조 참고

  **WHY Each Reference Matters**:
  - 기존 API 구조와 일관성 유지
  - Prisma 연결 체크 방법

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 엔드포인트 응답 확인:
    ```bash
    curl http://localhost:3000/api/health
    ```
    Expected: `{"status":"ok","timestamp":"...","database":"connected","environment":"development"}`

  - [ ] DB 연결 실패 시 (DB 끄고):
    Expected: `{"status":"error","database":"disconnected"}`

  **Commit**: YES
  - Message: `feat(monitoring): add health check endpoint`
  - Files: `src/app/api/health/route.ts`
  - Pre-commit: `bun run build`

---

- [ ] 9. Sentry 설치 및 설정

  **What to do**:
  - `@sentry/nextjs` 패키지 설치
  - `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts` 생성
  - `next.config.ts`에 Sentry 래핑 추가
  - `instrumentation.ts` 생성 (Next.js 14+ 패턴)
  - DSN은 환경변수로 설정 (`SENTRY_DSN`)
  - 개발 환경에서는 비활성화

  **Must NOT do**:
  - 실제 DSN 값을 코드에 하드코딩하지 않음
  - 기존 빌드 프로세스 방해하지 않음

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Sentry 설정은 복잡하고 Next.js 버전별 차이 있음
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 백엔드 설정 작업

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5,10,11,18)
  - **Blocks**: Tasks 10,21
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `/next.config.ts` - 현재 설정 (Sentry wrapper 추가 대상)

  **External References**:
  - Sentry Next.js 가이드: https://docs.sentry.io/platforms/javascript/guides/nextjs/

  **WHY Each Reference Matters**:
  - Next.js 16과 Sentry 호환성 확인 필요
  - 기존 next.config 구조 유지하면서 withSentry 래핑

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 패키지 설치 확인: `grep "@sentry/nextjs" package.json` → 존재
  - [ ] 설정 파일 존재:
    ```bash
    ls sentry.client.config.ts sentry.server.config.ts
    ```
  - [ ] 빌드 성공: `bun run build`
  - [ ] DSN 없이도 앱 동작: `SENTRY_DSN=""` 상태에서 에러 없이 실행

  **Commit**: YES
  - Message: `feat(monitoring): add Sentry error tracking (DSN via env)`
  - Files: `sentry.*.config.ts`, `instrumentation.ts`, `next.config.ts`, `package.json`
  - Pre-commit: `bun run build`

---

- [ ] 10. Structured Logger 유틸리티 생성

  **What to do**:
  - `/src/lib/logger.ts` 생성
  - 로그 레벨: `debug`, `info`, `warn`, `error`
  - JSON 형식 출력 (프로덕션)
  - 타임스탬프 포함
  - Sentry 연동 (error 레벨)
  - 콘솔 출력 (개발)

  **Must NOT do**:
  - 외부 로깅 서비스 의존성 추가하지 않음
  - 기존 console.error 호출 모두 바꾸지 않음 (선택적 마이그레이션)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 유틸리티 함수, 명확한 인터페이스
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - 복잡한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5,9,11,18)
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:

  **Pattern References**:
  - `/src/lib/utils.ts` - 기존 유틸리티 파일 구조

  **External References**:
  - Sentry captureException API

  **WHY Each Reference Matters**:
  - 기존 lib 폴더 구조와 일관성
  - Sentry 연동 방법

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 파일 존재: `ls src/lib/logger.ts`
  - [ ] TypeScript 컴파일: `bunx tsc --noEmit src/lib/logger.ts`
  - [ ] 타입 export 확인: `grep "export" src/lib/logger.ts` → logger 함수들 export

  **Commit**: YES
  - Message: `feat(logging): add structured logger utility`
  - Files: `src/lib/logger.ts`
  - Pre-commit: `bun run build`

---

### Phase 3: CI/CD

---

- [ ] 11. GitHub Actions CI Workflow 생성

  **What to do**:
  - `/.github/workflows/ci.yml` 생성
  - 트리거: PR, push to main
  - Jobs:
    1. Lint (`bun run lint`)
    2. Type check (`bunx tsc --noEmit`)
    3. Test (`bun run test`)
    4. Build (`bun run build`)
  - Bun 사용 (프로젝트 일관성)
  - Node.js 20 + Bun 최신 버전
  - 캐싱: node_modules, .next/cache

  **Must NOT do**:
  - 자동 배포 추가하지 않음 (Vercel이 처리)
  - 실제 시크릿을 workflow 파일에 포함하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: YAML 설정 파일, 표준 패턴
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `git-master`: workflow 파일 생성만 필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5,9,10,18)
  - **Blocks**: None
  - **Blocked By**: Tasks 1,15

  **References**:

  **Pattern References**:
  - `/package.json:5-11` - 현재 scripts 확인

  **External References**:
  - GitHub Actions Bun: https://github.com/oven-sh/setup-bun
  - Next.js CI 예시: https://nextjs.org/docs/app/building-your-application/deploying/ci-build-caching

  **WHY Each Reference Matters**:
  - package.json scripts를 CI에서 그대로 사용
  - Bun 캐싱 최적화

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 파일 존재: `ls .github/workflows/ci.yml`
  - [ ] YAML 문법 검증: `bunx yaml-lint .github/workflows/ci.yml` 또는 온라인 검증기
  - [ ] 로컬 테스트 (act 사용 시): `act -j lint`

  **Commit**: YES
  - Message: `ci: add GitHub Actions workflow for lint, test, build`
  - Files: `.github/workflows/ci.yml`
  - Pre-commit: None

---

### Phase 4: Database

---

- [ ] 13. Prisma 초기 마이그레이션 생성

  **What to do**:
  - 현재 스키마에서 초기 마이그레이션 생성
  - `bunx prisma migrate dev --name init`
  - 마이그레이션 파일이 `prisma/migrations/` 에 생성됨 확인

  **Must NOT do**:
  - 프로덕션 DB에 직접 실행하지 않음
  - 기존 데이터 삭제하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 단일 명령어 실행
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - 복잡한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1,6,7,8,15)
  - **Blocks**: Task 14
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/prisma/schema.prisma:1-359` - 현재 스키마 (18개 모델)

  **Documentation References**:
  - Prisma Migrate: https://www.prisma.io/docs/concepts/components/prisma-migrate

  **WHY Each Reference Matters**:
  - 스키마가 이미 완성됨, 마이그레이션만 생성하면 됨

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 마이그레이션 폴더 존재: `ls prisma/migrations/` → 폴더 존재
  - [ ] SQL 파일 존재: `ls prisma/migrations/*/migration.sql` → 파일 존재
  - [ ] 스키마 동기화: `bunx prisma migrate status` → "Database schema is up to date"

  **Commit**: YES
  - Message: `chore(db): add initial Prisma migration`
  - Files: `prisma/migrations/**`
  - Pre-commit: None

---

- [ ] 14. Prisma Seed 스크립트 생성

  **What to do**:
  - `/prisma/seed.ts` 생성
  - TemplateCategory 기본 데이터:
    - `sales` (매출관리, TrendingUp 아이콘)
    - `hr` (인사관리, Users 아이콘)
    - `finance` (재무관리, Wallet 아이콘)
    - `marketing` (마케팅, Megaphone 아이콘)
  - `package.json`에 prisma.seed 설정 추가
  - upsert 사용 (중복 실행 안전)

  **Must NOT do**:
  - 실제 사용자/팀 데이터 생성하지 않음
  - 기존 데이터 삭제하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 시드 스크립트, 명확한 데이터
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - 복잡한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2,3,4)
  - **Blocks**: None
  - **Blocked By**: Task 13

  **References**:

  **Pattern References**:
  - `/prisma/schema.prisma:300-315` - TemplateCategory 모델 구조
  - `/src/lib/prisma.ts` - Prisma 클라이언트 설정

  **Documentation References**:
  - Prisma Seeding: https://www.prisma.io/docs/guides/migrate/seed-database

  **WHY Each Reference Matters**:
  - TemplateCategory 필드 구조 확인 필요 (key, name, description, icon, order)

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 파일 존재: `ls prisma/seed.ts`
  - [ ] seed 설정 확인: `grep "prisma" package.json` → seed 설정 존재
  - [ ] seed 실행: `bunx prisma db seed` → 성공
  - [ ] 데이터 확인: `bunx prisma studio` → TemplateCategory 테이블에 4개 레코드

  **Commit**: YES
  - Message: `chore(db): add seed script for template categories`
  - Files: `prisma/seed.ts`, `package.json`
  - Pre-commit: `bunx prisma db seed`

---

### Phase 5: Testing

---

- [ ] 15. Vitest 설치 및 설정

  **What to do**:
  - 패키지 설치:
    - `vitest`
    - `@testing-library/react`
    - `@testing-library/jest-dom`
    - `@vitejs/plugin-react`
    - `jsdom`
  - `vitest.config.ts` 생성
  - `package.json`에 test 스크립트 추가
  - `vitest.setup.ts` 생성 (jest-dom 확장)

  **Must NOT do**:
  - 기존 빌드 설정 변경하지 않음
  - devDependencies만 추가

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 설정 파일 생성, 표준 패턴
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 테스트 인프라 설정

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1,6,7,8,13)
  - **Blocks**: Tasks 11,18,19
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `/package.json:50-61` - 현재 devDependencies

  **External References**:
  - Vitest with Next.js: https://nextjs.org/docs/app/building-your-application/testing/vitest

  **WHY Each Reference Matters**:
  - Next.js 16 + React 19 호환 설정 필요

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 패키지 설치 확인: `grep "vitest" package.json`
  - [ ] 설정 파일 존재: `ls vitest.config.ts`
  - [ ] test 스크립트 존재: `grep '"test"' package.json`
  - [ ] vitest 실행: `bun run test` → "No test files found" (아직 테스트 없음)

  **Commit**: YES
  - Message: `test: setup Vitest with React Testing Library`
  - Files: `vitest.config.ts`, `vitest.setup.ts`, `package.json`
  - Pre-commit: `bun run build`

---

- [ ] 18. `format.ts` 유닛 테스트 작성

  **What to do**:
  - `/src/lib/__tests__/format.test.ts` 생성
  - 모든 함수 테스트:
    - `formatKRW`: 양수, 음수, 0
    - `formatKRWParts`: 분리된 심볼과 숫자 확인
    - `formatNumber`: 천 단위 구분 확인
    - `formatPercent`: 양수(+), 음수(-), 0
    - `formatDate`: 다양한 날짜 형식
    - `formatShortDate`: 짧은 형식 확인

  **Must NOT do**:
  - 불필요하게 복잡한 테스트 케이스 추가하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 순수 함수 테스트, 직관적
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 유틸리티 함수 테스트

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5,9,10,11)
  - **Blocks**: Task 19
  - **Blocked By**: Task 15

  **References**:

  **Pattern References**:
  - `/src/lib/format.ts:1-46` - 테스트 대상 함수들

  **External References**:
  - Vitest expect API: https://vitest.dev/api/expect.html

  **WHY Each Reference Matters**:
  - 각 함수의 입력/출력 형식 확인 필요

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 테스트 파일 존재: `ls src/lib/__tests__/format.test.ts`
  - [ ] 테스트 통과:
    ```bash
    bun run test src/lib/__tests__/format.test.ts
    ```
    Expected: 모든 테스트 PASS

  **Commit**: YES
  - Message: `test: add unit tests for format utilities`
  - Files: `src/lib/__tests__/format.test.ts`
  - Pre-commit: `bun run test`

---

- [ ] 19. Server Action 테스트 작성 (선택적)

  **What to do**:
  - 1개 이상의 server action 테스트 작성
  - Prisma mock 설정 (`vitest-mock-extended`)
  - 예: 카테고리 생성 action 테스트

  **Must NOT do**:
  - 실제 DB 연결하지 않음 (mock 사용)
  - 모든 action 테스트하지 않음 (1-2개만)

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Mock 설정, 복잡한 테스트 구조
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - 다른 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 20,21)
  - **Blocks**: None
  - **Blocked By**: Task 18

  **References**:

  **Pattern References**:
  - `/src/lib/prisma.ts` - mock 대상
  - Server action 파일 (탐색 필요)

  **External References**:
  - vitest-mock-extended: https://github.com/eratio08/vitest-mock-extended

  **WHY Each Reference Matters**:
  - Prisma mock 패턴 필요
  - Server action 구조 파악 필요

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 테스트 통과: `bun run test` → 새 테스트 PASS

  **Commit**: YES
  - Message: `test: add server action tests with Prisma mock`
  - Files: `src/**/__tests__/*.test.ts`
  - Pre-commit: `bun run test`

---

### Phase 6: Performance

---

- [ ] 20. Cache 헤더 설정

  **What to do**:
  - `next.config.ts`에 정적 자산 캐시 헤더 추가
  - 이미지, 폰트, JS/CSS: `Cache-Control: public, max-age=31536000, immutable`
  - API 응답: 기본 no-cache (동적 데이터)

  **Must NOT do**:
  - 동적 API 응답에 긴 캐시 설정하지 않음
  - 인증 관련 응답 캐시하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 설정 추가, 명확한 패턴
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - 복잡한 스킬 불필요

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 19,21)
  - **Blocks**: None
  - **Blocked By**: Task 4

  **References**:

  **Pattern References**:
  - `/next.config.ts` - 현재 headers 설정

  **Documentation References**:
  - Next.js Cache Headers: https://nextjs.org/docs/app/api-reference/next-config-js/headers

  **WHY Each Reference Matters**:
  - 기존 headers 배열에 추가

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 빌드 성공: `bun run build`
  - [ ] 정적 자산 헤더 확인:
    ```bash
    curl -I http://localhost:3000/_next/static/chunks/main.js
    ```
    Expected: `Cache-Control: public, max-age=31536000, immutable`

  **Commit**: YES
  - Message: `perf: add cache headers for static assets`
  - Files: `next.config.ts`
  - Pre-commit: `bun run build`

---

- [ ] 21. Web Vitals 리포팅 설정

  **What to do**:
  - `/src/app/layout.tsx`에 Web Vitals 리포팅 추가
  - `useReportWebVitals` hook 또는 `reportWebVitals` 함수
  - Sentry에 전송 (또는 콘솔 로그)

  **Must NOT do**:
  - 별도 분석 서비스 추가하지 않음 (Sentry만)
  - 프로덕션에서 과도한 로깅하지 않음

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: 표준 Next.js 패턴
  - **Skills**: 없음
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: 성능 측정 코드 추가

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 4 (with Tasks 19,20)
  - **Blocks**: None
  - **Blocked By**: Task 9

  **References**:

  **Pattern References**:
  - `/src/app/layout.tsx` - 루트 레이아웃

  **Documentation References**:
  - Next.js Web Vitals: https://nextjs.org/docs/app/building-your-application/optimizing/analytics

  **WHY Each Reference Matters**:
  - Web Vitals는 layout.tsx나 별도 client component에서 설정

  **Acceptance Criteria**:

  **Manual Execution Verification:**
  - [ ] 빌드 성공: `bun run build`
  - [ ] Web Vitals 로깅 확인: 브라우저 콘솔에서 LCP, FID, CLS 등 메트릭 확인

  **Commit**: YES
  - Message: `perf: add Web Vitals reporting`
  - Files: `src/app/layout.tsx` 또는 `src/components/web-vitals.tsx`
  - Pre-commit: `bun run build`

---

## Commit Strategy

| After Task(s) | Message | Key Files |
|---------------|---------|-----------|
| 1 | `chore: add .env.example template` | `.env.example` |
| 2 | `fix(security): add auth and URL validation to metadata endpoint` | `src/app/api/links/metadata/route.ts` |
| 3,4 | `fix(security): add CORS and security headers` | `next.config.ts` |
| 5 | `feat(security): add rate limiting middleware` | `src/lib/rate-limit.ts`, `src/middleware.ts` |
| 6,7 | `feat(error): add error boundaries` | `src/app/error.tsx`, `src/app/global-error.tsx` |
| 8 | `feat(monitoring): add health check endpoint` | `src/app/api/health/route.ts` |
| 9,10 | `feat(monitoring): add Sentry and logger` | `sentry.*.config.ts`, `src/lib/logger.ts` |
| 11 | `ci: add GitHub Actions workflow` | `.github/workflows/ci.yml` |
| 13,14 | `chore(db): add migration and seed` | `prisma/migrations/**`, `prisma/seed.ts` |
| 15 | `test: setup Vitest` | `vitest.config.ts`, `package.json` |
| 18,19 | `test: add unit tests` | `src/lib/__tests__/*.test.ts` |
| 20,21 | `perf: add cache headers and Web Vitals` | `next.config.ts`, `src/app/layout.tsx` |

---

## Success Criteria

### Final Verification Commands
```bash
# 1. Lint
bun run lint
# Expected: 0 errors

# 2. Type check
bunx tsc --noEmit
# Expected: 0 errors

# 3. Tests
bun run test
# Expected: All tests pass

# 4. Build
bun run build
# Expected: Build successful

# 5. Health check
curl http://localhost:3000/api/health
# Expected: {"status":"ok",...}

# 6. Security headers
curl -I http://localhost:3000/
# Expected: X-Frame-Options, CSP headers present
```

### Final Checklist
- [ ] 모든 "Must Have" 항목 완료
- [ ] 모든 "Must NOT Have" 항목 준수
- [ ] `bun run build` 성공
- [ ] `bun run test` 모든 테스트 통과
- [ ] `bun run lint` 에러 없음
- [ ] Health check 200 OK
- [ ] `.env.example`에 모든 필수 변수 문서화됨
- [ ] GitHub에 .env 파일 커밋되지 않음 확인
