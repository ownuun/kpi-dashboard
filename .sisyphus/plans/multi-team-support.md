# Multi-Team Support + Kakao Link

## TL;DR

> **Quick Summary**: Enable users to belong to multiple teams with a team switcher in the sidebar, and add a Kakao Open Chat button to the onboarding form for secret key requests.
> 
> **Deliverables**:
> - UserTeam junction table for many-to-many User-Team relationship
> - Data migration script preserving existing team memberships
> - Team switcher component in sidebar header
> - `switchTeam` server action with session update
> - Kakao Open Chat button on onboarding form
> - Updated auth/session handling for activeTeamId
> - Updated middleware for multi-team routing
> 
> **Estimated Effort**: Medium (3-4 days)
> **Parallel Execution**: YES - 3 waves
> **Critical Path**: Schema → Migration → Auth → Actions → UI

---

## Context

### Original Request
1. Add Kakao Open Chat link button to team creation form for users to get secret codes
2. Enable multi-team support: allow one user to belong to 2+ teams with team switching

### Interview Summary
**Key Discussions**:
- Role per Team: UserTeam junction table with `role` field per membership
- Active Team Storage: JWT session for fast switching via `session.update()`
- Team Switcher Location: Sidebar header, above navigation
- Kakao Link Style: Styled button with Kakao icon opening in new tab
- Migration Strategy: Keep deprecated `teamId` column for safety, remove in future

**Research Findings**:
- 14 files use `session.user.teamId` for data filtering
- Current User has single `teamId` FK (one-to-many)
- Middleware redirects to `/onboarding` if no `teamId`
- `createTeam`/`joinTeam` currently block if user already has a team
- Available UI: DropdownMenu, Dialog, Button, Avatar, Badge (shadcn/ui)

### Metis Review
**Identified Gaps** (addressed in plan):
- JWT refresh race condition: Added loading state during team switch
- Cross-team data leakage: Added audit task for all 14 files
- Migration rollback: Keep deprecated column, validate migration
- Mobile team switcher: Added to mobile nav component
- Onboarding flow after multi-team: Updated middleware logic
- Edge cases: User removed from team, team deleted, etc.

---

## Work Objectives

### Core Objective
Enable multi-team membership with seamless team switching and improve onboarding UX with Kakao support link.

### Concrete Deliverables
1. `prisma/schema.prisma` - UserTeam model with role per team
2. `prisma/migrations/xxx_add_user_team.sql` - Migration file
3. `src/lib/auth.ts` - Updated JWT callbacks for activeTeamId
4. `src/actions/teams.ts` - Updated actions + new `switchTeam`, `getUserTeams`
5. `src/components/layout/team-switcher.tsx` - New component
6. `src/components/layout/sidebar.tsx` - Integrated team switcher
7. `src/components/layout/mobile-nav.tsx` - Mobile team switcher
8. `src/app/(auth)/onboarding/onboarding-form.tsx` - Kakao button
9. `src/middleware.ts` - Multi-team aware routing

### Definition of Done
- [ ] User can create multiple teams (no single-team restriction)
- [ ] User can join multiple teams via invite codes
- [ ] User can switch between teams via sidebar dropdown
- [ ] Active team data is isolated (no cross-team leakage)
- [ ] Session updates immediately after team switch
- [ ] Existing single-team users continue to work
- [ ] Kakao button opens open chat in new tab
- [ ] All tests pass, no TypeScript errors

### Must Have
- UserTeam junction table with `role` field
- Backward compatible migration preserving existing data
- Team switcher accessible on both desktop and mobile
- Kakao button visible during team creation flow
- Loading state during team switch

### Must NOT Have (Guardrails)
- DO NOT remove `User.teamId` column (keep deprecated for now)
- DO NOT allow cross-team data access
- DO NOT create separate "manage teams" page (use sidebar switcher only)
- DO NOT add team creation/leave modals in this phase
- DO NOT implement email-based team invitations
- DO NOT add per-team settings/customization
- DO NOT add audit logs for team switches
- DO NOT change the invite code system

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (project likely has test setup - verify)
- **User wants tests**: Manual verification (no explicit TDD request)
- **Framework**: Verify with `bun test` or `npm test`

### Automated Verification (Agent-Executable)

Each TODO includes executable verification that agents can run directly.

**By Deliverable Type:**

| Type | Verification Tool | Procedure |
|------|------------------|-----------|
| Schema/Migration | Bash + Prisma CLI | `bunx prisma migrate dev --name test && bunx prisma db push` |
| Server Actions | Bash + curl/node | Execute action, verify response |
| UI Components | Playwright browser | Navigate, interact, screenshot |
| Session/Auth | Bash + curl | Login flow, verify JWT contents |

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
├── Task 1: Add UserTeam schema + migration
├── Task 6: Add Kakao button to onboarding (independent)
└── Task 7: Create team switcher component skeleton (no data yet)

Wave 2 (After Wave 1):
├── Task 2: Update auth.ts for activeTeamId (needs schema)
├── Task 3: Update teams.ts actions (needs schema)
└── Task 4: Run data migration script (needs schema)

Wave 3 (After Wave 2):
├── Task 5: Update middleware (needs auth + actions)
├── Task 8: Integrate team switcher with data (needs actions)
└── Task 9: Add mobile team switcher (needs component)

Wave 4 (Final):
└── Task 10: End-to-end verification + edge case testing
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4 | 6, 7 |
| 2 | 1 | 5, 8 | 3, 4 |
| 3 | 1 | 5, 8 | 2, 4 |
| 4 | 1 | 8 | 2, 3 |
| 5 | 2, 3 | 10 | 8, 9 |
| 6 | None | 10 | 1, 7 |
| 7 | None | 8, 9 | 1, 6 |
| 8 | 2, 3, 4, 7 | 10 | 5, 9 |
| 9 | 7 | 10 | 5, 8 |
| 10 | 5, 6, 8, 9 | None | None (final) |

### Agent Dispatch Summary

| Wave | Tasks | Agents |
|------|-------|--------|
| 1 | 1, 6, 7 | 3 parallel agents |
| 2 | 2, 3, 4 | 3 parallel agents |
| 3 | 5, 8, 9 | 3 parallel agents |
| 4 | 10 | 1 sequential agent |

---

## TODOs

### Task 1: Add UserTeam Junction Table Schema

- [ ] 1. Add UserTeam junction table to Prisma schema

  **What to do**:
  - Add `UserTeam` model with `userId`, `teamId`, `role`, `joinedAt`, `isActive`
  - Add unique constraint `@@unique([userId, teamId])`
  - Add indexes for performance: `@@index([userId])`, `@@index([teamId])`
  - Add relations to User and Team models
  - Keep `User.teamId` and `User.role` as deprecated (DO NOT REMOVE)
  - Generate and apply Prisma migration

  **Must NOT do**:
  - DO NOT remove existing `User.teamId` column
  - DO NOT remove existing `User.role` field
  - DO NOT modify existing Team model relations
  - DO NOT add cascade delete on UserTeam yet (migration handles this separately)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Schema modification is a focused, single-file task
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for schema change
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work in this task

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 6, 7)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `prisma/schema.prisma:63-100` - Current User model structure with teamId, role fields
  - `prisma/schema.prisma:102-127` - Current Team model with users relation
  - `prisma/schema.prisma:342-358` - TeamTemplate junction table pattern (similar structure)

  **Type References**:
  - `prisma/schema.prisma:58-61` - UserRole enum (ADMIN, MEMBER) to reuse

  **Documentation References**:
  - Prisma docs: https://www.prisma.io/docs/concepts/components/prisma-schema/relations/many-to-many

  **WHY Each Reference Matters**:
  - User model: See existing `teamId` and `role` fields to keep deprecated
  - Team model: Understand existing `users` relation to update
  - TeamTemplate: Copy junction table pattern with `@@unique` and timestamps
  - UserRole: Reuse enum for per-team role field

  **Acceptance Criteria**:

  ```bash
  # Agent runs:
  bunx prisma validate
  # Assert: Exit code 0, "The schema is valid"
  
  bunx prisma migrate dev --name add_user_team_junction --create-only
  # Assert: Migration file created in prisma/migrations/
  
  # Verify schema has UserTeam model:
  grep -A 20 "model UserTeam" prisma/schema.prisma
  # Assert: Contains userId, teamId, role, joinedAt, isActive fields
  # Assert: Contains @@unique([userId, teamId])
  ```

  **Evidence to Capture**:
  - [ ] `prisma validate` output showing valid schema
  - [ ] Migration file path and contents
  - [ ] grep output showing UserTeam model structure

  **Commit**: YES
  - Message: `feat(schema): add UserTeam junction table for multi-team support`
  - Files: `prisma/schema.prisma`, `prisma/migrations/*`
  - Pre-commit: `bunx prisma validate`

---

### Task 2: Update Auth Session for ActiveTeamId

- [ ] 2. Update auth.ts to handle activeTeamId in JWT

  **What to do**:
  - Update JWT callback to fetch user's teams from UserTeam table
  - Store `activeTeamId` in token (instead of just `teamId`)
  - Add logic: if no activeTeamId but user has teams, set first team as active
  - Add logic: if activeTeamId not in user's teams, fallback to first team
  - Update session callback to expose `activeTeamId` and `teams` array
  - Handle `trigger === 'update'` for team switching
  - Update TypeScript declarations for Session and JWT

  **Must NOT do**:
  - DO NOT remove backward compatibility with `teamId` (keep as alias)
  - DO NOT fetch full team objects in JWT (only IDs for performance)
  - DO NOT break existing session.user.teamId consumers

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Auth/session logic is security-critical and complex
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for auth changes
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: Tasks 5, 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/lib/auth.ts:32-74` - Current JWT callback with teamId handling
  - `src/lib/auth.ts:76-86` - Current session callback structure
  - `src/lib/auth.ts:92-107` - TypeScript Session/JWT declarations

  **API/Type References**:
  - `src/lib/auth.ts:36` - Prisma query pattern: `prisma.user.findUnique`
  - NextAuth JWT docs: https://next-auth.js.org/configuration/callbacks#jwt-callback

  **WHY Each Reference Matters**:
  - JWT callback: Understand current teamId flow to extend for activeTeamId
  - Session callback: See how to expose new fields to client
  - TypeScript declarations: Update types for activeTeamId + teams array

  **Acceptance Criteria**:

  ```bash
  # Agent runs TypeScript check:
  bunx tsc --noEmit src/lib/auth.ts
  # Assert: Exit code 0, no type errors
  
  # Verify session types include activeTeamId:
  grep -A 10 "interface Session" src/lib/auth.ts
  # Assert: Contains "activeTeamId: string | null"
  # Assert: Contains "teams?: { id: string; name: string; role: string }[]"
  
  # Verify JWT callback handles UserTeam:
  grep -B 2 -A 5 "UserTeam" src/lib/auth.ts
  # Assert: Queries UserTeam table for user's teams
  ```

  **Evidence to Capture**:
  - [ ] TypeScript compilation success
  - [ ] Updated Session interface with activeTeamId
  - [ ] UserTeam query in JWT callback

  **Commit**: YES
  - Message: `feat(auth): add activeTeamId and teams array to session`
  - Files: `src/lib/auth.ts`
  - Pre-commit: `bunx tsc --noEmit`

---

### Task 3: Update Team Actions for Multi-Team

- [ ] 3. Update teams.ts actions + add switchTeam, getUserTeams

  **What to do**:
  - Remove single-team restriction from `createTeam` (delete `if (user?.teamId)` check)
  - Remove single-team restriction from `joinTeam` (delete `if (user?.teamId)` check)
  - Update `createTeam` to create UserTeam record with role=ADMIN
  - Update `joinTeam` to create UserTeam record with role=MEMBER
  - Add `switchTeam(teamId)` action: verify membership, call session update
  - Add `getUserTeams()` action: return user's teams with roles
  - Add `leaveTeam(teamId)` action: remove UserTeam record (if not last team)
  - Update `getTeam()` to use activeTeamId from session
  - Update `removeMember()` to delete UserTeam record

  **Must NOT do**:
  - DO NOT allow user to have zero teams (at least one required after first join)
  - DO NOT allow switching to team user is not member of
  - DO NOT implement team deletion in this task
  - DO NOT modify `regenerateInviteCode` action

  **Recommended Agent Profile**:
  - **Category**: `ultrabrain`
    - Reason: Business logic with security implications
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for action changes
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 4)
  - **Blocks**: Tasks 5, 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `src/actions/teams.ts:71-133` - Current createTeam with restriction to remove
  - `src/actions/teams.ts:135-174` - Current joinTeam with restriction to remove
  - `src/actions/teams.ts:176-205` - getTeam pattern using session.user.teamId
  - `src/actions/teams.ts:312-355` - removeMember pattern to update

  **API/Type References**:
  - `src/types/index.ts` - ActionResult type pattern
  - `src/actions/teams.ts:7` - Import pattern for ActionResult

  **WHY Each Reference Matters**:
  - createTeam/joinTeam: Lines 85-87 and 149-151 have restrictions to remove
  - getTeam: Needs to use activeTeamId instead of teamId
  - removeMember: Update to delete UserTeam record

  **Acceptance Criteria**:

  ```bash
  # Agent runs TypeScript check:
  bunx tsc --noEmit src/actions/teams.ts
  # Assert: Exit code 0, no type errors
  
  # Verify restriction removed from createTeam:
  grep -n "이미 팀에 소속되어 있습니다" src/actions/teams.ts
  # Assert: No matches (restriction removed)
  
  # Verify new actions exist:
  grep -n "export async function switchTeam" src/actions/teams.ts
  grep -n "export async function getUserTeams" src/actions/teams.ts
  # Assert: Both functions exist
  
  # Verify UserTeam is used:
  grep -n "prisma.userTeam" src/actions/teams.ts
  # Assert: Multiple matches for create/delete/findMany
  ```

  **Evidence to Capture**:
  - [ ] TypeScript compilation success
  - [ ] Restriction removed verification
  - [ ] New actions exist (switchTeam, getUserTeams)

  **Commit**: YES
  - Message: `feat(teams): enable multi-team support in actions`
  - Files: `src/actions/teams.ts`
  - Pre-commit: `bunx tsc --noEmit`

---

### Task 4: Data Migration for Existing Users

- [ ] 4. Create and run data migration script for existing team memberships

  **What to do**:
  - Create migration script: `scripts/migrate-to-user-team.ts`
  - Script reads all users with non-null `teamId`
  - For each user, create UserTeam record: `{ userId, teamId, role: user.role, joinedAt: user.createdAt }`
  - Handle existing UserTeam records (skip duplicates with `skipDuplicates: true`)
  - Add dry-run mode for testing
  - Run migration and verify data integrity

  **Must NOT do**:
  - DO NOT delete User.teamId values after migration
  - DO NOT modify users without teamId (they stay in onboarding)
  - DO NOT run on production without backup

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: One-time script, straightforward data transformation
  - **Skills**: [`git-master`]
    - `git-master`: Commit migration script
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: Task 8
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `scripts/fix-folder-sort-order.ts` - Existing script pattern with Prisma client
  - `prisma/schema.prisma` - UserTeam model structure (from Task 1)

  **Documentation References**:
  - Prisma createMany: https://www.prisma.io/docs/reference/api-reference/prisma-client-reference#createmany

  **WHY Each Reference Matters**:
  - fix-folder-sort-order.ts: Copy script structure, Prisma client setup
  - UserTeam model: Know exact fields to populate

  **Acceptance Criteria**:

  ```bash
  # Agent creates and runs migration script:
  bunx tsx scripts/migrate-to-user-team.ts --dry-run
  # Assert: Shows "Would create X UserTeam records"
  
  bunx tsx scripts/migrate-to-user-team.ts
  # Assert: "Migration complete: X records created"
  
  # Verify data integrity:
  bunx prisma studio &
  # Or via script:
  bunx tsx -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    (async () => {
      const users = await p.user.count({ where: { teamId: { not: null } } });
      const userTeams = await p.userTeam.count();
      console.log('Users with teamId:', users);
      console.log('UserTeam records:', userTeams);
      console.log('Match:', users === userTeams ? 'YES' : 'NO');
      await p.\$disconnect();
    })();
  "
  # Assert: Users with teamId count === UserTeam records count
  ```

  **Evidence to Capture**:
  - [ ] Dry-run output showing expected changes
  - [ ] Migration execution output
  - [ ] Data integrity verification (counts match)

  **Commit**: YES
  - Message: `chore(migration): add script to migrate existing team memberships`
  - Files: `scripts/migrate-to-user-team.ts`
  - Pre-commit: `bunx tsx scripts/migrate-to-user-team.ts --dry-run`

---

### Task 5: Update Middleware for Multi-Team

- [ ] 5. Update middleware.ts for multi-team routing logic

  **What to do**:
  - Update onboarding check: redirect if user has NO teams (not just no teamId)
  - Handle case: user has teams but no activeTeamId (auto-set first team)
  - Ensure protected routes still require active team membership
  - Keep backward compatibility with `session.user.teamId`

  **Must NOT do**:
  - DO NOT change protected route paths
  - DO NOT add new authentication checks
  - DO NOT remove existing redirect logic for unauthenticated users

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Small, focused middleware update
  - **Skills**: [`git-master`]
    - `git-master`: Atomic commit for middleware
  - **Skills Evaluated but Omitted**:
    - `frontend-ui-ux`: No UI work

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 8, 9)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 2, 3

  **References**:

  **Pattern References**:
  - `src/middleware.ts:31-52` - Current teamId-based routing logic
  - `src/lib/auth.ts` - Updated session structure (from Task 2)

  **WHY Each Reference Matters**:
  - middleware.ts: Understand current routing logic to update
  - auth.ts: Use new session.user.teams and activeTeamId

  **Acceptance Criteria**:

  ```bash
  # Agent runs TypeScript check:
  bunx tsc --noEmit src/middleware.ts
  # Assert: Exit code 0, no type errors
  
  # Verify updated logic:
  grep -A 5 "onboarding" src/middleware.ts
  # Assert: Checks for teams array length, not just teamId
  
  # Verify backward compatibility:
  grep "teamId" src/middleware.ts
  # Assert: Still references teamId for compatibility
  ```

  **Evidence to Capture**:
  - [ ] TypeScript compilation success
  - [ ] Updated onboarding redirect logic
  - [ ] Backward compatibility preserved

  **Commit**: YES
  - Message: `feat(middleware): update routing for multi-team support`
  - Files: `src/middleware.ts`
  - Pre-commit: `bunx tsc --noEmit`

---

### Task 6: Add Kakao Open Chat Button

- [ ] 6. Add Kakao button to onboarding form

  **What to do**:
  - Add styled button with Kakao icon below secret key field
  - Button opens `https://open.kakao.com/o/gxfRDFYh` in new tab
  - Use existing Button component with custom styling
  - Add Kakao icon (use MessageCircle or custom SVG)
  - Korean text: "시크릿 키 받기" or "카카오톡 문의"
  - Ensure responsive on mobile

  **Must NOT do**:
  - DO NOT make Kakao link configurable (hardcode for now)
  - DO NOT add analytics tracking
  - DO NOT change form validation or submission logic
  - DO NOT add Kakao button to join team tab (only create tab)

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: UI component with styling requirements
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Button styling and placement
  - **Skills Evaluated but Omitted**:
    - `git-master`: Can use default commit behavior

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 7)
  - **Blocks**: Task 10
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/app/(auth)/onboarding/onboarding-form.tsx:107-134` - Create team tab form structure
  - `src/app/(auth)/onboarding/onboarding-form.tsx:119-128` - Secret key input field (place button below)
  - `src/components/ui/button.tsx` - Button component variants

  **External References**:
  - Kakao brand colors: #FEE500 (yellow), #3C1E1E (brown text)
  - Lucide MessageCircle icon: https://lucide.dev/icons/message-circle

  **WHY Each Reference Matters**:
  - onboarding-form.tsx: Exact location to add button (after line 128)
  - Button component: Use existing variant system
  - Kakao colors: Match brand for recognition

  **Acceptance Criteria**:

  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/onboarding
  2. Wait for: tab "새 팀 만들기" to be visible
  3. Assert: Kakao button exists below secret key field
  4. Assert: Button text contains "카카오" or "시크릿"
  5. Click: Kakao button
  6. Wait for: New tab to open
  7. Assert: New tab URL starts with "https://open.kakao.com"
  8. Screenshot: .sisyphus/evidence/task-6-kakao-button.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot showing Kakao button in form
  - [ ] Verification that link opens in new tab

  **Commit**: YES
  - Message: `feat(onboarding): add Kakao open chat button for secret key`
  - Files: `src/app/(auth)/onboarding/onboarding-form.tsx`
  - Pre-commit: `bunx tsc --noEmit`

---

### Task 7: Create Team Switcher Component Skeleton

- [ ] 7. Create team-switcher.tsx component skeleton

  **What to do**:
  - Create `src/components/layout/team-switcher.tsx`
  - Use DropdownMenu pattern from existing user-menu.tsx
  - Props: `teams: { id, name, role }[]`, `activeTeamId: string`, `onSwitch: (teamId) => void`
  - Display current team name with ChevronDown icon
  - Dropdown lists all teams with role badges
  - Active team highlighted
  - Loading state for when switching
  - "팀 추가하기" link at bottom (goes to /onboarding)

  **Must NOT do**:
  - DO NOT implement actual data fetching (skeleton only)
  - DO NOT add team creation modal
  - DO NOT add team settings
  - DO NOT implement actual switch logic (just callback)

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: UI component with design requirements
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component design and patterns
  - **Skills Evaluated but Omitted**:
    - `git-master`: Can use default commit behavior

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 1 (with Tasks 1, 6)
  - **Blocks**: Tasks 8, 9
  - **Blocked By**: None

  **References**:

  **Pattern References**:
  - `src/components/layout/user-menu.tsx` - DropdownMenu pattern to copy
  - `src/components/ui/dropdown-menu.tsx` - DropdownMenu primitives
  - `src/components/ui/badge.tsx` - Badge for role display
  - `src/components/ui/avatar.tsx` - Avatar pattern if needed

  **API/Type References**:
  - Create new type: `TeamSwitcherProps` with teams array, activeTeamId, onSwitch

  **WHY Each Reference Matters**:
  - user-menu.tsx: Copy exact DropdownMenu structure
  - badge.tsx: Display ADMIN/MEMBER role
  - dropdown-menu.tsx: Understand available primitives

  **Acceptance Criteria**:

  ```bash
  # Agent runs TypeScript check:
  bunx tsc --noEmit src/components/layout/team-switcher.tsx
  # Assert: Exit code 0, no type errors
  
  # Verify component structure:
  grep -n "DropdownMenu" src/components/layout/team-switcher.tsx
  # Assert: Uses DropdownMenu component
  
  grep -n "interface TeamSwitcherProps" src/components/layout/team-switcher.tsx
  # Assert: Props interface defined
  
  grep -n "onSwitch" src/components/layout/team-switcher.tsx
  # Assert: onSwitch callback in props
  ```

  **Evidence to Capture**:
  - [ ] TypeScript compilation success
  - [ ] Component file exists with correct structure
  - [ ] Props interface defined

  **Commit**: YES
  - Message: `feat(ui): add team-switcher component skeleton`
  - Files: `src/components/layout/team-switcher.tsx`
  - Pre-commit: `bunx tsc --noEmit`

---

### Task 8: Integrate Team Switcher in Sidebar

- [ ] 8. Integrate team switcher into sidebar with real data

  **What to do**:
  - Import TeamSwitcher component into sidebar.tsx
  - Fetch user's teams using `getUserTeams()` action
  - Get activeTeamId from session
  - Implement `handleSwitch` that calls `switchTeam()` and refreshes
  - Place switcher below logo, above navigation
  - Add loading state during switch
  - Handle error cases (show toast)

  **Must NOT do**:
  - DO NOT modify navigation structure below switcher
  - DO NOT add team management features
  - DO NOT fetch teams on every render (use server component or SWR)

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: Integration of UI with data fetching
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Component integration
  - **Skills Evaluated but Omitted**:
    - `git-master`: Can use default commit behavior

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 9)
  - **Blocks**: Task 10
  - **Blocked By**: Tasks 2, 3, 4, 7

  **References**:

  **Pattern References**:
  - `src/components/layout/sidebar.tsx:88-94` - Logo/header area to add switcher below
  - `src/components/layout/team-switcher.tsx` - Component from Task 7
  - `src/actions/teams.ts` - getUserTeams, switchTeam actions from Task 3

  **API/Type References**:
  - `src/lib/auth.ts` - Session type with activeTeamId from Task 2

  **WHY Each Reference Matters**:
  - sidebar.tsx lines 88-94: Exact location to insert team switcher
  - team-switcher.tsx: Component to import and use
  - teams.ts actions: Data fetching and switching functions

  **Acceptance Criteria**:

  ```
  # Agent executes via playwright browser automation:
  1. Navigate to: http://localhost:3000/ (requires login)
  2. Wait for: Sidebar to be visible
  3. Assert: Team switcher appears below "KPI Dashboard" logo
  4. Assert: Current team name is displayed
  5. Click: Team switcher dropdown
  6. Assert: Dropdown shows list of user's teams
  7. Assert: Active team is highlighted
  8. Click: Different team (if available)
  9. Wait for: Page refresh or data update
  10. Assert: Active team name changed
  11. Screenshot: .sisyphus/evidence/task-8-team-switcher.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot showing team switcher in sidebar
  - [ ] Screenshot showing dropdown open with teams
  - [ ] Verification of team switch functionality

  **Commit**: YES
  - Message: `feat(sidebar): integrate team switcher with data`
  - Files: `src/components/layout/sidebar.tsx`
  - Pre-commit: `bunx tsc --noEmit`

---

### Task 9: Add Team Switcher to Mobile Nav

- [ ] 9. Add team switcher to mobile navigation

  **What to do**:
  - Update mobile-nav.tsx to include team switcher
  - Use same TeamSwitcher component
  - Place appropriately in mobile sheet/drawer
  - Ensure touch-friendly sizing
  - Close drawer after team switch

  **Must NOT do**:
  - DO NOT create separate mobile-specific switcher component
  - DO NOT change mobile nav structure significantly
  - DO NOT add additional mobile-only features

  **Recommended Agent Profile**:
  - **Category**: `artistry`
    - Reason: Mobile UI adaptation
  - **Skills**: [`frontend-ui-ux`]
    - `frontend-ui-ux`: Mobile responsive design
  - **Skills Evaluated but Omitted**:
    - `git-master`: Can use default commit behavior

  **Parallelization**:
  - **Can Run In Parallel**: YES
  - **Parallel Group**: Wave 3 (with Tasks 5, 8)
  - **Blocks**: Task 10
  - **Blocked By**: Task 7

  **References**:

  **Pattern References**:
  - `src/components/layout/mobile-nav.tsx` - Current mobile navigation
  - `src/components/ui/sheet.tsx` - Mobile drawer component
  - `src/components/layout/team-switcher.tsx` - Component from Task 7

  **WHY Each Reference Matters**:
  - mobile-nav.tsx: Understand current mobile layout
  - sheet.tsx: Mobile drawer primitives
  - team-switcher.tsx: Component to integrate

  **Acceptance Criteria**:

  ```
  # Agent executes via playwright browser automation (mobile viewport):
  1. Set viewport to mobile (375x667)
  2. Navigate to: http://localhost:3000/
  3. Click: Mobile menu hamburger icon
  4. Wait for: Sheet/drawer to open
  5. Assert: Team switcher is visible in drawer
  6. Assert: Current team name displayed
  7. Click: Team switcher
  8. Assert: Team list appears
  9. Screenshot: .sisyphus/evidence/task-9-mobile-switcher.png
  ```

  **Evidence to Capture**:
  - [ ] Screenshot showing mobile nav with team switcher
  - [ ] Verification of touch-friendly sizing

  **Commit**: YES
  - Message: `feat(mobile): add team switcher to mobile navigation`
  - Files: `src/components/layout/mobile-nav.tsx`
  - Pre-commit: `bunx tsc --noEmit`

---

### Task 10: End-to-End Verification and Edge Cases

- [ ] 10. Complete E2E verification and edge case testing

  **What to do**:
  - Verify complete user flow: login → create team → create second team → switch
  - Verify data isolation: Team A data not visible when in Team B
  - Test edge cases:
    - User with zero teams redirects to onboarding
    - User removed from team while viewing it
    - Very long team names (truncation)
    - User with 10+ teams (scrolling in dropdown)
  - Verify Kakao button works on mobile
  - Run all TypeScript checks
  - Document any remaining issues

  **Must NOT do**:
  - DO NOT fix new bugs found (document for follow-up)
  - DO NOT add new features
  - DO NOT modify any code unless critical bug

  **Recommended Agent Profile**:
  - **Category**: `visual-engineering`
    - Reason: E2E testing requires browser automation
  - **Skills**: [`playwright`, `frontend-ui-ux`]
    - `playwright`: Browser automation for E2E tests
    - `frontend-ui-ux`: UI verification expertise
  - **Skills Evaluated but Omitted**:
    - `git-master`: No commits expected in this task

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Wave 4 (Sequential - final)
  - **Blocks**: None (final task)
  - **Blocked By**: Tasks 5, 6, 8, 9

  **References**:

  All previous task deliverables.

  **Acceptance Criteria**:

  ```
  # Complete E2E Flow via playwright:
  
  # 1. Create first team
  1. Navigate to: http://localhost:3000/onboarding
  2. Fill: Team name = "Test Team 1"
  3. Fill: Secret key = [valid key]
  4. Click: Submit
  5. Assert: Redirected to dashboard
  6. Assert: Team switcher shows "Test Team 1"
  
  # 2. Verify Kakao button
  7. Navigate to: http://localhost:3000/onboarding
  8. Assert: Kakao button visible
  9. Click: Kakao button
  10. Assert: New tab opens with Kakao URL
  
  # 3. Create second team
  11. Fill: Team name = "Test Team 2"
  12. Fill: Secret key = [valid key]
  13. Click: Submit
  14. Assert: Dashboard loads
  
  # 4. Switch teams
  15. Click: Team switcher
  16. Assert: Both teams visible
  17. Click: "Test Team 1"
  18. Assert: Active team changed
  19. Assert: Dashboard data refreshed
  
  # 5. Data isolation check
  20. Create transaction in Team 1
  21. Switch to Team 2
  22. Assert: Transaction NOT visible
  23. Switch back to Team 1
  24. Assert: Transaction IS visible
  
  # 6. Edge cases
  25. Test long team name (50+ chars)
  26. Assert: Name truncated in switcher
  27. Test mobile viewport
  28. Assert: Mobile switcher works
  
  # Save evidence
  Screenshot: .sisyphus/evidence/task-10-e2e-complete.png
  ```

  **Evidence to Capture**:
  - [ ] E2E flow screenshots
  - [ ] Data isolation verification
  - [ ] Edge case test results
  - [ ] Any bugs documented in `.sisyphus/evidence/task-10-issues.md`

  **Commit**: NO (verification only)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `feat(schema): add UserTeam junction table for multi-team support` | prisma/* | `bunx prisma validate` |
| 2 | `feat(auth): add activeTeamId and teams array to session` | src/lib/auth.ts | `bunx tsc --noEmit` |
| 3 | `feat(teams): enable multi-team support in actions` | src/actions/teams.ts | `bunx tsc --noEmit` |
| 4 | `chore(migration): add script to migrate existing team memberships` | scripts/* | dry-run test |
| 5 | `feat(middleware): update routing for multi-team support` | src/middleware.ts | `bunx tsc --noEmit` |
| 6 | `feat(onboarding): add Kakao open chat button for secret key` | src/app/.../onboarding-form.tsx | visual check |
| 7 | `feat(ui): add team-switcher component skeleton` | src/components/layout/team-switcher.tsx | `bunx tsc --noEmit` |
| 8 | `feat(sidebar): integrate team switcher with data` | src/components/layout/sidebar.tsx | visual check |
| 9 | `feat(mobile): add team switcher to mobile navigation` | src/components/layout/mobile-nav.tsx | visual check |
| 10 | N/A (verification only) | N/A | E2E tests |

---

## Success Criteria

### Verification Commands
```bash
# TypeScript check
bunx tsc --noEmit
# Expected: Exit code 0

# Prisma validation
bunx prisma validate
# Expected: "The schema is valid"

# Migration check
bunx prisma migrate status
# Expected: All migrations applied

# Dev server
bun dev
# Expected: Server starts without errors
```

### Final Checklist
- [ ] All "Must Have" features present
- [ ] All "Must NOT Have" guardrails respected
- [ ] All TypeScript checks pass
- [ ] All 10 tasks completed
- [ ] Evidence captured for all tasks
- [ ] No cross-team data leakage
- [ ] Existing users migrated successfully
