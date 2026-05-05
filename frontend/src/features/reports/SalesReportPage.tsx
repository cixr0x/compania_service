import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getJson } from '../../api/client'
import type {
  SalesReportPeriod,
  SalesReportSource,
  SalesReportSummary,
} from '../../api/types'
import { formatMoney } from '../../utils/money'

const sourceLabels: Record<SalesReportSource, string> = {
  ecommerce: 'Ecommerce',
  event: 'Event',
  store: 'Store',
  surface: 'Surface',
}
const DEFAULT_REPORT_SOURCES: SalesReportSource[] = [
  'store',
  'ecommerce',
  'event',
]
const EMPTY_PERIODS: SalesReportPeriod[] = []

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: 'UTC',
})

function formatMonth(month: number) {
  return monthFormatter.format(new Date(Date.UTC(2026, month - 1, 1)))
}

function buildReportPath(year: string, month: string) {
  const query = new URLSearchParams({ year })
  if (month) {
    query.set('month', month)
  }

  return `/reports/sales-summary?${query.toString()}`
}

function getColumnSpan(sourceCount: number) {
  return 10 + sourceCount * 2
}

export function SalesReportPage() {
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const periodsQuery = useQuery({
    queryKey: ['reports', 'sales-summary-periods'],
    queryFn: () => getJson<SalesReportPeriod[]>('/reports/sales-summary/periods'),
  })
  const periods = periodsQuery.data ?? EMPTY_PERIODS
  const activeYear = selectedYear ?? String(periods[0]?.year ?? '')
  const selectedPeriod = useMemo(
    () => periods.find((period) => String(period.year) === activeYear),
    [activeYear, periods],
  )
  const reportQuery = useQuery({
    enabled: activeYear !== '',
    queryKey: ['reports', 'sales-summary', activeYear, selectedMonth],
    queryFn: () =>
      getJson<SalesReportSummary>(buildReportPath(activeYear, selectedMonth)),
  })
  const report = reportQuery.data
  const sources = report?.sources ?? DEFAULT_REPORT_SOURCES
  const rows = report?.rows ?? []

  return (
    <section className="page-panel report-page" aria-labelledby="sales-report-heading">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Reports</p>
          <h2 id="sales-report-heading">Sales Report</h2>
        </div>
      </div>

      <div className="report-controls">
        <label className="form-field">
          Year
          <select
            disabled={periods.length === 0}
            onChange={(event) => {
              setSelectedYear(event.target.value)
              setSelectedMonth('')
            }}
            value={activeYear}
          >
            {periods.length === 0 ? (
              <option value="">No sales periods</option>
            ) : null}
            {periods.map((period) => (
              <option key={period.year} value={period.year}>
                {period.year}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          Month
          <select
            disabled={!selectedPeriod}
            onChange={(event) => setSelectedMonth(event.target.value)}
            value={selectedMonth}
          >
            <option value="">Full year</option>
            {selectedPeriod?.months.map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {periodsQuery.isError || reportQuery.isError ? (
        <div className="form-error" role="alert">
          Unable to load the sales report.
        </div>
      ) : null}

      <div className="table-scroll">
        <table className="data-table report-table">
          <thead>
            <tr>
              <th rowSpan={2} scope="col">
                Project ID
              </th>
              <th rowSpan={2} scope="col">
                Product
              </th>
              {sources.map((source) => (
                <th colSpan={2} key={source} scope="colgroup">
                  {sourceLabels[source]}
                </th>
              ))}
              <th rowSpan={2} scope="col">
                Total Quantity
              </th>
              <th rowSpan={2} scope="col">
                Total Amount
              </th>
              <th rowSpan={2} scope="col">
                Model
              </th>
              <th rowSpan={2} scope="col">
                Fee
              </th>
              <th rowSpan={2} scope="col">
                Total Cost
              </th>
              <th rowSpan={2} scope="col">
                Income
              </th>
              <th rowSpan={2} scope="col">
                Profit
              </th>
              <th rowSpan={2} scope="col">
                Owner Profit
              </th>
            </tr>
            <tr>
              {sources.flatMap((source) => [
                <th key={`${source}-quantity`} scope="col">
                  Quantity
                </th>,
                <th key={`${source}-amount`} scope="col">
                  Amount
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {reportQuery.isLoading || periodsQuery.isLoading ? (
              <tr>
                <td className="table-state" colSpan={getColumnSpan(sources.length)}>
                  Loading report...
                </td>
              </tr>
            ) : rows.length > 0 ? (
              rows.map((row) => (
                <tr key={`${row.projectId}-${row.productName}`}>
                  <td>{row.projectId}</td>
                  <td>{row.productName}</td>
                  {sources.flatMap((source) => [
                    <td key={`${source}-quantity`}>{row[source].quantity}</td>,
                    <td key={`${source}-amount`}>
                      {formatMoney(row[source].amount)}
                    </td>,
                  ])}
                  <td>{row.totalQuantity}</td>
                  <td>{formatMoney(row.totalAmount)}</td>
                  <td>{row.model || '-'}</td>
                  <td>{formatMoney(row.fee)}</td>
                  <td>{formatMoney(row.totalCost)}</td>
                  <td>{formatMoney(row.income)}</td>
                  <td>{formatMoney(row.profit)}</td>
                  <td>{formatMoney(row.ownerProfit)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="table-state" colSpan={getColumnSpan(sources.length)}>
                  No sales data for the selected period.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
