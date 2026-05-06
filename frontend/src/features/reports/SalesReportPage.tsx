import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Empty, Row, Select, Space, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getJson } from '../../api/client'
import type {
  SalesReportPeriod,
  SalesReportRow,
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
  const isLoading = reportQuery.isLoading || periodsQuery.isLoading
  const columns = useMemo<ColumnsType<SalesReportRow>>(
    () => [
      {
        dataIndex: 'projectId',
        key: 'projectId',
        title: 'Project ID',
      },
      {
        dataIndex: 'productName',
        key: 'productName',
        title: 'Product',
      },
      ...sources.map((source) => ({
        children: [
          {
            key: `${source}-quantity`,
            render: (_value: unknown, row: SalesReportRow) =>
              row[source].quantity,
            title: 'Quantity',
          },
          {
            key: `${source}-amount`,
            render: (_value: unknown, row: SalesReportRow) =>
              formatMoney(row[source].amount),
            title: 'Amount',
          },
        ],
        key: source,
        title: sourceLabels[source],
      })),
      {
        dataIndex: 'totalQuantity',
        key: 'totalQuantity',
        title: 'Total Quantity',
      },
      {
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        render: (value: SalesReportRow['totalAmount']) => formatMoney(value),
        title: 'Total Amount',
      },
      {
        dataIndex: 'model',
        key: 'model',
        render: (value: SalesReportRow['model']) => value || '-',
        title: 'Model',
      },
      {
        dataIndex: 'fee',
        key: 'fee',
        render: (value: SalesReportRow['fee']) => formatMoney(value),
        title: 'Fee',
      },
      {
        dataIndex: 'totalCost',
        key: 'totalCost',
        render: (value: SalesReportRow['totalCost']) => formatMoney(value),
        title: 'Total Cost',
      },
      {
        dataIndex: 'income',
        key: 'income',
        render: (value: SalesReportRow['income']) => formatMoney(value),
        title: 'Income',
      },
      {
        dataIndex: 'profit',
        key: 'profit',
        render: (value: SalesReportRow['profit']) => formatMoney(value),
        title: 'Profit',
      },
      {
        dataIndex: 'ownerProfit',
        key: 'ownerProfit',
        render: (value: SalesReportRow['ownerProfit']) => formatMoney(value),
        title: 'Owner Profit',
      },
    ],
    [sources],
  )

  return (
    <section className="page-panel report-page" aria-labelledby="sales-report-heading">
      <div className="page-heading-row">
        <div>
          <Typography.Text className="eyebrow">Reports</Typography.Text>
          <Typography.Title id="sales-report-heading" level={2}>
            Sales Report
          </Typography.Title>
        </div>
      </div>

      <Row className="report-controls">
        <Space wrap>
          <label className="form-field">
            Year
            <Select
              aria-label="Year"
              disabled={periods.length === 0}
              onChange={(value) => {
                setSelectedYear(value)
                setSelectedMonth('')
              }}
              options={
                periods.length === 0
                  ? [{ label: 'No sales periods', value: '' }]
                  : periods.map((period) => ({
                      label: String(period.year),
                      value: String(period.year),
                    }))
              }
              style={{ minWidth: 160 }}
              value={activeYear}
            />
          </label>

          <label className="form-field">
            Month
            <Select
              aria-label="Month"
              disabled={!selectedPeriod}
              onChange={(value) => setSelectedMonth(value)}
              options={[
                { label: 'Full year', value: '' },
                ...(selectedPeriod?.months.map((month) => ({
                  label: formatMonth(month),
                  value: String(month),
                })) ?? []),
              ]}
              style={{ minWidth: 180 }}
              value={selectedMonth}
            />
          </label>
        </Space>
      </Row>

      {periodsQuery.isError || reportQuery.isError ? (
        <Alert
          message="Unable to load the sales report."
          showIcon
          type="error"
        />
      ) : null}

      <Table<SalesReportRow>
        className="report-table"
        columns={columns}
        dataSource={rows}
        loading={{
          indicator: <Spin />,
          spinning: isLoading,
        }}
        locale={{
          emptyText: isLoading ? (
            'Loading report...'
          ) : (
            <Empty description="No sales data for the selected period." />
          ),
        }}
        pagination={false}
        rowKey={(row) => `${row.projectId}-${row.productName}`}
        scroll={{ x: 'max-content' }}
        size="middle"
      />
    </section>
  )
}
