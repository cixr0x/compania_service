# Compania Enterprise Application Design

## Purpose

This application manages products, stakeholders, projects, and sales for batch product purchases where costs and future profit calculations may be split across stakeholders. The first version is an internal single-user web application with separate frontend and backend projects in the same repository.

The MVP focuses on entity CRUD screens and a staged CSV/XLSX sales import workflow. Authentication, authorization, and reporting are intentionally deferred.

## Technology Stack

- Backend: NestJS, TypeScript, REST services, MySQL, Prisma ORM, class-validator DTO validation.
- Frontend: React, TypeScript, Vite, React Router, a shared REST API client, reusable table and form components.
- Database: MySQL with migration-managed schema.
- Repository layout: `backend/` and `frontend/` as separate projects under this repository.

NestJS is selected because the application is expected to grow. Its module system, dependency injection, validation pipeline, interceptors, guards, and testing patterns provide a stronger long-term structure than a minimal Express application.

## MVP Scope

Included:

- CRUD REST APIs for products, pricing models, projects, stakeholders, project stakeholder splits, and sales.
- Table view for each entity.
- Create button on each table view.
- Double-click row navigation to an update form for that entity.
- CSV/XLSX sales import into staging tables.
- Import review screen where the user selects source and import date, checks imported descriptions against matched products, reviews validation errors, and commits validated rows to final sales.
- Gitignored environment credential files with example templates.

Deferred:

- Authentication and roles.
- Reports and dashboards.
- Fee calculation logic.
- Profit allocation logic.
- Source-specific scheduled or automated imports.

## Business Concepts

A product is the item being purchased and sold. Products have multiple external identifiers because each sales source may use a different ID for the same product.

A model is a pricing model assigned to products.

A project is a batch purchase of one product. It stores the purchased units and costs, including unit, production, and administrative costs. Several stakeholders can participate in a project. A project can be active or inactive; at most one project can be active for the same product at any time.

A stakeholder is a person or organization participating in one or more projects.

A project stakeholder split relates a stakeholder to a project and defines that stakeholder's percentage participation in the project. The percentages for a project must total exactly `100`.

A sale is a committed sales record for a product. Sales records are created manually through CRUD or by committing a staged import batch.

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
- `tag`: text.

### model

- `id_model`: primary key.
- `name`: required text.
- `description`: text.

### project

- `id_project`: primary key.
- `id_product`: foreign key to `product`.
- `units`: numeric quantity.
- `unit_cost`: numeric cost per unit.
- `production_cost`: numeric production cost for the project.
- `admin_cost`: numeric administrative cost.
- `is_active`: boolean flag indicating whether this is the current active project for the product.
- `active_product_id`: internal nullable unique key maintained by the backend to enforce that only one active project can exist for a product.

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
- Row-by-row project stakeholder writes are accepted only when the resulting project split still totals exactly `100`; clients should use the batch replacement endpoint for multi-row split edits. The MVP frontend project-stakeholder create/edit form is a compact full-split editor that saves through that replacement endpoint.

### sales

- `id_sale`: primary key.
- `date`: timestamp. For staged imports this is the user-selected import date.
- `id_product`: foreign key to `product`.
- `quantity`: integer.
- `amount`: numeric sale amount.
- `source`: text value selected by the user during import.
- `fee`: numeric fee. Imported sales default to `0` until fee calculation logic is added later.

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
14. If the batch is valid, backend inserts all staged rows into `sales`, stamps `source`, stamps the selected import date into `sales.date`, sets `fee` to `0`, and marks the batch as `committed`.

The final `sales` table should only contain committed, validated data.

## REST API Design

The backend exposes JSON REST services under `/api`.

CRUD resources:

- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PATCH /api/products/:id`
- `DELETE /api/products/:id`
- Equivalent CRUD endpoints for `models`, `projects`, `stakeholders`, `project-stakeholders`, and `sales`.
- `GET /api/project-stakeholders/projects/:id`: list the complete stakeholder split for one project.
- `PUT /api/project-stakeholders/projects/:id`: atomically replace a project's full stakeholder split with an array of `{ idStakeholder, stakePercentage }` rows totaling exactly `100`.

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

Main navigation:

- Products
- Models
- Projects
- Stakeholders
- Project Stakeholders
- Sales
- Sales Imports

Entity pages:

- Table view with sortable visible columns and a text filter for searchable fields.
- Create button on the table view.
- Double-click table row navigates to edit form.
- Forms use backend validation responses for field-level error display.
- Product create/edit forms load pricing models and show model names in the model selector while submitting the selected model ID to the API.
- Product creation requires a pricing model and shows a live image preview beside the product name, refreshed from the Image URL field as the user edits it.
- Project create/edit forms load products and show product names in the product selector while submitting the selected product ID to the API.
- Project create/edit forms include an active flag plus unit cost, production cost, and administrative cost fields.

Sales import page:

- Source selector.
- Import date selector.
- File upload.
- Validation summary.
- Staged row table with row number, external product ID, imported product description, matched product name, quantity, amount, and status.
- Error panel for import errors.
- Commit button enabled only when required metadata is present and the batch has no validation errors.

## Validation And Error Handling

Backend validation is the source of truth. The frontend mirrors obvious required fields and numeric constraints for usability, but backend services enforce all rules.

Expected validation rules:

- Required names for products, models, and stakeholders.
- Valid numeric values for units, costs, percentages, quantity, amount, and ownership.
- At most one project can be active for a given product at any time.
- Project stakeholder totals must equal exactly `100` per project.
- Import source is required.
- Import date is required before commit.
- Import rows require external product ID, quantity, amount, and imported product description.
- Import rows must match an existing product through the selected source's external ID field.
- Import rows must match a product with an active project.
- Import commit revalidates staged rows inside the commit transaction before inserting `sales`; if revalidation fails, refreshed validation errors and `has_errors` status remain visible and no sales rows are inserted.

Errors should be returned in a structured JSON shape containing field, message, and optional row number for import errors.

## Testing Strategy

Backend tests:

- Unit tests for services that validate stakeholder percentage totals.
- Unit tests for source-specific product matching.
- Unit tests for staged import parsing and validation.
- Integration tests for import commit transaction behavior.
- Controller tests for CRUD validation responses.

Frontend tests:

- Component tests for reusable tables and forms.
- Import page tests for displaying matched product name beside imported product description.
- Import page tests for disabled commit button when metadata or validation is incomplete.

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

No blocking open decisions remain for the MVP design. Reports, auth, fee calculation, and profit allocation are intentionally future work.
