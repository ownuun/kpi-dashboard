# Draft: Multi-Team Support + Kakao Link

## Requirements (confirmed)
- **Kakao Link**: Add button to onboarding form that opens `https://open.kakao.com/o/gxfRDFYh`
- **Multi-Team**: Allow users to belong to 2+ teams

## Research Findings

### Current Architecture
- User has single `teamId` foreign key (one-to-many with Team)
- Session stores `teamId` in JWT token
- Middleware redirects to `/onboarding` if no teamId
- 14 files use `session.user.teamId` for data filtering
- `createTeam` and `joinTeam` block if user already has a team

### Files Requiring Changes (identified)
1. `prisma/schema.prisma` - Add UserTeam junction table
2. `src/lib/auth.ts` - Handle activeTeamId concept
3. `src/actions/teams.ts` - Remove restrictions, add switching
4. `src/app/(auth)/onboarding/onboarding-form.tsx` - Kakao link
5. `src/components/layout/sidebar.tsx` - Team switcher at top
6. `src/middleware.ts` - Handle multi-team session

### Available UI Components
- DropdownMenu (used for UserMenu - good pattern)
- Dialog, Select, Button, Avatar, Badge
- Existing patterns in user-menu.tsx and onboarding-form.tsx

## Technical Decisions (CONFIRMED)
- **Role per Team**: UserTeam junction table with `role` field per membership
- **Active Team Storage**: JWT Session (fast switching via session.update())
- **Team Switcher Location**: Sidebar header, above navigation
- **Kakao Link Style**: Styled button with Kakao icon
- **Migration Strategy**: Keep `teamId` as deprecated, migrate data to UserTeam

## Scope Boundaries
- INCLUDE:
  - Kakao open chat link button on onboarding form
  - UserTeam junction table (many-to-many)
  - Data migration script for existing users
  - Team switcher component in sidebar
  - switchTeam server action
  - Session handling for activeTeamId
  - Update middleware for multi-team
  - Remove single-team restrictions in actions

- EXCLUDE:
  - Removing deprecated `teamId` column (future migration)
  - Team management UI beyond switcher (create/leave team modals)
  - Team invitation system changes
  - Notification system for team changes
