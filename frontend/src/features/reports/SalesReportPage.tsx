import { useMemo, useState } from 'react'
import { DownloadOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Empty,
  Select,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { Link } from 'react-router-dom'
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
import { downloadSalesReportExcel } from './salesReportExport'

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
const EMPTY_REPORT_ROWS: SalesReportRow[] = []
const REPORT_COLUMN_WIDTHS = {
  fee: 90,
  ownerProfit: 120,
  product: 160,
  profit: 88,
  sourceAmount: 104,
  sourceAveragePrice: 104,
  sourceQuantity: 64,
  totalAmount: 120,
  totalAveragePrice: 104,
  totalQuantity: 100,
}
const REPORT_SOURCE_GROUP_WIDTH =
  REPORT_COLUMN_WIDTHS.sourceQuantity +
  REPORT_COLUMN_WIDTHS.sourceAmount +
  REPORT_COLUMN_WIDTHS.sourceAveragePrice
const REPORT_STATIC_WIDTH =
  REPORT_COLUMN_WIDTHS.product +
  REPORT_COLUMN_WIDTHS.totalQuantity +
  REPORT_COLUMN_WIDTHS.totalAmount +
  REPORT_COLUMN_WIDTHS.totalAveragePrice +
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

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getAveragePrice(amount: number, quantity: number) {
  return quantity === 0 ? 0 : roundCurrency(amount / quantity)
}

function getSourceAveragePrice(row: SalesReportRow, source: SalesReportSource) {
  return (
    row[source].averagePrice ??
    getAveragePrice(row[source].amount, row[source].quantity)
  )
}

function getReportTotals(rows: SalesReportRow[], sources: SalesReportSource[]) {
  const sourceTotals = Object.fromEntries(
    sources.map((source) => [
      source,
      { amount: 0, averagePrice: 0, quantity: 0 },
    ]),
  ) as Record<SalesReportSource, SalesReportRow[SalesReportSource]>
  const totals = {
    fee: 0,
    ownerProfit: 0,
    profit: 0,
    sourceTotals,
    totalAmount: 0,
    totalAveragePrice: 0,
    totalQuantity: 0,
  }

  for (const row of rows) {
    for (const source of sources) {
      totals.sourceTotals[source].amount += row[source].amount
      totals.sourceTotals[source].quantity += row[source].quantity
    }

    totals.totalQuantity += row.totalQuantity
    totals.totalAmount += row.totalAmount
    totals.fee += row.fee
    totals.profit += row.profit
    totals.ownerProfit += row.ownerProfit
  }

  for (const source of sources) {
    const sourceTotal = totals.sourceTotals[source]
    sourceTotal.amount = roundCurrency(sourceTotal.amount)
    sourceTotal.averagePrice = getAveragePrice(
      sourceTotal.amount,
      sourceTotal.quantity,
    )
  }

  totals.totalAmount = roundCurrency(totals.totalAmount)
  totals.totalAveragePrice = getAveragePrice(
    totals.totalAmount,
    totals.totalQuantity,
  )
  totals.fee = roundCurrency(totals.fee)
  totals.profit = roundCurrency(totals.profit)
  totals.ownerProfit = roundCurrency(totals.ownerProfit)

  return totals
}

export function SalesReportPage() {
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const periodsQuery = useQuery({
    queryKey: ['reports', 'sales-summary-periods'],
    queryFn: () =>
      getJson<SalesReportPeriod[]>('/reports/sales-summary/periods'),
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
  const rows = report?.rows ?? EMPTY_REPORT_ROWS
  const activeProductId =
    selectedProductId &&
    rows.some((row) => String(row.productId) === selectedProductId)
      ? selectedProductId
      : ''
  const productOptions = useMemo(() => {
    const optionsByProduct = new Map<number, string>()

    for (const row of rows) {
      optionsByProduct.set(row.productId, row.productName)
    }

    return [...optionsByProduct.entries()]
      .sort(([, leftName], [, rightName]) => leftName.localeCompare(rightName))
      .map(([productId, productName]) => ({
        label: productName,
        value: String(productId),
      }))
  }, [rows])
  const filteredRows = useMemo(
    () =>
      activeProductId
        ? rows.filter((row) => String(row.productId) === activeProductId)
        : rows,
    [activeProductId, rows],
  )
  const reportTotals = useMemo(
    () => getReportTotals(filteredRows, sources),
    [filteredRows, sources],
  )
  const isLoading = reportQuery.isLoading || periodsQuery.isLoading
  const activeMonthLabel = selectedMonth
    ? formatMonth(Number(selectedMonth))
    : 'Full year'
  const activeProductLabel =
    productOptions.find((option) => option.value === activeProductId)?.label ??
    'All products'
  const canExport = activeYear !== '' && filteredRows.length > 0 && !isLoading
  const columns = useMemo<ColumnsType<SalesReportRow>>(
    () => [
      {
        dataIndex: 'productName',
        key: 'productName',
        ellipsis: true,
        render: (
          _value: SalesReportRow['productName'],
          row: SalesReportRow,
        ) => (
          <Link
            aria-label={row.productName}
            className="entity-reference-link"
            to={`/products/${row.productId}`}
          >
            <ProductNameCell imageUrl={row.productImage} name={row.productName} />
          </Link>
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
            {
              align: 'right' as const,
              key: `${source}-average-price`,
              onHeaderCell: () => ({ className: headerClassName }),
              render: (_value: unknown, row: SalesReportRow) =>
                formatCurrency(getSourceAveragePrice(row, source)),
              title: 'Avg Price',
              width: REPORT_COLUMN_WIDTHS.sourceAveragePrice,
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
        align: 'right',
        dataIndex: 'totalAveragePrice',
        key: 'totalAveragePrice',
        render: (value: SalesReportRow['totalAveragePrice']) =>
          formatCurrency(value),
        title: 'Avg Price',
        width: REPORT_COLUMN_WIDTHS.totalAveragePrice,
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

  function handleExportReport() {
    downloadSalesReportExcel({
      monthLabel: activeMonthLabel,
      productLabel: activeProductLabel,
      rows: filteredRows,
      sources,
      totals: reportTotals,
      year: activeYear,
    })
  }

  return (
    <section
      className="page-panel report-page"
      aria-labelledby="sales-report-heading"
    >
      <div className="page-heading-row">
        <div>
          <Typography.Title id="sales-report-heading" level={2}>
            Sales Report
          </Typography.Title>
        </div>
        <Button
          aria-label="Export sales report to Excel"
          disabled={!canExport}
          icon={<DownloadOutlined />}
          onClick={handleExportReport}
        >
          Export Excel
        </Button>
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
                setSelectedProductId('')
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
              onChange={(value) => {
                setSelectedMonth(value)
                setSelectedProductId('')
              }}
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

          <label className="form-field">
            Product
            <Select
              aria-label="Product"
              disabled={rows.length === 0}
              onChange={(value) => setSelectedProductId(value)}
              optionFilterProp="label"
              options={[
                { label: 'All products', value: '' },
                ...productOptions,
              ]}
              showSearch
              style={{ minWidth: 220 }}
              value={activeProductId}
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
        dataSource={filteredRows}
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
        rowKey={(row) => `${row.projectId}-${row.productId}`}
        scroll={{ x: getReportTableWidth(sources) }}
        size="small"
        summary={() => {
          if (filteredRows.length === 0) {
            return null
          }

          let cellIndex = 0

          return (
            <Table.Summary fixed>
              <Table.Summary.Row>
                <Table.Summary.Cell index={cellIndex++}>
                  <strong>Totals</strong>
                </Table.Summary.Cell>
                {sources.flatMap((source) => {
                  const sourceTotal = reportTotals.sourceTotals[source]

                  return [
                    <Table.Summary.Cell
                      align="right"
                      index={cellIndex++}
                      key={`${source}-quantity-total`}
                    >
                      <strong>{sourceTotal.quantity}</strong>
                    </Table.Summary.Cell>,
                    <Table.Summary.Cell
                      align="right"
                      index={cellIndex++}
                      key={`${source}-amount-total`}
                    >
                      <strong>{formatCurrency(sourceTotal.amount)}</strong>
                    </Table.Summary.Cell>,
                    <Table.Summary.Cell
                      align="right"
                      index={cellIndex++}
                      key={`${source}-average-total`}
                    >
                      <strong>
                        {formatCurrency(sourceTotal.averagePrice)}
                      </strong>
                    </Table.Summary.Cell>,
                  ]
                })}
                <Table.Summary.Cell index={cellIndex++} align="right">
                  <strong>{reportTotals.totalQuantity}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={cellIndex++} align="right">
                  <strong>{formatCurrency(reportTotals.totalAmount)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={cellIndex++} align="right">
                  <strong>
                    {formatCurrency(reportTotals.totalAveragePrice)}
                  </strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={cellIndex++} align="right">
                  <strong>{formatCurrency(reportTotals.fee)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={cellIndex++} align="right">
                  <strong>{formatCurrency(reportTotals.profit)}</strong>
                </Table.Summary.Cell>
                <Table.Summary.Cell index={cellIndex++} align="right">
                  <strong>{formatCurrency(reportTotals.ownerProfit)}</strong>
                </Table.Summary.Cell>
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </section>
  )
}
