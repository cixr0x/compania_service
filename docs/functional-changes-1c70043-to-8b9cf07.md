# Functional Changes in the August 2026 Production Release

This guide explains the user-visible differences between the production version that was previously running (`1c70043`) and the version deployed in August 2026 (`8b9cf07`). It is intended for application users and administrators, so it focuses on behavior rather than implementation details.

## Projects

### Projects now have their own name

Each project can now have a name that is separate from its product. Existing projects received the name of their associated product during the upgrade.

Project lists and selectors prefer the project name and include the project number when useful. If a project does not have a usable name, the application falls back to the product name or the project number.

Product detail screens now include a **Product Projects** section with links to the product's projects. Stakeholder detail screens likewise link their project participations to the corresponding project records.

### Fixed ROI projects

A project can now use a fixed-return investment model:

1. Open or create a project.
2. Enable **Fixed ROI**.
3. Enter the **Fixed ROI Percentage**.
4. Save the project.

The percentage is required when Fixed ROI is enabled. It may be zero or greater and is not capped at 100%. Turning Fixed ROI off clears the percentage so an old value is not saved accidentally.

Existing projects remain standard, non-fixed-ROI projects until the option is enabled manually.

## Sales Report

### Product-first project identification

The report identifies each row by product first and project second, for example:

> Juego01 (Project #1)

The project selector uses the same pattern, making projects easier to distinguish when a product has more than one project.

### Project and stakeholder filters

The existing year and month filters continue to work. Two additional ways to focus the report are available:

- **Project** limits the visible rows to one project.
- **Stakeholder** limits the report to projects in which that stakeholder participates.

When a stakeholder is selected, a project remains visible even if it has no sales. This makes it clear that the stakeholder is assigned to the project; its sales and income values appear as zero when appropriate.

### Stakeholder columns

Selecting a stakeholder adds:

- **Stake %**: the stakeholder's participation in that project.
- **Stakeholder Income**: `(Total Sales - Fees) x Stake %` for that row.

The former Owner Profit column is no longer shown. When a stakeholder is selected, Stakeholder Income is the stakeholder-specific value; without a selected stakeholder, the stakeholder columns are omitted.

### Excel export

The **Export Excel** action downloads the report currently on screen. The file respects the active year, month, project, and stakeholder filters, includes the same visible rows, and includes a totals row.

## Stakeholder Projects Report

The stakeholder report and its printable version now use Spanish user-facing text.

### Selecting the report

1. Open **Proyectos por socio**.
2. Select a project.
3. Select one of the stakeholders assigned to that project.

The report displays only the selected project and stakeholder combination.

### Project section

The editable report shows:

- Product and project links.
- Units sold and project progress.
- Units and sales amounts by channel.
- Units remaining.
- Total sales, fees, and net sales.
- Calculated cost and actual profit.
- **ROI del proyecto**, calculated as `Actual Profit / Calculated Cost` and displayed as a percentage. If calculated cost is zero, the report displays `-`.

### Stakeholder section

The stakeholder section shows:

- Participation percentage.
- Investment balance.
- Payments.
- **Ingreso correspondiente**.
- Adjustments, when any exist.
- Current balance.

For a standard project, the stakeholder's corresponding income is their stake in the project's calculated cost and actual profit. This is equivalent to their stake in net sales.

### Stakeholder transactions

Stakeholder transactions can be added, edited, and removed from the editable report. Every transaction has one of these types:

- **Inversión** increases recorded investment.
- **Pago** records money paid to the stakeholder.
- **Ajuste** applies a positive or negative correction.

During the upgrade, existing positive transaction amounts were classified as payments and zero or negative amounts were classified as investments.

### Links between records

Product, project, and stakeholder names now link to their corresponding detail screens in the report and in related operational tables, including project lists, project-stakeholder assignments, sales lists, product details, and stakeholder details. This makes it easier to move between a report or relationship and the underlying record.

## Fixed ROI Reporting

When the selected project uses Fixed ROI, the editable project section adds:

- **ROI fijo**: the percentage configured on the project.
- **Utilidad otorgada**: `Calculated Cost x Fixed ROI %`.
- **Diferencia de utilidad**: `Actual Profit - Fixed ROI Profit`.

For a fixed-ROI project, **Ingreso correspondiente** is:

> Calculated Cost + (Calculated Cost x Fixed ROI % x Stake %)

The editable report continues to display both units and sales amounts in every sales-channel card.

## Printable Report

Use **Imprimir reporte** after selecting a project and stakeholder. The printable route removes navigation, filters, transaction actions, and other editing controls.

For a standard project, the printed report includes the normal project, channel, stakeholder, and transaction details.

For a Fixed ROI project:

- Channel cards display units sold but not dollar amounts.
- The project-level summary displays only total units sold, calculated cost, fixed ROI percentage, and fixed ROI profit.
- Total sales, fees, net sales, actual profit, project progress, units remaining, and profit difference are omitted from the project summary.
- Stakeholder details and the read-only transaction history remain available.

## Important Operating Assumptions

- A stakeholder's percentage is assumed not to change after a project has started.
- Fixed ROI is configured per project, not per stakeholder.
- A stakeholder assigned to a project remains visible in reports even when the project has zero sales.
