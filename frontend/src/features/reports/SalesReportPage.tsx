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
  Stakeholder,
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
const EMPTY_STAKEHOLDERS: Stakeholder[] = []
const REPORT_COLUMN_WIDTHS = {
  fee: 90,
  project: 180,
  profit: 88,
  sourceAmount: 104,
  sourceAveragePrice: 104,
  sourceQuantity: 64,
  stakeholderIncome: 132,
  stakePercentage: 88,
  totalAmount: 120,
  totalAveragePrice: 104,
  totalQuantity: 100,
}
const REPORT_SOURCE_GROUP_WIDTH =
  REPORT_COLUMN_WIDTHS.sourceQuantity +
  REPORT_COLUMN_WIDTHS.sourceAmount +
  REPORT_COLUMN_WIDTHS.sourceAveragePrice
const REPORT_STATIC_WIDTH =
  REPORT_COLUMN_WIDTHS.project +
  REPORT_COLUMN_WIDTHS.totalQuantity +
  REPORT_COLUMN_WIDTHS.totalAmount +
  REPORT_COLUMN_WIDTHS.totalAveragePrice +
  REPORT_COLUMN_WIDTHS.fee +
  REPORT_COLUMN_WIDTHS.profit
const REPORT_STAKEHOLDER_WIDTH =
  REPORT_COLUMN_WIDTHS.stakePercentage +
  REPORT_COLUMN_WIDTHS.stakeholderIncome

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: 'UTC',
})

function formatMonth(month: number) {
  return monthFormatter.format(new Date(Date.UTC(2026, month - 1, 1)))
}

function formatProjectLabel(
  row: Pick<SalesReportRow, 'productName' | 'projectId'>,
) {
  const productName = row.productName.trim()
  return productName
    ? `${productName} (Project #${row.projectId})`
    : `Project #${row.projectId}`
}

function buildReportPath(year: string, month: string, stakeholderId: string) {
  const query = new URLSearchParams({ year })
  if (month) {
    query.set('month', month)
  }
  if (stakeholderId) {
    query.set('stakeholderId', stakeholderId)
  }

  return `/reports/sales-summary?${query.toString()}`
}

function getReportTableWidth(
  sources: SalesReportSource[],
  hasSelectedStakeholder: boolean,
) {
  return (
    REPORT_STATIC_WIDTH +
    sources.length * REPORT_SOURCE_GROUP_WIDTH +
    (hasSelectedStakeholder ? REPORT_STAKEHOLDER_WIDTH : 0)
  )
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
    profit: 0,
    sourceTotals,
    stakeholderIncome: 0,
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
    totals.stakeholderIncome += row.stakeholderIncome ?? 0
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
  totals.stakeholderIncome = roundCurrency(totals.stakeholderIncome)

  return totals
}

export function SalesReportPage() {
  const [selectedYear, setSelectedYear] = useState<string | null>(null)
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [selectedStakeholderId, setSelectedStakeholderId] = useState('')
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
  const stakeholdersQuery = useQuery({
    queryKey: ['reports', 'sales-summary', 'stakeholders'],
    queryFn: () => getJson<Stakeholder[]>('/stakeholders?pageSize=100'),
  })
  const stakeholders = stakeholdersQuery.data ?? EMPTY_STAKEHOLDERS
  const reportQuery = useQuery({
    enabled: activeYear !== '',
    queryKey: [
      'reports',
      'sales-summary',
      activeYear,
      selectedMonth,
      selectedStakeholderId,
    ],
    queryFn: () =>
      getJson<SalesReportSummary>(
        buildReportPath(activeYear, selectedMonth, selectedStakeholderId),
      ),
  })
  const report = reportQuery.data
  const sources = report?.sources ?? DEFAULT_REPORT_SOURCES
  const rows = report?.rows ?? EMPTY_REPORT_ROWS
  const activeProjectId =
    selectedProjectId &&
    rows.some((row) => String(row.projectId) === selectedProjectId)
      ? selectedProjectId
      : ''
  const projectOptions = useMemo(() => {
    const optionsByProject = new Map<number, string>()

    for (const row of rows) {
      optionsByProject.set(row.projectId, formatProjectLabel(row))
    }

    return [...optionsByProject.entries()]
      .sort(([, leftLabel], [, rightLabel]) =>
        leftLabel.localeCompare(rightLabel),
      )
      .map(([projectId, projectLabel]) => ({
        label: projectLabel,
        value: String(projectId),
      }))
  }, [rows])
  const stakeholderOptions = useMemo(
    () =>
      [...stakeholders]
        .sort((left, right) => left.name.localeCompare(right.name))
        .map((stakeholder) => ({
          label: stakeholder.name,
          value: String(stakeholder.idStakeholder),
        })),
    [stakeholders],
  )
  const filteredRows = useMemo(
    () =>
      activeProjectId
        ? rows.filter((row) => String(row.projectId) === activeProjectId)
        : rows,
    [activeProjectId, rows],
  )
  const reportTotals = useMemo(
    () => getReportTotals(filteredRows, sources),
    [filteredRows, sources],
  )
  const isLoading =
    reportQuery.isLoading ||
    periodsQuery.isLoading ||
    stakeholdersQuery.isLoading
  const activeMonthLabel = selectedMonth
    ? formatMonth(Number(selectedMonth))
    : 'Full year'
  const activeProjectLabel =
    projectOptions.find((option) => option.value === activeProjectId)?.label ??
    'All projects'
  const activeStakeholderLabel =
    stakeholderOptions.find(
      (option) => option.value === selectedStakeholderId,
    )?.label ?? 'All stakeholders'
  const hasSelectedStakeholder = selectedStakeholderId !== ''
  const canExport = activeYear !== '' && filteredRows.length > 0 && !isLoading
  const columns = useMemo<ColumnsType<SalesReportRow>>(
    () => [
      {
        dataIndex: 'productName',
        key: 'productProject',
        ellipsis: true,
        render: (
          _value: SalesReportRow['productName'],
          row: SalesReportRow,
        ) => {
          const projectLabel = formatProjectLabel(row)

          return (
            <Link
              aria-label={projectLabel}
              className="entity-reference-link"
              to={`/projects/${row.projectId}`}
            >
              <ProductNameCell
                imageUrl={row.productImage}
                name={projectLabel}
                thumbnailAlt={`${row.productName} thumbnail`}
              />
            </Link>
          )
        },
        title: 'Product / Project',
        width: REPORT_COLUMN_WIDTHS.project,
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
      ...(hasSelectedStakeholder
        ? [
            {
              align: 'right' as const,
              dataIndex: 'stakePercentage',
              key: 'stakePercentage',
              render: (value: SalesReportRow['stakePercentage']) =>
                value === null ? '-' : `${value}%`,
              title: 'Stake %',
              width: REPORT_COLUMN_WIDTHS.stakePercentage,
            },
            {
              align: 'right' as const,
              dataIndex: 'stakeholderIncome',
              key: 'stakeholderIncome',
              render: (value: SalesReportRow['stakeholderIncome']) =>
                formatCurrency(value ?? 0),
              title: 'Stakeholder Income',
              width: REPORT_COLUMN_WIDTHS.stakeholderIncome,
            },
          ]
        : []),
    ],
    [hasSelectedStakeholder, sources],
  )

  function handleExportReport() {
    downloadSalesReportExcel({
      monthLabel: activeMonthLabel,
      projectLabel: activeProjectLabel,
      rows: filteredRows,
      sources,
      stakeholderLabel: hasSelectedStakeholder
        ? activeStakeholderLabel
        : undefined,
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
                setSelectedProjectId('')
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
                setSelectedProjectId('')
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
            Stakeholder
            <Select
              aria-label="Stakeholder"
              disabled={stakeholders.length === 0}
              onChange={(value) => {
                setSelectedStakeholderId(value)
                setSelectedProjectId('')
              }}
              optionFilterProp="label"
              options={[
                { label: 'All stakeholders', value: '' },
                ...stakeholderOptions,
              ]}
              showSearch
              style={{ minWidth: 220 }}
              value={selectedStakeholderId}
            />
          </label>

          <label className="form-field">
            Project
            <Select
              aria-label="Project"
              disabled={rows.length === 0}
              onChange={(value) => setSelectedProjectId(value)}
              optionFilterProp="label"
              options={[
                { label: 'All projects', value: '' },
                ...projectOptions,
              ]}
              showSearch
              style={{ minWidth: 220 }}
              value={activeProjectId}
            />
          </label>
        </Space>
      </div>

      {periodsQuery.isError ||
      reportQuery.isError ||
      stakeholdersQuery.isError ? (
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
            <Empty
              description={
                hasSelectedStakeholder
                  ? 'No projects found for the selected stakeholder.'
                  : 'No sales data for the selected period.'
              }
            />
          ),
        }}
        pagination={false}
        rowKey={(row) => row.projectId}
        scroll={{ x: getReportTableWidth(sources, hasSelectedStakeholder) }}
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
                {hasSelectedStakeholder ? (
                  <>
                    <Table.Summary.Cell index={cellIndex++} align="right">
                      <strong>-</strong>
                    </Table.Summary.Cell>
                    <Table.Summary.Cell index={cellIndex++} align="right">
                      <strong>
                        {formatCurrency(reportTotals.stakeholderIncome)}
                      </strong>
                    </Table.Summary.Cell>
                  </>
                ) : null}
              </Table.Summary.Row>
            </Table.Summary>
          )
        }}
      />
    </section>
  )
}
