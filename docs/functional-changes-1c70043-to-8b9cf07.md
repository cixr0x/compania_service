# Functional Changes in the August 2026 Production Release

This user guide explains the visible differences between the production version that was previously running (`1c70043`) and the version deployed in August 2026 (`8b9cf07`). It focuses on what users can see and do in the application.

Routes containing `<project-id>`, `<product-id>`, `<stakeholder-id>`, or `<batch-id>` represent the identifier of the record being viewed.

## Page and Route Directory

| Page | Route |
| --- | --- |
| Projects list | `/projects` |
| New project | `/projects/new` |
| Project detail | `/projects/<project-id>` |
| Product detail | `/products/<product-id>` |
| Stakeholder detail | `/stakeholders/<stakeholder-id>` |
| Project Stakeholders | `/project-stakeholders` |
| Sales | `/sales` |
| Sales Imports | `/imports` and `/imports/<batch-id>` |
| Sales Report | `/reports/sales` |
| Proyectos por socio | `/reports/stakeholder-projects` |
| Printable Proyectos por socio | `/reports/stakeholder-projects/print?projectId=<project-id>&stakeholderId=<stakeholder-id>` |

## Projects

### Change 1: Projects now have their own name

**Where to see it**

- **Projects list** - `/projects`
- **New project** - `/projects/new`
- **Project detail** - `/projects/<project-id>`
- **Product detail, Product Projects section** - `/products/<product-id>`
- **Stakeholder detail, Projects section** - `/stakeholders/<stakeholder-id>`
- **Project selectors** - `/project-stakeholders`, `/sales`, `/imports`, `/reports/sales`, and `/reports/stakeholder-projects`

Each project can now have a name that is separate from its product. Existing projects received the associated product name during the upgrade.

The Projects list and project forms display the project name. Project selectors prefer the project name and include the project number when useful. If a project has no usable name, the application falls back to the product name or project number.

The Product detail page now includes a **Product Projects** section with links to that product's projects. The Stakeholder detail page uses project names for the stakeholder's project participations and links them to the corresponding project records.

### Change 2: Fixed ROI can be configured per project

**Where to see it**

- **Projects list, Fixed ROI and Fixed ROI % columns** - `/projects`
- **New project, Fixed ROI fields** - `/projects/new`
- **Project detail, Fixed ROI fields** - `/projects/<project-id>`

A project can use a fixed-return investment model:

1. Open or create a project.
2. Enable **Fixed ROI**.
3. Enter the **Fixed ROI Percentage**.
4. Save the project.

The percentage is required when Fixed ROI is enabled. It may be zero or greater and is not capped at 100%. Turning Fixed ROI off clears the percentage so an old value is not saved accidentally.

Existing projects remain standard, non-fixed-ROI projects until the option is enabled manually.

## Sales Report

### Change 3: Product-first project identification

**Where to see it**

- **Sales Report table and Project filter** - `/reports/sales`

The report identifies each row by product first and project second, for example:

> Juego01 (Project #1)

The Project selector uses the same pattern, making projects easier to distinguish when a product has more than one project.

### Change 4: Project and Stakeholder filters

**Where to see it**

- **Sales Report filter bar and result table** - `/reports/sales`

The existing Year and Month filters continue to work. Two additional filters are available:

- **Project** limits the visible rows to one project.
- **Stakeholder** limits the report to projects in which that stakeholder participates.

When a stakeholder is selected, a project remains visible even if it has no sales. This makes the participation visible; sales and income values appear as zero when appropriate. All active filters work together.

### Change 5: Stakeholder-specific columns and income

**Where to see it**

- **Sales Report table after selecting a Stakeholder** - `/reports/sales`

Selecting a stakeholder adds two columns:

- **Stake %** - the stakeholder's participation in the project.
- **Stakeholder Income** - `(Total Sales - Fees) x Stake %` for that row.

The former **Owner Profit** column is no longer shown in the Sales Report. Without a selected stakeholder, the two stakeholder-specific columns are omitted. With a selected stakeholder, they appear in the table and totals row.

### Change 6: Excel export matches the visible report

**Where to see it**

- **Sales Report, Export Excel button** - `/reports/sales`

**Export Excel** downloads the report on screen. It respects all active filters, matches the visible rows, and adds totals. Stakeholder-specific columns are exported only when a stakeholder is selected.

## Stakeholder Projects Report

### Change 7: The report is presented in Spanish

**Where to see it**

- **Proyectos por socio, editable report** - `/reports/stakeholder-projects`
- **Proyectos por socio, printable report** - `/reports/stakeholder-projects/print?projectId=<project-id>&stakeholderId=<stakeholder-id>`

The report's user-visible titles, labels, filters, messages, transaction controls, and printable version are now in Spanish. In the Reports menu, open **Proyectos por socio**.

To load a report:

1. Select a **Proyecto**.
2. Select one of the **Socios** assigned to that project.
3. Review the selected project and stakeholder combination.

### Change 8: Project performance includes calculated ROI

**Where to see it**

- **Proyectos por socio, project section** - `/reports/stakeholder-projects`
- **Printable Proyectos por socio, project section** - `/reports/stakeholder-projects/print?projectId=<project-id>&stakeholderId=<stakeholder-id>`

For a standard project, the project section shows:

- Product and project links.
- Total units sold, project progress, and units remaining.
- Units and sales amounts by sales channel.
- Total sales, fees, and net sales.
- Calculated cost and actual profit.
- **ROI del proyecto**, calculated as `Actual Profit / Calculated Cost` and displayed as a percentage.

If calculated cost is zero, **ROI del proyecto** displays `-`.

### Change 9: Stakeholder financial summary and transaction types

**Where to see it**

- **Proyectos por socio, stakeholder section and editable transaction table** - `/reports/stakeholder-projects`
- **Printable Proyectos por socio, stakeholder section and read-only transaction history** - `/reports/stakeholder-projects/print?projectId=<project-id>&stakeholderId=<stakeholder-id>`

The stakeholder section shows the participation percentage, investment balance, payments, **Ingreso correspondiente**, adjustments when any exist, and current balance.

For a standard project:

> Ingreso correspondiente = (Calculated Cost x Stake %) + (Actual Profit x Stake %)

This is equivalent to the stakeholder's percentage of net sales.

Transactions can be added, edited, and removed from the editable report. Each transaction has one of these types:

- **Inversión** records stakeholder investment activity.
- **Pago** records money paid to the stakeholder.
- **Ajuste** applies a positive or negative correction.

During the upgrade, existing positive transaction amounts were classified as payments. Existing zero or negative amounts were classified as investments.

### Change 10: Related records are directly linked

**Where to see it**

- **Projects list, Product column** - `/projects`
- **Project Stakeholders, Project and Stakeholder columns** - `/project-stakeholders`
- **Sales, Product and Project columns** - `/sales`
- **Sales Imports, matched Product and selected Project** - `/imports` and `/imports/<batch-id>`
- **Sales Report, product/project identifier** - `/reports/sales`
- **Proyectos por socio, Product, Project, and Stakeholder names** - `/reports/stakeholder-projects`
- **Product detail, Product Projects section** - `/products/<product-id>`
- **Stakeholder detail, Projects section** - `/stakeholders/<stakeholder-id>`

Product, project, and stakeholder names in these locations now open their corresponding detail pages. This makes it easier to move from a report, sale, import, or relationship to the underlying record.

## Fixed ROI Reporting

### Change 11: Fixed ROI metrics and stakeholder income

**Where to see it**

- **Project detail, Fixed ROI configuration** - `/projects/<project-id>`
- **Proyectos por socio, editable project and stakeholder sections** - `/reports/stakeholder-projects`

When the selected project uses Fixed ROI, the editable project section adds:

- **ROI fijo** - the percentage configured on the project.
- **Utilidad otorgada** - `Calculated Cost x Fixed ROI %`.
- **Diferencia de utilidad** - `Actual Profit - Fixed ROI Profit`.

For a fixed-ROI project, **Ingreso correspondiente** is:

> Calculated Cost + (Calculated Cost x Fixed ROI % x Stake %)

The editable report continues to display both units and dollar sales amounts in every sales-channel card, including Fixed ROI projects.

### Change 12: Dedicated printable report behavior

**Where to see it**

- **Proyectos por socio, Imprimir reporte button** - `/reports/stakeholder-projects`
- **Printable Proyectos por socio** - `/reports/stakeholder-projects/print?projectId=<project-id>&stakeholderId=<stakeholder-id>`

Use **Imprimir reporte** after selecting a project and stakeholder. The printable page removes application navigation, filters, transaction actions, and editing controls.

For a standard project, the printed report includes the normal project, channel, stakeholder, and transaction details.

For a Fixed ROI project:

- Sales-channel cards display units sold but not dollar amounts.
- The project summary displays only total units sold, calculated cost, fixed ROI percentage, and fixed ROI profit.
- Total sales, fees, net sales, actual profit, project progress, units remaining, and profit difference are omitted from the project summary.
- Stakeholder details and the read-only transaction history remain visible.

## Important Operating Assumptions

These rules apply on the **Sales Report** (`/reports/sales`) and **Proyectos por socio** (`/reports/stakeholder-projects`) wherever stakeholder calculations are shown:

- A stakeholder's percentage is assumed not to change after a project has started.
- Fixed ROI is configured per project, not per stakeholder.
- A stakeholder assigned to a project remains visible in reports even when the project has zero sales.
