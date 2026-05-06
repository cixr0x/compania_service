# Ant Design Full Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the frontend migration from custom controls to Ant Design components across entity forms, project stakeholder lines, imports, reports, shared table behavior, CSS, and stale dependencies.

**Architecture:** Keep the existing React/Vite route structure and REST API client. Migrate UI slices incrementally so each screen remains functional after every task, using Ant Design as the default component system and retaining custom CSS only for application layout and narrow composition needs.

**Tech Stack:** React, TypeScript, Vite, React Router, TanStack Query, Ant Design, Ant Design Icons, Vitest, Testing Library.

---

## Coordination Rules

- Work sequentially, one fresh specialized agent per task.
- Each worker owns only the files listed in its task. If it needs another file, it must stop and report the reason.
- Each worker must write or update tests before production code, run the targeted test once to observe failure, then implement and make it pass.
- Each worker must run the targeted tests it changed. The coordinator runs full `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build` after integration.
- Workers must not edit `frontend/src/index.css` unless their task explicitly owns it.
- Workers must not edit `frontend/package.json` or `frontend/package-lock.json` unless their task explicitly owns dependency cleanup.
- Keep existing business behavior unchanged.

## File Ownership Map

- Shared form migration: `frontend/src/components/EntityForm.tsx`, `frontend/src/components/EntityForm.test.tsx`
- Entity edit/detail page migration: `frontend/src/features/entities/EntityEditPage.tsx`, `frontend/src/features/entities/EntityEditPage.test.tsx`
- Project stakeholder split migration: `frontend/src/features/entities/ProjectStakeholderLines.tsx`, `frontend/src/features/entities/ProjectStakeholderLines.test.tsx`
- Import workflow migration: `frontend/src/features/imports/SalesImportPage.tsx`, `frontend/src/features/imports/SalesImportPage.test.tsx`
- Sales report migration: `frontend/src/features/reports/SalesReportPage.tsx`, `frontend/src/features/reports/SalesReportPage.test.tsx`
- Shared table refinement: `frontend/src/components/DataTable.tsx`, `frontend/src/components/DataTable.test.tsx`, `frontend/src/features/entities/EntityListPage.test.tsx`
- CSS cleanup: `frontend/src/index.css`
- Dependency cleanup: `frontend/package.json`, `frontend/package-lock.json`
- Documentation update: `docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md`

## Task 1: EntityForm Ant Design Migration

**Files:**
- Modify: `frontend/src/components/EntityForm.tsx`
- Create: `frontend/src/components/EntityForm.test.tsx`

**Requirements:**
- Use Ant Design `Form`, `Form.Item`, `Input`, `Input.TextArea`, `InputNumber`, `Select`, `Checkbox`, `Button`, `Alert`, `Image`, and `Typography` where appropriate.
- Preserve the existing `EntityForm` public props and external state flow: `values`, `onChange`, `onSubmit`, `isCreate`, `isSaving`, `errorMessage`, and `children`.
- Preserve money formatting behavior: money values display comma formatted when blurred and raw/selectable while focused.
- Preserve image URL preview behavior.
- Preserve required-on-create visual and HTML/form validation behavior.
- Do not change API payload serialization; that remains owned by `EntityEditPage.tsx`.

**Steps:**
- [ ] Add `EntityForm.test.tsx` covering: save button loading state, error alert rendering, required select field rendering, money display formatting, and live image preview URL updates through rerender.
- [ ] Run `npm.cmd test -- EntityForm.test.tsx` and confirm the new Ant Design expectations fail against the current custom form.
- [ ] Replace custom form markup in `EntityForm.tsx` with Ant Design components while keeping the same props and callback signatures.
- [ ] Run `npm.cmd test -- EntityForm.test.tsx EntityEditPage.test.tsx`.
- [ ] Return changed files, test command output, and any follow-up risks.

## Task 2: EntityEditPage Ant Design Migration

**Files:**
- Modify: `frontend/src/features/entities/EntityEditPage.tsx`
- Modify: `frontend/src/features/entities/EntityEditPage.test.tsx`

**Requirements:**
- Use Ant Design `Typography`, `Button`, `Space`, `Spin`, `Alert`, `Result`, `Table`, `Popconfirm`, and `Card` only if a contained panel is truly needed.
- Convert the Back link to an Ant `Button` rendered through React Router `Link`.
- Convert delete to Ant `Popconfirm` + danger `Button`.
- Convert stakeholder project participation table to Ant `Table`.
- Preserve navigation after save/delete and all existing error behavior.
- Do not modify `EntityForm.tsx` or `ProjectStakeholderLines.tsx`.

**Steps:**
- [ ] Update tests to assert delete confirmation is required before deletion and stakeholder project participation uses a table with project and stake columns.
- [ ] Run `npm.cmd test -- EntityEditPage.test.tsx` and confirm the new delete confirmation expectation fails.
- [ ] Migrate page controls, loading/error states, delete action, and stakeholder project table to Ant Design.
- [ ] Run `npm.cmd test -- EntityEditPage.test.tsx`.
- [ ] Return changed files, test command output, and any follow-up risks.

## Task 3: ProjectStakeholderLines Ant Design Migration

**Files:**
- Modify: `frontend/src/features/entities/ProjectStakeholderLines.tsx`
- Create: `frontend/src/features/entities/ProjectStakeholderLines.test.tsx`

**Requirements:**
- Use Ant Design `Form`, `Select`, `InputNumber`, `Button`, `Alert`, `Tag`, `Space`, `Typography`, and either `Table` or `Form.List`.
- Preserve current validation contract passed to `onDraftChange`: rows are valid only when every row has stakeholder and percentage and total equals 100.
- Preserve add/remove behavior, including not removing the final remaining row.
- Preserve loading and query error behavior.
- Do not modify `EntityEditPage.tsx`.

**Steps:**
- [ ] Add tests for: initial empty state, adding a stakeholder row, validation error when total is not 100, valid payload when total equals 100, and remove button behavior.
- [ ] Run `npm.cmd test -- ProjectStakeholderLines.test.tsx` and confirm the new Ant Design control expectations fail where appropriate.
- [ ] Migrate the split editor to Ant Design controls.
- [ ] Run `npm.cmd test -- ProjectStakeholderLines.test.tsx EntityEditPage.test.tsx`.
- [ ] Return changed files, test command output, and any follow-up risks.

## Task 4: SalesImportPage Ant Design Migration

**Files:**
- Modify: `frontend/src/features/imports/SalesImportPage.tsx`
- Modify: `frontend/src/features/imports/SalesImportPage.test.tsx`

**Requirements:**
- Use Ant Design `Steps`, `Form`, `Select`, `DatePicker`, `Upload`, `Button`, `Alert`, `List`, `Table`, `Tag`, `Typography`, `Space`, and `Spin`.
- Preserve CSV/XLSX upload behavior with `FormData` field names `source` and `file`.
- Preserve source locking for active batches.
- Preserve validation and commit enablement rules.
- Preserve staged row columns: row, external ID, imported description, matched product, quantity, amount, status.
- Preserve import errors display and operation error display.

**Steps:**
- [ ] Update tests for Ant Design upload/date/source controls, stage table rows, error alert, and disabled commit until validated and error-free.
- [ ] Run `npm.cmd test -- SalesImportPage.test.tsx` and confirm new expectations fail against current custom markup.
- [ ] Migrate the import workflow UI to Ant Design components without changing API calls.
- [ ] Run `npm.cmd test -- SalesImportPage.test.tsx`.
- [ ] Return changed files, test command output, and any follow-up risks.

## Task 5: SalesReportPage Ant Design Migration

**Files:**
- Modify: `frontend/src/features/reports/SalesReportPage.tsx`
- Modify: `frontend/src/features/reports/SalesReportPage.test.tsx`

**Requirements:**
- Use Ant Design `Typography`, `Select`, `Table`, `Alert`, `Spin`, and `Empty`.
- Preserve year/month period selection behavior.
- Preserve dynamic source columns, including optional `surface` only when returned by the backend.
- Preserve grouped source headers where each source has `Quantity` and `Amount` child columns.
- Preserve money formatting for amount, fee, total cost, income, profit, and owner profit.

**Steps:**
- [ ] Update tests to assert grouped Ant Design report columns and period selectors.
- [ ] Run `npm.cmd test -- SalesReportPage.test.tsx` and confirm the new selector/table expectations fail against current markup.
- [ ] Migrate filters and report table to Ant Design components.
- [ ] Run `npm.cmd test -- SalesReportPage.test.tsx`.
- [ ] Return changed files, test command output, and any follow-up risks.

## Task 6: Shared DataTable Refinement

**Files:**
- Modify: `frontend/src/components/DataTable.tsx`
- Modify: `frontend/src/components/DataTable.test.tsx`
- Modify: `frontend/src/features/entities/EntityListPage.test.tsx`

**Requirements:**
- Use Ant Design `Table` native sorting instead of custom clickable header buttons.
- Preserve search behavior and row double-click navigation.
- Preserve money cell formatting and `-` empty display.
- Preserve pagination summary for more than 10 rows.
- Preserve keyboard Enter/Space row activation.

**Steps:**
- [ ] Update tests to assert sorting through Ant Design table headers or accessible column controls.
- [ ] Run `npm.cmd test -- DataTable.test.tsx EntityListPage.test.tsx` and confirm the current custom header expectations fail or need replacement.
- [ ] Replace custom sort buttons with Ant Design `sorter` definitions.
- [ ] Run `npm.cmd test -- DataTable.test.tsx EntityListPage.test.tsx`.
- [ ] Return changed files, test command output, and any follow-up risks.

## Task 7: CSS Cleanup

**Files:**
- Modify: `frontend/src/index.css`

**Requirements:**
- Remove obsolete custom control styles after Ant Design migrations.
- Keep only app shell, layout, brand, page composition, image preview, and narrow table/layout adjustments that Ant Design does not cover.
- Do not remove classes still referenced by TypeScript files.
- Do not introduce a one-note color palette; continue using Ant Design tokens and neutral enterprise styling.

**Steps:**
- [ ] Run `rg "className=|className={|className=\\\"" frontend/src` and list classes still referenced.
- [ ] Remove CSS blocks for classes that no longer appear in frontend source.
- [ ] Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.
- [ ] Return changed CSS blocks removed, verification output, and any classes intentionally retained.

## Task 8: Dependency Cleanup

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/package-lock.json`

**Requirements:**
- Remove `lucide-react` if no longer imported.
- Remove `@tanstack/react-table` if no longer imported.
- Keep `antd` and `@ant-design/icons`.
- Do not change application code in this task.

**Steps:**
- [ ] Run `rg "lucide-react|@tanstack/react-table" frontend/src frontend/package.json`.
- [ ] If imports exist in source, stop and report them. If imports only exist in package metadata, remove the unused packages with `npm.cmd uninstall lucide-react @tanstack/react-table`.
- [ ] Run `npm.cmd test`, `npm.cmd run lint`, and `npm.cmd run build`.
- [ ] Return package changes and verification output.

## Task 9: Documentation Update

**Files:**
- Modify: `docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md`

**Requirements:**
- Update the design doc to say the frontend has migrated operational controls/forms/tables/import/report screens to Ant Design.
- Document any remaining intentionally custom UI areas.
- Keep the existing Ant Design future-development principles.

**Steps:**
- [ ] Read the final frontend source after Tasks 1-8.
- [ ] Update the design doc with the completed migration scope and any known remaining UI debt.
- [ ] Run `git diff -- docs/superpowers/specs/2026-05-05-compania-enterprise-app-design.md`.
- [ ] Return changed documentation sections.

## Final Coordinator Verification

- [ ] Run `npm.cmd test` in `frontend/`.
- [ ] Run `npm.cmd run lint` in `frontend/`.
- [ ] Run `npm.cmd run build` in `frontend/`.
- [ ] Run browser smoke tests for: Products list, Product create/edit, Project create/edit with stakeholder lines, Sales import, Sales report.
- [ ] Commit and push the branch.

