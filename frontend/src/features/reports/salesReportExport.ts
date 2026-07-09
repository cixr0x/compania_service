import type { SalesReportRow, SalesReportSource } from '../../api/types'
import { formatCurrency } from '../../utils/money'

const sourceLabels: Record<SalesReportSource, string> = {
  ecommerce: 'Ecommerce',
  event: 'Event',
  store: 'Store',
  surface: 'Surface',
}

type SalesReportSourceTotals = {
  amount: number
  averagePrice: number
  quantity: number
}

type SalesReportTotals = {
  fee: number
  ownerProfit: number
  profit: number
  sourceTotals: Record<SalesReportSource, SalesReportSourceTotals>
  totalAmount: number
  totalAveragePrice: number
  totalQuantity: number
}

type SalesReportExcelExport = {
  monthLabel: string
  productLabel: string
  rows: SalesReportRow[]
  sources: SalesReportSource[]
  totals: SalesReportTotals
  year: string
}

export function downloadSalesReportExcel(exportData: SalesReportExcelExport) {
  const html = buildSalesReportExcelHtml(exportData)
  const blob = new Blob(['\ufeff', html], {
    type: 'application/vnd.ms-excel;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = buildSalesReportExcelFilename(exportData)
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function buildSalesReportExcelFilename({
  monthLabel,
  productLabel,
  year,
}: Pick<SalesReportExcelExport, 'monthLabel' | 'productLabel' | 'year'>) {
  const parts = ['sales-report', year]

  if (monthLabel && monthLabel !== 'Full year') {
    parts.push(slugify(monthLabel))
  }

  if (productLabel && productLabel !== 'All products') {
    parts.push(slugify(productLabel))
  }

  return `${parts.join('-')}.xls`
}

function buildSalesReportExcelHtml({
  monthLabel,
  productLabel,
  rows,
  sources,
  totals,
  year,
}: SalesReportExcelExport) {
  const columnCount = 1 + sources.length * 3 + 6
  const headerRows = [
    `<tr><th colspan="${columnCount}">Sales Report</th></tr>`,
    `<tr><td>Year</td><td>${escapeHtml(year)}</td></tr>`,
    `<tr><td>Month</td><td>${escapeHtml(monthLabel)}</td></tr>`,
    `<tr><td>Product</td><td>${escapeHtml(productLabel)}</td></tr>`,
    '<tr></tr>',
    buildGroupedHeaderRow(sources),
    buildColumnHeaderRow(sources),
  ].join('')
  const bodyRows = rows.map((row) => buildDataRow(row, sources)).join('')
  const totalsRow = buildTotalsRow(totals, sources)

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    table { border-collapse: collapse; font-family: Arial, sans-serif; }
    th, td { border: 1px solid #d9d9d9; padding: 6px 8px; white-space: nowrap; }
    th { background: #f5f5f5; font-weight: 700; }
    .number { text-align: right; }
    .total td { font-weight: 700; }
  </style>
</head>
<body>
  <table>
    ${headerRows}
    ${bodyRows}
    ${totalsRow}
  </table>
</body>
</html>`
}

function buildGroupedHeaderRow(sources: SalesReportSource[]) {
  return [
    '<tr>',
    '<th rowspan="2">Product</th>',
    ...sources.map(
      (source) => `<th colspan="3">${escapeHtml(sourceLabels[source])}</th>`,
    ),
    '<th rowspan="2">Total Quantity</th>',
    '<th rowspan="2">Total Amount</th>',
    '<th rowspan="2">Avg Price</th>',
    '<th rowspan="2">Fee</th>',
    '<th rowspan="2">Profit</th>',
    '<th rowspan="2">Owner Profit</th>',
    '</tr>',
  ].join('')
}

function buildColumnHeaderRow(sources: SalesReportSource[]) {
  return [
    '<tr>',
    ...sources.flatMap(() => [
      '<th>Quantity</th>',
      '<th>Amount</th>',
      '<th>Avg Price</th>',
    ]),
    '</tr>',
  ].join('')
}

function buildDataRow(row: SalesReportRow, sources: SalesReportSource[]) {
  return [
    '<tr>',
    textCell(row.productName),
    ...sources.flatMap((source) => [
      numberCell(row[source].quantity),
      moneyCell(row[source].amount),
      moneyCell(row[source].averagePrice),
    ]),
    numberCell(row.totalQuantity),
    moneyCell(row.totalAmount),
    moneyCell(row.totalAveragePrice),
    moneyCell(row.fee),
    moneyCell(row.profit),
    moneyCell(row.ownerProfit),
    '</tr>',
  ].join('')
}

function buildTotalsRow(
  totals: SalesReportTotals,
  sources: SalesReportSource[],
) {
  return [
    '<tr class="total">',
    textCell('Totals'),
    ...sources.flatMap((source) => [
      numberCell(totals.sourceTotals[source].quantity),
      moneyCell(totals.sourceTotals[source].amount),
      moneyCell(totals.sourceTotals[source].averagePrice),
    ]),
    numberCell(totals.totalQuantity),
    moneyCell(totals.totalAmount),
    moneyCell(totals.totalAveragePrice),
    moneyCell(totals.fee),
    moneyCell(totals.profit),
    moneyCell(totals.ownerProfit),
    '</tr>',
  ].join('')
}

function textCell(value: unknown) {
  return `<td>${escapeHtml(String(value ?? ''))}</td>`
}

function numberCell(value: number) {
  return `<td class="number">${value}</td>`
}

function moneyCell(value: number) {
  return `<td class="number">${escapeHtml(formatCurrency(value))}</td>`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return slug || 'report'
}
