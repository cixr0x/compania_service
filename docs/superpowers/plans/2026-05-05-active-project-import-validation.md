# Active Project Import Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add project active/inactive state, enforce at most one active project per product, and reject sales imports for products without an active project.

**Architecture:** Store `project.is_active` as the user-facing flag and add an internal nullable unique key maintained by the Projects service to enforce one active project per product at the database layer. The Projects service validates active writes before insert/update and the import validator checks matched products for an active project while preserving the staged product match for user review.

**Tech Stack:** NestJS, Prisma 7, MySQL, React, Vite, Vitest, Jest.

---

### Task 1: Document The Active Project Rule

**Files:**
- Modify: `docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md`

- [ ] **Step 1: Add the project field and rule**

Document that `project.is_active` marks the current active project for a product, defaults to inactive, and that no more than one project can be active for the same product.

- [ ] **Step 2: Add the import validation rule**

Document that staged sales imports require the matched product to have an active project; otherwise the row receives an import validation error and cannot be committed.

### Task 2: Add Backend Red Tests

**Files:**
- Modify: `backend/src/projects/projects.service.spec.ts`
- Modify: `backend/src/import-batches/import-validator.service.spec.ts`

- [ ] **Step 1: Write project uniqueness tests**

Add tests that creating or updating an active project rejects when another active project already exists for the same product.

- [ ] **Step 2: Write import validation tests**

Add tests that matched products with active projects import cleanly, and matched products without active projects produce a validation error.

- [ ] **Step 3: Verify red**

Run: `npm.cmd test -- projects import-validator` from `backend/`.

Expected: tests fail because `isActive` and active-project import validation do not exist yet.

### Task 3: Implement Backend Schema And Services

**Files:**
- Create: `backend/prisma/migrations/20260505000002_add_project_active_flag/migration.sql`
- Modify: `backend/prisma/schema.prisma`
- Modify: `backend/src/projects/dto/create-project.dto.ts`
- Modify: `backend/src/projects/projects.service.ts`
- Modify: `backend/src/import-batches/import-validator.service.ts`

- [ ] **Step 1: Add migration**

Add `project.is_active BOOLEAN NOT NULL DEFAULT false`, add nullable `active_product_id`, and add a unique index over `active_product_id`.

- [ ] **Step 2: Add Prisma field**

Add `isActive Boolean @default(false) @map("is_active")` to `Project`.

- [ ] **Step 3: Add DTO support**

Add optional boolean validation for `isActive`.

- [ ] **Step 4: Add project write validation**

Create/update active project writes must check for an existing active project with the same `idProduct`, excluding the current project during updates.

- [ ] **Step 5: Add import validation**

Fetch active project existence during product lookup and add a row error when a matched product has no active project.

- [ ] **Step 6: Verify green**

Run: `npm.cmd test -- projects import-validator` from `backend/`.

Expected: focused backend tests pass.

### Task 4: Implement Frontend Active Field

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/components/EntityForm.tsx`
- Modify: `frontend/src/features/entities/entityConfigs.ts`
- Modify: `frontend/src/features/entities/EntityEditPage.test.tsx`

- [ ] **Step 1: Add frontend red test**

Update the project create test to tick `Active` and expect `isActive: true` in the submitted payload.

- [ ] **Step 2: Add checkbox field support**

Add `checkbox` to entity field types, render it as an input checkbox, and serialize unchecked values as `false`.

- [ ] **Step 3: Add project field**

Add the `Active` column and checkbox field to the projects config and add `isActive: boolean` to the Project API type.

- [ ] **Step 4: Verify green**

Run: `npm.cmd test -- EntityEditPage.test.tsx` from `frontend/`.

Expected: focused frontend tests pass.

### Task 5: Apply Migration And Verify

**Files:**
- Database migration state

- [ ] **Step 1: Generate Prisma client**

Run: `npx.cmd prisma generate` from `backend/`.

- [ ] **Step 2: Apply migration**

Run: `npx.cmd prisma migrate deploy` from `backend/`.

- [ ] **Step 3: Verify status**

Run: `npx.cmd prisma migrate status` from `backend/`.

Expected: database schema is up to date.

### Task 6: Final Verification And Commit

**Files:**
- All files changed above

- [ ] **Step 1: Run backend verification**

Run from `backend/`: `npx.cmd prisma validate`, `npm.cmd test`, `npm.cmd run build`, and targeted ESLint for changed backend files.

- [ ] **Step 2: Run frontend verification**

Run from `frontend/`: `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.

- [ ] **Step 3: Commit and push**

Stage only this change set, commit with `feat: enforce active projects for imports`, and push `main`.
