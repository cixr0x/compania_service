# Project Stakeholder Selectors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace free numeric project and stakeholder inputs in the project stakeholder split editor with entity-backed select controls.

**Architecture:** Keep the existing split editor and `PUT /project-stakeholders/projects/:id` save flow. Add frontend option queries for projects and stakeholders, render labels with human-readable names, and continue submitting numeric IDs.

**Tech Stack:** React, TypeScript, TanStack Query, Vitest, Testing Library.

---

### Task 1: Document The UI Rule

**Files:**
- Modify: `docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md`

- [ ] **Step 1: Update frontend design**

Record that the project stakeholder split editor loads projects and stakeholders as select options, displays names where available, and submits IDs.

### Task 2: Add Red Frontend Test

**Files:**
- Modify: `frontend/src/features/entities/EntityEditPage.test.tsx`

- [ ] **Step 1: Update create split test**

Mock `/projects?pageSize=100` and `/stakeholders?pageSize=100`, assert the controls are `<select>` elements, choose project and stakeholder labels, then assert the existing `PUT` payload still contains numeric IDs.

- [ ] **Step 2: Run focused test**

Run: `npm.cmd test -- EntityEditPage.test.tsx` from `frontend/`.

Expected: fails because the split editor still renders numeric inputs.

### Task 3: Implement Select Controls

**Files:**
- Modify: `frontend/src/features/entities/ProjectStakeholderSplitEditor.tsx`

- [ ] **Step 1: Load options**

Add `useQuery` calls for `/projects?pageSize=100` and `/stakeholders?pageSize=100`.

- [ ] **Step 2: Render project select**

Replace the project numeric input with a select. Use labels like `Project #77 - Maple Shelf` when the project includes `product.name`, and submit `77`.

- [ ] **Step 3: Render stakeholder select**

Replace stakeholder numeric inputs with selects. Use stakeholder names as labels and submit `idStakeholder`.

- [ ] **Step 4: Run focused test**

Run: `npm.cmd test -- EntityEditPage.test.tsx` from `frontend/`.

Expected: passes.

### Task 4: Verify And Ship

**Files:**
- All changed files

- [ ] **Step 1: Run frontend verification**

Run from `frontend/`: `npm.cmd test`, `npm.cmd run lint`, `npm.cmd run build`.

- [ ] **Step 2: Run backend sanity tests**

Run from `backend/`: `npm.cmd test`.

- [ ] **Step 3: Commit and push**

Stage only this change set, commit with `feat: use selectors for project stakeholder splits`, and push `main`.
