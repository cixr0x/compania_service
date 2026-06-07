# Project-Level Pricing Model Architecture Design

## Purpose

The application will move pricing model ownership from products to projects. A product may have many projects, and each project will define the pricing model that applies to sales linked to that project. This avoids creating a separate product-model association because project selection already represents the concrete batch being sold.

## Scope

Included:

- Add a pricing model reference to projects.
- Backfill existing projects to model code `ladrillo`.
- Remove the product pricing model requirement from product create/edit behavior.
- Make sales and sales imports select a project for the matched product.
- Use the selected project's pricing model for fee calculations and sales report model display.
- Remove enforcement that only one active project can exist for a product.

Deferred:

- Model-specific project fields.
- Removing legacy `product.id_model` from the database.
- Any new authentication or reporting concepts.

## Data Model

### project

Add:

- `id_model`: required foreign key to `model.id_model`.

Rules:

- Every project has exactly one pricing model.
- Existing projects are backfilled to the model whose `code` is `ladrillo`.
- Project create/edit forms require a model selection.
- Project list and detail responses include the linked model.

### product

The existing `product.id_model` column remains in the table for now, but it is legacy data after this change.

Rules:

- Product create/edit no longer requires or edits `id_model`.
- Product responses may still expose the legacy model relation while older code is being removed, but business logic must not use it.
- `fee_amount` remains on the product because the current `consigna` fee rule needs a product-level amount.

### sale

The sale schema keeps `id_project` as the selected project reference. A sale does not need its own `id_model` because the model is derived from `sale.project.id_model`.

Rules:

- Every sale must have a project.
- The selected project must belong to the selected product.
- Manual sale creation and updates use the selected project's model for fee calculation.
- Persisted `fee`, `profit`, and `owner_profit` continue to be stored on the sale.

### import_stage

The staged import schema keeps `id_project` as the selected project reference. It does not need its own `id_model`.

Rules:

- Every committed stage row must have a product and a project.
- The selected project must belong to the matched product.
- The selected project's model is used for fee calculation during commit.

## Backend Behavior

### Projects

- Add `idModel` to project DTOs.
- Validate that the submitted model exists.
- Include `model` in project reads.
- Remove the active-project uniqueness validation and any write logic that maintains an internal unique active-project key.
- Keep `is_active` as ordinary project metadata.

### Sales

- Sales create/update continues validating that `idProject` belongs to `idProduct`.
- Fee calculation receives the selected project and resolves its model.
- If the project has no model, the backend rejects the sale because project model is required.
- The read-only sales model shown in the UI comes from `sale.project.model`.

### Fee Calculation

Fee rules are selected from the model code of the linked project:

- `consigna256`: `25%` of sale amount.
- `ladrillo`: `18%` of sale amount.
- `interno`: `10%` of sale amount.
- `consigna`: `quantity * product.fee_amount`.

The `consigna` rule must reject or fail validation if the product has no usable `fee_amount`.

### Sales Import

- Import validation matches the external product ID to a product as it does today.
- Validation then finds all projects for the matched product.
- If exactly one project exists, it is assigned to the stage row by default.
- If multiple projects exist, the stage row remains uncommittable until the user selects one.
- If no project exists, validation returns a row error.
- Commit revalidates the selected project belongs to the product and uses that project's model for fee and profit calculations.

## Frontend Behavior

### Products

- Remove the Model field from product forms.
- Remove the Model column from product tables or mark it as legacy if still returned by the API.
- Keep `fee_amount` available because it supports the `consigna` rule. Since product no longer has a model, this field should be shown as an optional product field for now.

### Projects

- Add a required Model select to project create/edit forms.
- Project tables display the model name or code instead of the model ID.
- Project cost transaction and stakeholder split detail sections are shown only when the selected project model code is `ladrillo`. When another model is selected, those sections are hidden and their row validation/submission restrictions are not applied.

### Sales

- Product remains the first selector.
- Project selector is filtered to projects belonging to the selected product.
- If one project exists for the selected product, the UI selects it automatically and disables project editing.
- If multiple projects exist, the user must select a project.
- The Model field is read-only and displays the selected project's model.
- Fee autocalculation uses the selected project's model.

### Sales Import

- Add a Project column to staged rows.
- For rows with one available project, show the selected project.
- For rows with multiple available projects, show a project selector.
- Revalidation or commit must block rows without a project.
- The staged row should still show imported product description and matched product name so the user can verify product matching.

## Reports

Sales report rows already group by project and product. That grouping remains correct because project now carries the pricing model. The report model column should read from `sale.project.model`, not `sale.product.model`.

Stakeholder project reports continue selecting one project and one stakeholder. Project model is not directly displayed unless a future report requires it.

## Migration

The database migration should:

1. Add nullable `project.id_model`.
2. Find the model with `code = 'ladrillo'`.
3. Backfill all existing projects to that model.
4. Make `project.id_model` required if the database supports doing so safely after the backfill.
5. Add the foreign key from project to model.
6. Remove or disable the database-level mechanism that enforces one active project per product.

If no `ladrillo` model exists, the migration should fail clearly rather than assigning an arbitrary model.

## Testing

Backend tests should cover:

- Project create/update requires and persists `idModel`.
- Existing active project uniqueness validation is removed.
- Sale fee calculation uses the selected project's model.
- Sale create/update rejects projects that do not belong to the selected product.
- Import validation defaults the project when exactly one product project exists.
- Import validation requires project selection when multiple projects exist.
- Import commit calculates fees from the selected project's model.
- Sales reports read the model from `sale.project.model`.

Frontend tests should cover:

- Product forms no longer require a model.
- Project forms require a model and display model names.
- Sales project options filter by selected product.
- Sales project auto-selects and disables when only one project exists.
- Sales model display follows the selected project.
- Sales import rows show project selection only when needed.
