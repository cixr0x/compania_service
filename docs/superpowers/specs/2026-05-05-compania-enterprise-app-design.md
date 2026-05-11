# Compania Enterprise Application Design

## Purpose

This application manages products, stakeholders, projects, and sales for batch product purchases where costs and future profit calculations may be split across stakeholders. The first version is an internal single-user web application with separate frontend and backend projects in the same repository.

The MVP focuses on entity CRUD screens, a staged CSV/XLSX sales import workflow, and an initial sales summary report. Authentication, authorization, and broader reporting are intentionally deferred.

## Technology Stack

- Backend: NestJS, TypeScript, REST services, MySQL, Prisma ORM, class-validator DTO validation.
- Frontend: React, TypeScript, Vite, React Router, Ant Design, a shared REST API client, reusable table and form components.
- Database: MySQL with migration-managed schema.
- Repository layout: `backend/` and `frontend/` as separate projects under this repository.

NestJS is selected because the application is expected to grow. Its module system, dependency injection, validation pipeline, interceptors, guards, and testing patterns provide a stronger long-term structure than a minimal Express application.

## MVP Scope

Included:

- CRUD REST APIs for products, pricing models, projects, stakeholders, project stakeholder splits, and sales.
- Table view for the user-facing entities. Project stakeholder splits are managed from the project form instead of a standalone navigation item.
- Create button in the table toolbar beside search on each table view.
- Double-click row navigation to an update form for that entity.
- CSV/XLSX sales import into staging tables.
- Import review screen where the user selects source and import date, checks imported descriptions against matched products, reviews validation errors, and commits validated rows to final sales.
- Sales summary report by year or month.
- Gitignored environment credential files with example templates.

Deferred:

- Authentication and roles.
- Additional reports and dashboards.
- Additional profit allocation workflows.
- Source-specific scheduled or automated imports.

## Business Concepts

A product is the item being purchased and sold. Products have multiple external identifiers because each sales source may use a different ID for the same product.

A model is a pricing model assigned to products.

A project is a batch purchase of one product. It stores the purchased units and unit cost. Project cost is tracked through project transaction rows, and the total project cost is derived as the sum of those transaction amounts; it is displayed in project screens but is not stored as a separate database field. Several stakeholders can participate in a project. A project can be active or inactive; at most one project can be active for the same product at any time.

A stakeholder is a person or organization participating in one or more projects.

A project stakeholder split relates a stakeholder to a project and defines that stakeholder's percentage participation in the project. The percentages for a project must total exactly `100`.

A sale is a committed sales record for a product and the project that generated the sale. Sales records are created manually through CRUD or by committing a staged import batch.

Application settings store configurable values by unique code. Settings are exposed as a normal CRUD entity so future business logic can look up configurable parameters without new schema changes.

`product.ownership` is the product owner's retained profit percentage for that product. It is independent from project stakeholder participation and is stored now for future profit calculations.

## Data Model

### product

- `id`: primary key.
- `name`: required text.
- `description`: text.
- `image`: URL text.
- `id_ecommerce`: external product ID used by ecommerce imports.
- `id_store`: external product ID used by store imports.
- `id_event`: external product ID used by event imports.
- `id_surface`: external product ID used by surface imports.
- `id_model`: foreign key to `model`.
- `ownership`: numeric percentage retained by the product owner for future profit calculations.
- `fee_amount`: optional numeric fee amount used by products with the `consigna` pricing model.
- `tag`: text.

### model

- `id_model`: primary key.
- `code`: optional unique code for stable pricing model identification.
- `name`: required text.
- `description`: text.

### project

- `id_project`: primary key.
- `id_product`: foreign key to `product`.
- `units`: numeric quantity.
- `unit_cost`: numeric cost per unit.
- `production_cost`: legacy numeric production cost retained in the table for now but no longer edited by the UI or used for total project cost calculations.
- `admin_cost`: legacy numeric administrative cost retained in the table for now but no longer edited by the UI or used for total project cost calculations.
- `cost_adjustment`: legacy signed numeric adjustment retained in the table for now but no longer edited by the UI or used for total project cost calculations.
- `adjustment_description`: legacy optional adjustment text retained in the table for now.
- `is_active`: boolean flag indicating whether this is the current active project for the product.
- `active_product_id`: internal nullable unique key maintained by the backend to enforce that only one active project can exist for a product.

Derived values:

- `total_project_cost`: displayed-only value calculated as the sum of the project's `project_transactions.amount` rows.

### project_transactions

- `id_project_transaction`: primary key.
- `project_id`: foreign key to `project`.
- `date`: required transaction date.
- `amount`: signed numeric transaction amount. Positive values increase project cost and negative values reduce it.
- `description`: required text describing the cost transaction.

Rules:

- Project transactions are managed as detail lines inside the project create/edit form.
- The project transaction replacement endpoint atomically replaces all cost transaction lines for one project.
- Existing project total cost calculations, including sale fee and stakeholder project reporting, use only the sum of project transactions.

### stakeholder

- `id_stakeholder`: primary key.
- `name`: required text.

### project_stakeholder

- `id_project_stakeholder`: primary key.
- `id_project`: foreign key to `project`.
- `id_stakeholder`: foreign key to `stakeholder`.
- `stake_percentage`: numeric percentage.

Rules:

- `id_project` is required.
- The pair `id_project + id_stakeholder` must be unique.
- Each `stake_percentage` must be greater than `0` and less than or equal to `100`.
- The sum of all stakeholder percentages for one project must equal exactly `100`.
- Row-by-row project stakeholder writes are accepted only when the resulting project split still totals exactly `100`; clients should use the batch replacement endpoint for multi-row split edits. The MVP frontend manages project stakeholder splits as detail lines inside the project create/edit form and saves through that replacement endpoint.

### stakeholder_project_transaction

- `id_stakeholder_project_transaction`: primary key.
- `id_project`: part of a composite foreign key to `project_stakeholder`.
- `id_stakeholder`: part of a composite foreign key to `project_stakeholder`.
- `date`: required transaction date.
- `description`: required text describing the stakeholder/project transaction.
- `amount`: signed numeric transaction amount.

Rules:

- Transactions can only be recorded for a stakeholder assigned to the selected project.
- The project/stakeholder transaction replacement endpoint atomically replaces all transaction lines for one project/stakeholder pair.
- These rows are persisted and displayed in the stakeholder projects report detail section. Their signed amount sum is the stakeholder's recorded investment for the selected project.

### sales

- `id_sale`: primary key.
- `date`: timestamp. For staged imports this is the user-selected import date.
- `id_product`: foreign key to `product`.
- `id_project`: required foreign key to `project`; the project must belong to the selected product.
- `quantity`: integer.
- `amount`: numeric sale amount.
- `source`: text value selected by the user during import.
- `fee`: numeric fee calculated from the product's pricing model unless the sale has fee override enabled.
- `fee_override`: boolean flag. Defaults to `false`; when `true`, the manually entered `fee` is preserved and automatic fee recalculation is skipped.
- `profit`: numeric stored profit, calculated as `amount - fee`.
- `owner_profit`: numeric stored owner profit, calculated as `profit * product.ownership / 100`.

Sale fee calculation is centralized in the backend so each pricing model can own its business rule. Current model-code rules are:

- `consigna256`: `25%` of sale amount.
- `ladrillo`: `15%` of sale amount plus `2.5%` of the linked project total cost. Project total cost is the sum of linked project transaction amounts.
- `interno`: `10%` of sale amount.
- `consigna`: `quantity * product.fee_amount`.

### settings

- `id`: primary key.
- `code`: unique text code for stable lookup.
- `name`: display name.
- `description`: optional text description.
- `value`: text value.

Known settings are application-specific key/value entries. No tax setting is used by sales calculations.

### import_batch

One row per uploaded file import attempt.

- `id_import_batch`: primary key.
- `source`: required source selected by the user.
- `import_date`: user-selected date used for committed `sales.date`.
- `original_filename`: uploaded file name.
- `status`: one of `uploaded`, `validated`, `has_errors`, `committed`, or `cancelled`.
- `created_at`: timestamp.
- `updated_at`: timestamp.
- `committed_at`: nullable timestamp.

### import_stage

Normalized staged rows parsed from CSV/XLSX before they become final sales.

- `id_import_stage`: primary key.
- `id_import_batch`: foreign key to `import_batch`.
- `row_number`: original spreadsheet row number.
- `external_product_id`: imported product ID.
- `imported_product_description`: product description from the file.
- `id_product`: nullable foreign key to matched `product`.
- `quantity`: parsed integer quantity.
- `amount`: parsed numeric sale amount.
- `raw_row`: JSON representation of the imported row.
- `created_at`: timestamp.

The imported files for the MVP contain only external product ID, quantity, amount, and product description.

### import_error

Validation errors for an import batch and optionally a specific staged row.

- `id_import_error`: primary key.
- `id_import_batch`: foreign key to `import_batch`.
- `id_import_stage`: nullable foreign key to `import_stage`.
- `row_number`: nullable original spreadsheet row number.
- `field`: nullable field name.
- `message`: human-readable error.
- `created_at`: timestamp.

## Import Workflow

1. User opens the sales import screen.
2. User selects a required source: `ecommerce`, `store`, `event`, or `surface`.
3. User uploads a CSV/XLSX file.
4. Backend creates an `import_batch` and parses file rows into `import_stage`.
5. Backend matches `external_product_id` to the source-specific product ID field:
   - `ecommerce` uses `product.id_ecommerce`.
   - `store` uses `product.id_store`.
   - `event` uses `product.id_event`.
   - `surface` uses `product.id_surface`.
6. Backend validates all staged rows and stores `import_error` rows for invalid data.
7. Backend requires each matched product to have an active project.
8. Frontend shows staged rows with imported product description and matched product name side by side.
9. User selects or edits the import date before commit.
10. User reviews validation errors and product matches.
11. User clicks commit.
12. Backend revalidates the entire batch inside a transaction.
13. If any error remains, no sales rows are inserted and errors remain visible.
14. If the batch is valid, backend inserts all staged rows into `sales`, stamps `source`, stamps the selected import date into `sales.date`, links `sales.id_project` to the matched product's active project, calculates `fee` from the matched product's pricing model, sets `fee_override` to `false`, calculates stored `profit` and `owner_profit`, and marks the batch as `committed`.

The final `sales` table should only contain committed, validated data.

## Sales Summary Report

The first report is a sales summary table grouped by product and project. If the same product has sales linked to multiple projects, each project appears as a separate row. The first column is `Project ID`; the product column contains only the product name.

The report supports yearly and monthly timeframes. The backend exposes the years and months that have sales data, and the frontend lets the user choose from those available periods. Selecting only a year returns a yearly report; selecting a year and month returns a monthly report.

Columns:

- `Project ID`
- `Product`
- Source groups for `Store`, `Ecommerce`, and `Event`, each with `Quantity` and `Amount`
- `Surface` source group only when the selected report period contains surface sales
- `Total Quantity`
- `Total Amount`
- `Model`
- `Fee`
- `Profit`
- `Owner Profit`

Calculations:

- Source quantity and amount are summed from `sales.quantity` and `sales.amount` for each source.
- `Total Quantity` and `Total Amount` are summed across all sources for the row.
- `Fee` is summed from `sales.fee`.
- `Profit` is summed from `sales.profit`.
- `Owner Profit` is summed from `sales.owner_profit`.

## REST API Design

The backend exposes JSON REST services under `/api`.

CRUD resources:

- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- Equivalent CRUD endpoints for `models`, `projects`, `stakeholders`, `project-stakeholders`, `sales`, and `settings`.
- `GET /api/stakeholders/:id` includes the stakeholder's project participation with project and product details for the stakeholder edit form.
- `GET /api/project-stakeholders/projects/:id`: list the complete stakeholder split for one project.
- `PUT /api/project-stakeholders/projects/:id`: atomically replace a project's full stakeholder split with either an empty array or an array of `{ idStakeholder, stakePercentage }` rows totaling exactly `100`.
- `GET /api/project-transactions/projects/:id`: list the complete project cost transaction set for one project.
- `PUT /api/project-transactions/projects/:id`: atomically replace a project's full cost transaction set with an array of `{ date, amount, description }` rows.
- `GET /api/stakeholder-project-transactions/projects/:projectId/stakeholders/:stakeholderId`: list transaction rows for one project/stakeholder pair.
- `PUT /api/stakeholder-project-transactions/projects/:projectId/stakeholders/:stakeholderId`: atomically replace transaction rows for one project/stakeholder pair with an array of `{ date, amount, description }` rows.

Report resources:

- `GET /api/reports/sales-summary/periods`: list years and months with available sales data.
- `GET /api/reports/sales-summary?year=YYYY`: get a yearly sales summary grouped by product and project.
- `GET /api/reports/sales-summary?year=YYYY&month=M`: get a monthly sales summary grouped by product and project.
- `GET /api/reports/stakeholder-projects?projectId=ID&stakeholderId=ID`: get the all-time stakeholder project report for one project and one stakeholder, including product totals, source totals, project progress, and that stakeholder's recorded investment, entitled income, and balance. The response must not include other stakeholders on the project.

Import resources:

- `POST /api/import-batches`: create a batch by uploading a CSV/XLSX file with selected source.
- `GET /api/import-batches`: list import batches.
- `GET /api/import-batches/:id`: get batch metadata.
- `PATCH /api/import-batches/:id`: update source or import date before commit.
- `GET /api/import-batches/:id/stage`: list staged rows with matched product names.
- `GET /api/import-batches/:id/errors`: list validation errors.
- `POST /api/import-batches/:id/validate`: revalidate staged rows.
- `POST /api/import-batches/:id/commit`: transactionally commit valid staged rows to `sales`.
- `POST /api/import-batches/:id/cancel`: cancel an uncommitted batch.

## Frontend Design

The frontend is an internal admin-style application. It should prioritize dense, readable tables and predictable forms over marketing-style presentation.

The UI design system is Ant Design. Frontend work should use Ant Design components, layout primitives, feedback components, and design tokens by default, with custom CSS limited to application-specific composition and small spacing/layout adjustments. Future UI development should follow Ant Design's enterprise design values of Natural, Certain, Meaningful, and Growing, and use its design patterns for feedback, data entry, data display, navigation, buttons, copywriting, and data formatting.

The operational frontend has migrated to Ant Design for its primary controls, forms, tables, import workflow, and report screens. Entity CRUD screens use Ant Design form controls, buttons, alerts, images, tables, pop confirmations, loading states, and empty states. Project stakeholder split editing uses Ant Design table, select, numeric input, tags, alerts, and actions. Sales import screens use Ant Design select, upload, steps, buttons, alerts, lists, tags, spinner, and staged-row table. Sales report screens use Ant Design selectors, feedback, empty state, spinner, and grouped report table columns.

Ant Design application rules for this project:

- Keep interactions natural and low-friction by matching user tasks to clear controls and reducing extra operations.
- Maintain certainty through consistent components, spacing, table behavior, labels, and feedback patterns.
- Keep screens meaningful by emphasizing the user's work mission, clear goals, and immediate operation results.
- Design for growth by favoring reusable modules and discoverable workflows over one-off custom UI.
- Use Ant Design `Table` for structured operational data, with search/filtering, sorting, pagination, loading, and empty states where useful.
- Use Ant Design data-entry components for forms and keep labels, validation, and formatting close to the relevant field. Do not render per-field helper descriptions unless a future requirement explicitly asks for them.
- Use Ant Design feedback components such as `Alert`, `Message`, `Notification`, `Spin`, `Modal`, and `Popconfirm` according to feedback severity.
- On mobile, use a controlled navigation drawer rather than the zero-width collapsed sider trigger so the app header does not overlap navigation controls.
- Shared entity tables should keep compact enterprise readability: right-align numeric and money values, format date-like values, display booleans as tags, provide horizontal scrolling for wide data, and include a visible edit action while preserving double-click navigation.
- Wide reports, including the sales report, should use Ant Design table horizontal scrolling with stable column widths instead of allowing tables to spill outside the page panel.

Main navigation is grouped into sections:

- Admin: Models, Settings.
- Catalog: Products, Projects, Stakeholders, Sales, Sales Imports.
- Reports: Sales Report, Stakeholder Projects.

Entity pages:

- Table view with sortable visible columns and a text filter for searchable fields.
- Create button in the table toolbar beside search, using Ant Design primary button styling.
- Double-click table row navigates to edit form; table rows also expose a visible Edit action for discoverability.
- Entity table columns backed by foreign keys display the related entity name/label rather than the raw foreign key ID. Primary key ID columns may still display IDs.
- Table cells that display a product name show a small product image thumbnail to the left of the name when the product has an image URL.
- Product list tables include Fee Amount as money, populated for products whose model code is `consigna`.
- Forms use backend validation responses for field-level error display. Form pages do not use the old Workspace eyebrow row; navigation back to the list is provided by a Cancel button beside Save.
- Product create/edit forms load pricing models and show model names in the model selector while submitting the selected model ID to the API.
- Product creation requires a pricing model and shows a live image preview beside the product name, refreshed from the Image URL field as the user edits it.
- Product create/edit forms show the Fee Amount money field only when the selected pricing model has code `consigna`.
- Project create/edit forms load products and show product names in the product selector while submitting the selected product ID to the API.
- Project create/edit forms include an active flag plus unit cost. Project cost is managed in a Project Cost Transactions detail section with a compact static table. Rows display date, amount, and description. Rows become editable only after selecting the row Edit action; editable rows expose Save and Cancel actions for that row. New transaction rows are added in edit mode, and project-level saving is blocked until all transaction row edits are saved or canceled. The fixed production cost, administrative cost, cost adjustment, and adjustment description fields remain in the database for now but are not exposed in the form.
- Project create/edit forms display a read-only total cost field derived from the sum of project cost transaction rows, updated immediately as transaction amounts change.
- Project table views display the same transaction-derived total cost with money formatting. Legacy fixed production, admin, and adjustment cost columns are not shown in the table view.
- Project create/edit forms include a Stakeholder Split detail section. The section loads stakeholders by name and uses a compact static table by default. Rows become editable only after selecting the row Edit action; editable rows expose Save and Cancel actions for that row. New stakeholder rows are added in edit mode, project-level saving is blocked until all stakeholder row edits are saved or canceled, complete rows must total exactly `100` when lines are present, and removing all rows saves an empty split.
- Project stakeholder splits are not exposed as a standalone primary navigation item in the MVP UI.
- Stakeholder edit forms show the projects where the stakeholder participates, including the project label and stake percentage.
- Sale create/edit forms load products and projects, show readable option labels, and submit the selected product and project IDs to the API. The Product field is user-editable; the Model field is read-only and displays the selected product's pricing model; the Project field is read-only and is automatically assigned to the selected product's active project whenever Product changes. If the selected product has no active project, Project remains empty and the required-field validation blocks saving. The backend rejects a manual sale if the submitted project does not belong to the submitted product.
- Foreign key fields in create/edit forms should be selectors backed by the related entity list, not open numeric inputs.
- Money fields in tables and import review screens should display with a dollar prefix, comma grouping, and two decimals, for example `$1,000,000.00`. Editable money fields may accept comma separators and submit numeric values to the API.
- Optional text fields preserve empty strings on update. A cleared optional text field must be submitted and saved as `""`; fields that are truly omitted from a PATCH payload remain unchanged.
- The sales CRUD table displays profit and owner profit as money columns. Sales create/edit forms calculate fee from the selected product's pricing model and linked project, keep the Fee field read-only by default, and expose an `Override Fee` checkbox that enables manual fee editing and stops fee autocalculation. The same form displays read-only profit as `amount - fee` and owner profit as `profit * product.ownership / 100`; profit and owner profit are computed, persisted values. Tax is not tracked by the system.

Sales import page:

- Source selector.
- Import date selector.
- File upload.
- Validation summary.
- Staged row table with row number, external product ID, imported product description, matched product name, quantity, amount, and status.
- Error panel for import errors.
- Commit button enabled only when required metadata is present and the batch has no validation errors.

Sales report page:

- Year selector populated from report periods that have sales data.
- Month selector populated with months that have sales data for the selected year, plus a full-year option.
- Year and month selectors are displayed together in the same filter row without an extra report category header above the page title.
- Report table with grouped source headers, using `Quantity` and `Amount` under each source group.
- `Surface` source group hidden unless the selected period has surface sales.
- Profit is read from the persisted sales profit values, calculated at sale write time as amount minus fee; total cost and income are not displayed in the sales report.
- Money cells displayed with a dollar prefix, comma grouping, and two decimals.

Stakeholder projects report page:

- All-time report scoped by required Project and Stakeholder selectors. The report does not load until both selectors have values.
- Stakeholder options are constrained to stakeholders assigned to the selected project.
- The report is intended to be presented to the selected stakeholder, so it must not render or receive data for any other stakeholder in the selected project.
- The product name is the project section header and project ID is displayed beside it.
- Source totals show units sold and amount for each source; `Surface` remains hidden unless at least one project in the report has surface sales.
- Project summary displays total units sold, units left, total sales, total fees, net sales total, calculated cost, profit, and project progress.
- Project total cost is the sum of project cost transactions. Unit price is project total cost divided by project total units.
- Calculated cost is units sold multiplied by unit price. Profit is net sales total minus calculated cost. Project progress is units sold divided by total project units.
- Stakeholder information is presented as a header/detail section. The header displays stakeholder name, stake percentage, recorded investment, entitled income, and balance. Recorded investment is the signed sum of the selected project/stakeholder transaction rows. Entitled income is calculated cost multiplied by stake percentage plus profit multiplied by stake percentage. Balance is recorded investment plus entitled income.
- The detail section displays persisted stakeholder/project transaction rows from `stakeholder_project_transaction` in a compact static table. Rows become editable only after selecting the row Edit action; editable rows expose Save and Cancel actions for that row. New rows are added in edit mode, and row Save or Remove persists the full replacement list for the selected project/stakeholder pair.

Known intentional custom UI areas and UI debt:

- `SalesImportPage` wraps a native `input type="date"` in Ant Design `Form.Item` instead of using an Ant Design date picker. This preserves the current string date flow and browser date semantics, but remains UI debt if the project later standardizes all date entry on Ant Design date components.

## Validation And Error Handling

Backend validation is the source of truth. The frontend mirrors obvious required fields and numeric constraints for usability, but backend services enforce all rules.

Expected validation rules:

- Required names for products, models, and stakeholders.
- Valid numeric values for units, project transaction amounts, costs, percentages, quantity, amount, and ownership.
- Stakeholder/project transactions require a valid date, a description, and a numeric amount.
- At most one project can be active for a given product at any time.
- Project stakeholder totals must equal exactly `100` per project.
- Import source is required.
- Import date is required before commit.
- Import rows require external product ID, quantity, amount, and imported product description.
- Import rows must match an existing product through the selected source's external ID field.
- Import rows must match a product with an active project.
- Sales require a project; manual sales validate that the selected project belongs to the selected product, and import commits use the matched product's active project.
- Import commit revalidates staged rows inside the commit transaction before inserting `sales`; if revalidation fails, refreshed validation errors and `has_errors` status remain visible and no sales rows are inserted.

Errors should be returned in a structured JSON shape containing field, message, and optional row number for import errors.

## Testing Strategy

Backend tests:

- Unit tests for services that validate stakeholder percentage totals.
- Unit tests for source-specific product matching.
- Unit tests for staged import parsing and validation.
- Integration tests for import commit transaction behavior.
- Unit tests for sales summary period discovery and product-project report aggregation.
- Controller tests for CRUD validation responses.

Frontend tests:

- Component tests for reusable tables and forms.
- Import page tests for displaying matched product name beside imported product description.
- Import page tests for disabled commit button when metadata or validation is incomplete.
- Sales report page tests for period selectors, grouped source headers, project ID column, and dynamic surface source visibility.
- Project form tests for transaction-line cost editing and transaction-derived total cost updates.

End-to-end tests should be added once the MVP screens are stable enough to avoid brittle early tests.

## Environment And Credentials

Database credentials must not be committed. The repository should include example environment files and gitignore real local credential files.

Backend example variables:

- `DATABASE_URL`
- `MYSQL_HOST`
- `MYSQL_PORT`
- `MYSQL_DATABASE`
- `MYSQL_USER`
- `MYSQL_PASSWORD`
- `PORT`
- `CORS_ORIGIN`

Frontend example variables:

- `VITE_API_BASE_URL`

## Documentation Maintenance

This file is the canonical project design document. Design changes should update this document in the same change set as the related implementation.

## Open Decisions

No blocking open decisions remain for the MVP design. Additional reports, auth, and profit allocation are intentionally future work.
