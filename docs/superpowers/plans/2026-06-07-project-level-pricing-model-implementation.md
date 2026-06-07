# Project-Level Pricing Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move pricing model ownership from products to projects, and make manual sales and sales imports select the product project that controls fee calculation.

**Architecture:** Add `project.id_model` and expose project models through Prisma/API reads. Keep legacy `product.id_model` in the database but remove it from product UI and backend requirements. Sales and import staged rows keep using `id_project`; model display and fee rules derive from `project.model`.

**Tech Stack:** NestJS, Prisma, MySQL migrations, Jest, React, Vite, React Testing Library, Ant Design.

---

## File Structure

- `backend/prisma/schema.prisma`: Add the project-to-model relation and remove the active-project unique field from the Prisma surface.
- `backend/prisma/migrations/20260607000000_move_model_to_project/migration.sql`: Add/backfill `project.id_model`, drop active uniqueness index and legacy `active_product_id`.
- `backend/src/projects/*`: Require `idModel`, include `model`, and stop enforcing active-project uniqueness.
- `backend/src/products/*`: Stop requiring `idModel` on product create while leaving legacy persistence compatible.
- `backend/src/sales/sale-fee-calculator.service.*`: Resolve model code from `project.model` and product fee amount from `product`.
- `backend/src/import-batches/*`: Validate/select projects from all product projects and persist selected stage project.
- `backend/src/reports/*`: Read sales report model from `sale.project.model`.
- `frontend/src/api/types.ts`: Add project model and import-stage project types.
- `frontend/src/features/entities/*`: Remove product model field, add project model field, filter/default sale project selection, and derive sales model from project.
- `frontend/src/features/imports/*`: Add staged-row project selector and commit completeness checks.
- `docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md`: Keep canonical design aligned if implementation details require wording updates.

## Task 1: Backend Project Model Schema And Service

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20260607000000_move_model_to_project/migration.sql`
- Modify: `backend/src/projects/dto/create-project.dto.ts`
- Modify: `backend/src/projects/projects.service.ts`
- Test: `backend/src/projects/projects.service.spec.ts`
- Test: `backend/src/projects/dto/project-dto-validation.spec.ts`

- [ ] **Step 1: Write failing project service and DTO tests**

Add tests that create projects with `idModel`, include `model` on reads, and allow two active projects for the same product.

- [ ] **Step 2: Run focused project tests to verify failure**

Run:

```powershell
cd backend
npm test -- projects.service.spec.ts project-dto-validation.spec.ts
```

Expected: FAIL because `idModel` is not required/persisted and active-project uniqueness is still enforced.

- [ ] **Step 3: Implement schema, migration, DTO, and service changes**

Add `idModel` to `Project`, add `model` relation, add `projects` to `PricingModel`, include model in project responses, remove `assertProductHasNoOtherActiveProject`, and stop writing `activeProductId`.

- [ ] **Step 4: Run project tests to verify pass**

Run:

```powershell
cd backend
npm test -- projects.service.spec.ts project-dto-validation.spec.ts
```

Expected: PASS.

## Task 2: Backend Product Legacy Model Removal

**Files:**
- Modify: `backend/src/products/dto/create-product.dto.ts`
- Modify: `backend/src/products/products.service.ts`
- Test: `backend/src/products/dto/product-dto-validation.spec.ts`
- Test: `backend/src/products/products.service.spec.ts`

- [ ] **Step 1: Write failing product tests**

Update tests so product create no longer requires `idModel` and product create data can omit the legacy field.

- [ ] **Step 2: Run focused product tests to verify failure**

Run:

```powershell
cd backend
npm test -- products.service.spec.ts product-dto-validation.spec.ts
```

Expected: FAIL because create DTO still requires `idModel`.

- [ ] **Step 3: Implement product DTO/service changes**

Make `idModel` optional in create DTO and preserve existing update semantics.

- [ ] **Step 4: Run product tests to verify pass**

Run:

```powershell
cd backend
npm test -- products.service.spec.ts product-dto-validation.spec.ts
```

Expected: PASS.

## Task 3: Backend Sales Fee And Reports

**Files:**
- Modify: `backend/src/sales/sale-fee-calculator.service.ts`
- Test: `backend/src/sales/sale-fee-calculator.service.spec.ts`
- Modify: `backend/src/reports/reports.service.ts`
- Test: `backend/src/reports/reports.service.spec.ts`

- [ ] **Step 1: Write failing fee/report tests**

Update fee tests so `project.findUnique` returns `{ model: { code } }` and product returns only `feeAmount`. Update sales report tests to expect `project.model.name`.

- [ ] **Step 2: Run focused tests to verify failure**

Run:

```powershell
cd backend
npm test -- sale-fee-calculator.service.spec.ts reports.service.spec.ts
```

Expected: FAIL because code still reads `product.model`.

- [ ] **Step 3: Implement fee/report changes**

Fetch project model by `idProject`; keep product lookup for `feeAmount`; report include becomes `{ product: true, project: { include: { model: true } } }`.

- [ ] **Step 4: Run focused tests to verify pass**

Run:

```powershell
cd backend
npm test -- sale-fee-calculator.service.spec.ts reports.service.spec.ts
```

Expected: PASS.

## Task 4: Backend Sales Import Project Selection

**Files:**
- Modify: `backend/src/import-batches/import-validator.service.ts`
- Test: `backend/src/import-batches/import-validator.service.spec.ts`
- Modify: `backend/src/import-batches/import-batches.service.ts`
- Test: `backend/src/import-batches/import-batches.service.spec.ts`
- Modify/Create: import-stage DTO/controller only if an edit endpoint is not already available.

- [ ] **Step 1: Write failing import tests**

Add tests for automatic project assignment with one project, row error with zero projects, row error requiring project selection with multiple projects, preserving a valid preselected project, and commit using selected project for fee calculation.

- [ ] **Step 2: Run focused import tests to verify failure**

Run:

```powershell
cd backend
npm test -- import-validator.service.spec.ts import-batches.service.spec.ts
```

Expected: FAIL because validation only uses active projects and cannot preserve selected staged projects.

- [ ] **Step 3: Implement import validation and stage update**

Select all product projects with models, preserve valid `idProject` from stage rows, set `idProject` when exactly one project exists, require selection when multiple exist, include stage `project` in reads, update `idProject` in validation application, and add a row-level stage update endpoint for UI project selection.

- [ ] **Step 4: Run focused import tests to verify pass**

Run:

```powershell
cd backend
npm test -- import-validator.service.spec.ts import-batches.service.spec.ts
```

Expected: PASS.

## Task 5: Frontend Entity Forms And Tables

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/features/entities/entityConfigs.ts`
- Modify: `frontend/src/features/entities/EntityEditPage.tsx`
- Modify: `frontend/src/components/EntityForm.tsx` if dynamic disabled select behavior needs field-level support.
- Test: `frontend/src/features/entities/EntityEditPage.test.tsx`
- Test: `frontend/src/features/entities/EntityListPage.test.tsx`

- [ ] **Step 1: Write failing frontend entity tests**

Update product tests to confirm no product model field, add project model select test, add sale tests for product-filtered project options, one-project auto-select/disabled behavior, and sales model derived from selected project.

- [ ] **Step 2: Run focused frontend tests to verify failure**

Run:

```powershell
cd frontend
npm test -- EntityEditPage.test.tsx EntityListPage.test.tsx
```

Expected: FAIL because product forms still require model and sales still use active project behavior.

- [ ] **Step 3: Implement entity UI changes**

Remove product model field/column, add project model column/field, calculate sale fee from selected project model, filter project options by selected product, and disable project select only when the selected product has exactly one project.

- [ ] **Step 4: Run focused frontend tests to verify pass**

Run:

```powershell
cd frontend
npm test -- EntityEditPage.test.tsx EntityListPage.test.tsx
```

Expected: PASS.

## Task 6: Frontend Sales Import Project Selection

**Files:**
- Modify: `frontend/src/features/imports/SalesImportPage.tsx`
- Test: `frontend/src/features/imports/SalesImportPage.test.tsx`
- Modify: `frontend/src/api/types.ts`

- [ ] **Step 1: Write failing import UI tests**

Add tests that staged rows render selected project, show a selector for rows with multiple projects, PATCH the selected project, and block commit while project is missing.

- [ ] **Step 2: Run focused import UI tests to verify failure**

Run:

```powershell
cd frontend
npm test -- SalesImportPage.test.tsx
```

Expected: FAIL because staged row project selection is not rendered.

- [ ] **Step 3: Implement import UI changes**

Load/select project data from stage row response, add the project column, PATCH row project selection, refresh batch/stage/errors after selection, and require `idProject` in completeness checks.

- [ ] **Step 4: Run focused import UI tests to verify pass**

Run:

```powershell
cd frontend
npm test -- SalesImportPage.test.tsx
```

Expected: PASS.

## Task 7: Verification And Delivery

**Files:**
- Review all modified files.

- [ ] **Step 1: Run backend verification**

Run:

```powershell
cd backend
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 2: Run frontend verification**

Run:

```powershell
cd frontend
npm test
npm run build
```

Expected: PASS.

- [ ] **Step 3: Run Prisma validation**

Run:

```powershell
cd backend
npx prisma validate
```

Expected: PASS.

- [ ] **Step 4: Commit and push**

Run:

```powershell
git status --short
git add docs backend frontend
git commit -m "Move pricing model selection to projects"
git push
```

Expected: Commit and push succeed. Leave unrelated untracked files untouched.

