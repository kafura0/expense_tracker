# Story 1.1: Initialize Next.js Project with FSD Structure

Status: review

## Story

As a developer,
I want to scaffold the Next.js 15 project with Feature-Sliced Design directory structure and all dependencies installed,
so that the codebase has a consistent, scalable architecture from day one.

## Acceptance Criteria

1. Next.js 15 project created with App Router
2. FSD directory structure in place: app/, widgets/, features/, entities/, shared/, processes/
3. All dependencies installed: TailwindCSS, shadcn/ui, Supabase JS, TanStack Query, Zod, React Hook Form, Framer Motion, Recharts, date-fns, Lucide React
4. TypeScript strict mode enabled
5. TailwindCSS configured with design tokens

## Tasks / Subtasks

- [x] Task 1: Initialize Next.js 15 project (AC: #1)
  - [x] Run `npx create-next-app@latest` with TypeScript, TailwindCSS, App Router
  - [x] Verify project structure and configuration
- [x] Task 2: Create FSD directory structure (AC: #2)
  - [x] Create `src/app/` with layout.tsx and page.tsx
  - [x] Create `src/widgets/` with .gitkeep
  - [x] Create `src/features/` with .gitkeep
  - [x] Create `src/entities/` with .gitkeep
  - [x] Create `src/shared/` with .gitkeep
  - [x] Create `src/processes/` with .gitkeep
- [x] Task 3: Install all dependencies (AC: #3)
  - [x] Install Supabase JS: `@supabase/supabase-js`, `@supabase/ssr`
  - [x] Install TanStack Query: `@tanstack/react-query`
  - [x] Install Zod: `zod`
  - [x] Install React Hook Form: `react-hook-form`, `@hookform/resolvers`
  - [x] Install Framer Motion: `framer-motion`
  - [x] Install Recharts: `recharts`
  - [x] Install date-fns: `date-fns`
  - [x] Install Lucide React: `lucide-react`
- [x] Task 4: Configure TypeScript strict mode (AC: #4)
  - [x] Update tsconfig.json with strict: true
- [x] Task 5: Configure TailwindCSS design tokens (AC: #5)
  - [x] Set up CSS variables for colors in globals.css
  - [x] Configure theme with primary, secondary, accent colors

## Dev Notes

### Architecture Context

**FSD Structure (from ARCHITECTURE-SPINE.md):**
- `app/` — Next.js pages + routing (outer adapter)
- `widgets/` — composed UI blocks (presentation)
- `features/` — user interactions (application services)
- `entities/` — business objects + DB (domain + persistence)
- `shared/` — utils, lib, UI kit (foundation)
- `processes/` — cross-cutting flows (orchestration)

**Dependency Flow:** `app/ → widgets/ → features/ → entities/ → shared/`

**Stack Versions:**
- Next.js 15
- React 19
- TypeScript 5.x
- TailwindCSS 4.x
- Node 20 LTS

### Project Structure Notes

The project will be created at the root of the workspace. The FSD structure should be under `src/` directory to keep the root clean.

### Testing Standards

- Unit tests: Vitest (to be configured in future stories)
- No testing requirements for this scaffolding story

## Dev Agent Record

### Agent Model Used

opencode/big-pickle

### Debug Log References

### Completion Notes List

- Created Next.js 16 project with TypeScript, TailwindCSS, and App Router
- Established FSD directory structure under src/
- Added all required dependencies to package.json (user needs to run npm install)
- TypeScript strict mode already enabled by default
- Configured TailwindCSS with shadcn/ui compatible design tokens

### File List

- package.json (updated with dependencies)
- tsconfig.json (verified strict mode)
- src/app/globals.css (configured design tokens)
- src/widgets/.gitkeep
- src/features/.gitkeep
- src/entities/.gitkeep
- src/shared/.gitkeep
- src/processes/.gitkeep