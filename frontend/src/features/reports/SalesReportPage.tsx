import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Empty, Select, Space, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getJson } from '../../api/client'
import type {
  SalesReportPeriod,
  SalesReportRow,
  SalesReportSource,
  SalesReportSummary,
} from '../../api/types'
import { ProductNameCell } from '../../components/ProductNameCell'
import { getChannelHeaderClass } from '../../utils/channelHeaders'
import { formatCurrency } from '../../utils/money'

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
const REPORT_COLUMN_WIDTHS = {
  fee: 90,
  model: 90,
  ownerProfit: 120,
  product: 160,
  profit: 88,
  projectId: 80,
  sourceAmount: 104,
  sourceQuantity: 64,
  totalAmount: 120,
  totalQuantity: 100,
}
const REPORT_SOURCE_GROUP_WIDTH =
  REPORT_COLUMN_WIDTHS.sourceQuantity + REPORT_COLUMN_WIDTHS.sourceAmount
const REPORT_STATIC_WIDTH =
  REPORT_COLUMN_WIDTHS.projectId +
  REPORT_COLUMN_WIDTHS.product +
  REPORT_COLUMN_WIDTHS.totalQuantity +
  REPORT_COLUMN_WIDTHS.totalAmount +
  REPORT_COLUMN_WIDTHS.model +
  REPORT_COLUMN_WIDTHS.fee +
  REPORT_COLUMN_WIDTHS.profit +
  REPORT_COLUMN_WIDTHS.ownerProfit

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

function getReportTableWidth(sources: SalesReportSource[]) {
  return REPORT_STATIC_WIDTH + sources.length * REPORT_SOURCE_GROUP_WIDTH
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
        align: 'right',
        dataIndex: 'projectId',
        key: 'projectId',
        title: 'Project ID',
        width: REPORT_COLUMN_WIDTHS.projectId,
      },
      {
        dataIndex: 'productName',
        key: 'productName',
        ellipsis: true,
        render: (_value: SalesReportRow['productName'], row: SalesReportRow) => (
          <ProductNameCell imageUrl={row.productImage} name={row.productName} />
        ),
        title: 'Product',
        width: REPORT_COLUMN_WIDTHS.product,
      },
      ...sources.map((source) => {
        const headerClassName = getChannelHeaderClass(source)

        return {
          children: [
            {
              align: 'right' as const,
              key: `${source}-quantity`,
              onHeaderCell: () => ({ className: headerClassName }),
              render: (_value: unknown, row: SalesReportRow) =>
                row[source].quantity,
              title: 'Quantity',
              width: REPORT_COLUMN_WIDTHS.sourceQuantity,
            },
            {
              align: 'right' as const,
              key: `${source}-amount`,
              onHeaderCell: () => ({ className: headerClassName }),
              render: (_value: unknown, row: SalesReportRow) =>
                formatCurrency(row[source].amount),
              title: 'Amount',
              width: REPORT_COLUMN_WIDTHS.sourceAmount,
            },
          ],
          key: source,
          onHeaderCell: () => ({ className: headerClassName }),
          title: sourceLabels[source],
        }
      }),
      {
        align: 'right',
        dataIndex: 'totalQuantity',
        key: 'totalQuantity',
        title: 'Total Quantity',
        width: REPORT_COLUMN_WIDTHS.totalQuantity,
      },
      {
        align: 'right',
        dataIndex: 'totalAmount',
        key: 'totalAmount',
        render: (value: SalesReportRow['totalAmount']) => formatCurrency(value),
        title: 'Total Amount',
        width: REPORT_COLUMN_WIDTHS.totalAmount,
      },
      {
        dataIndex: 'model',
        ellipsis: true,
        key: 'model',
        render: (value: SalesReportRow['model']) => value || '-',
        title: 'Model',
        width: REPORT_COLUMN_WIDTHS.model,
      },
      {
        align: 'right',
        dataIndex: 'fee',
        key: 'fee',
        render: (value: SalesReportRow['fee']) => formatCurrency(value),
        title: 'Fee',
        width: REPORT_COLUMN_WIDTHS.fee,
      },
      {
        align: 'right',
        dataIndex: 'profit',
        key: 'profit',
        render: (value: SalesReportRow['profit']) => formatCurrency(value),
        title: 'Profit',
        width: REPORT_COLUMN_WIDTHS.profit,
      },
      {
        align: 'right',
        dataIndex: 'ownerProfit',
        key: 'ownerProfit',
        render: (value: SalesReportRow['ownerProfit']) => formatCurrency(value),
        title: 'Owner Profit',
        width: REPORT_COLUMN_WIDTHS.ownerProfit,
      },
    ],
    [sources],
  )

  return (
    <section className="page-panel report-page" aria-labelledby="sales-report-heading">
      <div className="page-heading-row">
        <div>
          <Typography.Title id="sales-report-heading" level={2}>
            Sales Report
          </Typography.Title>
        </div>
      </div>

      <div className="report-controls">
        <Space className="report-filter-row" size={12}>
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
      </div>

      {periodsQuery.isError || reportQuery.isError ? (
        <Alert
          message="Unable to load the sales report."
          showIcon
          type="error"
        />
      ) : null}

      <Table<SalesReportRow>
        className="report-table sales-report-table"
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
        scroll={{ x: getReportTableWidth(sources) }}
        size="small"
      />
    </section>
  )
}
