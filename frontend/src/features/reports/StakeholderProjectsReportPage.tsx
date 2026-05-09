import type { TableHTMLAttributes } from 'react'
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Empty, Progress, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getJson } from '../../api/client'
import type {
  StakeholderProjectReportRow,
  StakeholderProjectStakeholderRow,
  StakeholderProjectsReport,
  StakeholderProjectsReportSource,
} from '../../api/types'
import { ProductNameCell } from '../../components/ProductNameCell'
import { formatCurrency } from '../../utils/money'

const sourceLabels: Record<StakeholderProjectsReportSource, string> = {
  ecommerce: 'Ecommerce',
  event: 'Event',
  store: 'Store',
  surface: 'Surface',
}
const DEFAULT_REPORT_SOURCES: StakeholderProjectsReportSource[] = [
  'store',
  'ecommerce',
  'event',
]

function formatPercentage(value: unknown) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? `${numericValue.toFixed(2)}%` : '-'
}

function getNamedTableComponents(label: string) {
  return {
    table: (props: TableHTMLAttributes<HTMLTableElement>) => (
      <table {...props} aria-label={label} />
    ),
  }
}

export function StakeholderProjectsReportPage() {
  const reportQuery = useQuery({
    queryKey: ['reports', 'stakeholder-projects'],
    queryFn: () =>
      getJson<StakeholderProjectsReport>('/reports/stakeholder-projects'),
  })
  const report = reportQuery.data
  const sources = report?.sources ?? DEFAULT_REPORT_SOURCES
  const rows = report?.rows ?? []
  const isLoading = reportQuery.isLoading
  const sourceColumns = useMemo<ColumnsType<StakeholderProjectReportRow>>(
    () =>
      sources.map((source) => ({
        children: [
          {
            align: 'right' as const,
            key: `${source}-quantity`,
            render: (_value: unknown, row: StakeholderProjectReportRow) =>
              row[source].quantity,
            title: 'Quantity',
            width: 112,
          },
          {
            align: 'right' as const,
            key: `${source}-amount`,
            render: (_value: unknown, row: StakeholderProjectReportRow) =>
              formatCurrency(row[source].amount),
            title: 'Amount',
            width: 136,
          },
        ],
        key: source,
        title: sourceLabels[source],
      })),
    [sources],
  )
  const stakeholderColumns = useMemo<
    ColumnsType<StakeholderProjectStakeholderRow>
  >(
    () => [
      {
        dataIndex: 'stakeholderName',
        key: 'stakeholderName',
        title: 'Stakeholder',
        width: 220,
      },
      {
        align: 'right',
        dataIndex: 'stakePercentage',
        key: 'stakePercentage',
        render: (value: StakeholderProjectStakeholderRow['stakePercentage']) =>
          formatPercentage(value),
        title: 'Stake %',
        width: 120,
      },
      {
        align: 'right',
        dataIndex: 'investment',
        key: 'investment',
        render: (value: StakeholderProjectStakeholderRow['investment']) =>
          formatCurrency(value),
        title: 'Investment',
        width: 140,
      },
      {
        align: 'right',
        dataIndex: 'income',
        key: 'income',
        render: (value: StakeholderProjectStakeholderRow['income']) =>
          formatCurrency(value),
        title: 'Income',
        width: 140,
      },
      {
        align: 'right',
        dataIndex: 'balance',
        key: 'balance',
        render: (value: StakeholderProjectStakeholderRow['balance']) =>
          formatCurrency(value),
        title: 'Balance',
        width: 140,
      },
    ],
    [],
  )

  return (
    <section
      className="page-panel report-page"
      aria-labelledby="stakeholder-projects-report-heading"
    >
      <div className="page-heading-row">
        <div>
          <Typography.Title id="stakeholder-projects-report-heading" level={2}>
            Stakeholder Projects Report
          </Typography.Title>
        </div>
      </div>

      {reportQuery.isError ? (
        <Alert
          message="Unable to load the stakeholder projects report."
          showIcon
          type="error"
        />
      ) : null}

      {isLoading ? (
        <div className="report-loading">
          <Spin />
        </div>
      ) : null}

      {!isLoading && !reportQuery.isError && rows.length === 0 ? (
        <Empty description="No stakeholder project data is available." />
      ) : null}

      {!isLoading && rows.length > 0 ? (
        <div className="stakeholder-project-report-list">
          {rows.map((row) => (
            <section
              aria-label={`${row.productName} project ${row.projectId}`}
              className="stakeholder-project-report-section"
              key={row.projectId}
            >
              <div className="stakeholder-project-header">
                <ProductNameCell
                  imageUrl={row.productImage}
                  name={row.productName}
                />
                <Typography.Text strong>Project #{row.projectId}</Typography.Text>
                <Progress
                  percent={row.projectProgress}
                  showInfo={false}
                  size="small"
                />
                <Typography.Text strong>
                  {formatPercentage(row.projectProgress)}
                </Typography.Text>
                <Typography.Text type="secondary">
                  {row.totalUnitsSold} / {row.totalUnits} units sold
                </Typography.Text>
              </div>

              <Table<StakeholderProjectReportRow>
                className="report-table stakeholder-project-source-table"
                columns={sourceColumns}
                components={getNamedTableComponents(
                  `${row.productName} source totals`,
                )}
                dataSource={[row]}
                pagination={false}
                rowKey={(sourceRow) => `${sourceRow.projectId}-sources`}
                scroll={{ x: sources.length * 248 }}
                size="small"
              />

              <div className="stakeholder-project-metrics">
                <Metric label="Units left" value={row.unitsLeft} />
                <Metric label="Total sales" value={formatCurrency(row.totalSales)} />
                <Metric label="Total fees" value={formatCurrency(row.totalFees)} />
                <Metric
                  label="Net sales total"
                  value={formatCurrency(row.netSalesTotal)}
                />
                <Metric
                  label="Calculated cost"
                  value={formatCurrency(row.calculatedCost)}
                />
                <Metric label="Profit" value={formatCurrency(row.profit)} />
              </div>

              <Table<StakeholderProjectStakeholderRow>
                className="report-table stakeholder-project-stakeholder-table"
                columns={stakeholderColumns}
                components={getNamedTableComponents(
                  `${row.productName} stakeholder balances`,
                )}
                dataSource={row.stakeholders}
                locale={{
                  emptyText: (
                    <Empty description="No stakeholders assigned to this project." />
                  ),
                }}
                pagination={false}
                rowKey={(stakeholder) => stakeholder.stakeholderId}
                scroll={{ x: 760 }}
                size="small"
              />
            </section>
          ))}
        </div>
      ) : null}
    </section>
  )
}

function Metric({
  label,
  value,
}: {
  label: string
  value: number | string
}) {
  return (
    <div className="stakeholder-project-metric">
      <Typography.Text className="metric-label">{label}</Typography.Text>
      <Typography.Text className="metric-value">{value}</Typography.Text>
    </div>
  )
}
