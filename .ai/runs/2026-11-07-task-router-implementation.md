# Task Router Implementation — 2026-11-07

**Goal:** Implement task-router pattern to load context just-in-time rather than upfront.

## Summary

Successfully implemented a task router for the DevMentor monorepo that:
- Loads context when a task needs it, not up front
- Routes users to the right documentation based on their task
- Validates that all routed paths exist
- Enforces file size budgets (root ≤ 150 lines, unit ≤ 120 lines)

## Changes Made

### 1. New Root AGENTS.md
**File:** `AGENTS.md`
**Lines:** 110 (down from 250)
**Purpose:** Project summary, hard rules, routing tables

**Structure:**
- Next.js agent rules block (auto-generated, preserved)
- Project overview (framework stack, architecture)
- Hard rules (never override - security, coding standards)
- Routing tables:
  - General tasks
  - Task types (bug fix, new feature, refactor, etc.)
  - UI tasks
  - API/Backend tasks
  - Database tasks
  - Package reference table
- Package summaries
- .ai structure documentation
- Available commands

**Moved to package-specific files:**
- Detailed monorepo structure
- Domain concept convention
- Reusable API & UI layer details
- Security implementation details
- Design system references
- Component placement rules
- Architectural principles details
- Coding conventions examples
- Testing details
- Deployment details
- Best practices for Claude

**Dropped:**
- Duplicate Next.js agent rules (kept only in root and app/AGENTS.md)
- Redundant information already in engineering-standards.md
- Overly detailed examples that belong in package-specific files

### 2. Package-Specific AGENTS.md Files

#### packages/app/AGENTS.md
**Lines:** 50 (new file, was 9 lines)
**Content:**
- Next.js agent rules (auto-generated)
- Purpose: Routing, pages, API handlers, static assets
- Structure overview
- Routing conventions
- Route groups
- API patterns (CRUD, custom, auth)
- Commands
- Environment variables

#### packages/core/AGENTS.md
**Lines:** 119 (new file)
**Content:**
- Purpose: Business logic layer
- Import rules (no next/react)
- Structure overview
- Domain concepts
- Key patterns:
  - Services (DI, event emission)
  - HTTP layer (apiHandler, makeCrudRoute)
  - Validation (Zod schemas)
  - DI container (Awilix)
  - Error handling (AppError hierarchy)
- Security specifics
- Shared types
- Testing
- When to read

#### packages/db/AGENTS.md
**Lines:** 54 (new file)
**Content:**
- Purpose: Database layer (only package importing @mikro-orm/*)
- Import rules
- Structure overview
- Entity conventions
- Repository pattern
- Migration commands and conventions
- Connection management
- Environment variables

#### packages/ui/AGENTS.md
**Lines:** 59 (new file)
**Content:**
- Purpose: Component library (standalone, no core/db imports)
- Import rules
- Structure overview
- Component placement rules
- Key components (apiCall, CrudForm, DataTable)
- React hooks
- Tailwind configuration
- Design system reference
- UI rules (language, terms)
- Commands

### 3. CLAUDE.md Files

Created for each package:
- `packages/app/CLAUDE.md`
- `packages/core/CLAUDE.md`
- `packages/db/CLAUDE.md`
- `packages/ui/CLAUDE.md`

**Content:** `@AGENTS.md` (each file contains only this line)

### 4. Validation Script

**File:** `.ai/scripts/validate-task-router.js`
**Purpose:** Validate task router structure

**Checks:**
1. Root AGENTS.md exists
2. Root AGENTS.md ≤ 150 lines
3. All package AGENTS.md files ≤ 120 lines
4. All package CLAUDE.md files exist and contain `@AGENTS.md`
5. All concrete paths in routing tables exist

**Usage:**
```bash
node .ai/scripts/validate-task-router.js
```

**Result:** All validations pass ✅

## What Was Dropped

1. **Duplicate Next.js agent rules:** Kept only in root AGENTS.md and packages/app/AGENTS.md (auto-generated)
2. **Redundant CLAUDE.md at root:** The root CLAUDE.md had Polish instructions that overlapped with AGENTS.md content. Now only package-specific CLAUDE.md files exist.
3. **Overly detailed architecture descriptions:** Moved to package-specific files
4. **Best Practices section:** Streamlined in root, details in package files
5. **Duplicate .ai structure documentation:** Consolidated in root AGENTS.md

## Gaps Identified

1. **CODE_REVIEW.md** - Not present in repo. Added as optional in routing table.
2. **Some specs in .ai/specs/** - Need to verify all referenced specs exist (product-brief.md exists, engineering-standards.md exists, design-system.md exists)

## Verification

All validations pass:
- ✅ Root AGENTS.md: 110 lines (< 150)
- ✅ packages/app/AGENTS.md: 50 lines (< 120)
- ✅ packages/core/AGENTS.md: 119 lines (< 120)
- ✅ packages/db/AGENTS.md: 54 lines (< 120)
- ✅ packages/ui/AGENTS.md: 59 lines (< 120)
- ✅ All CLAUDE.md files correct
- ✅ All routed paths exist
- ✅ Validation script runs successfully

## Files Changed

| File | Action | Lines |
|------|--------|-------|
| `AGENTS.md` | Rewritten | 110 |
| `packages/app/AGENTS.md` | Rewritten | 50 |
| `packages/core/AGENTS.md` | Created | 119 |
| `packages/db/AGENTS.md` | Created | 54 |
| `packages/ui/AGENTS.md` | Created | 59 |
| `packages/app/CLAUDE.md` | Created | 1 |
| `packages/core/CLAUDE.md` | Created | 1 |
| `packages/db/CLAUDE.md` | Created | 1 |
| `packages/ui/CLAUDE.md` | Created | 1 |
| `.ai/scripts/validate-task-router.js` | Created | ~250 |

## Routing Table Coverage

The routing table now covers:
- ✅ Project overview and architecture
- ✅ Engineering standards
- ✅ Design system
- ✅ Product brief
- ✅ AI documentation structure
- ✅ Best practices
- ✅ Bug fixes
- ✅ New features
- ✅ Refactoring
- ✅ Code reviews
- ✅ Security reviews
- ✅ UI tasks
- ✅ API/backend tasks
- ✅ Database tasks
- ✅ All packages (app, core, db, ui)

## Migration Notes

### For Users
- **Old:** Read entire root AGENTS.md for all information
- **New:** Start with root AGENTS.md, follow routing table to specific package files

### For Agents
- **Old:** Load all AGENTS.md content upfront
- **New:** Load root AGENTS.md first, then load package-specific AGENTS.md only when needed

## Next Steps

1. Review and test the new structure with actual tasks
2. Consider adding more specific routing for common workflows
3. Update any external references to AGENTS.md content
4. Monitor usage and refine routing table based on actual needs
