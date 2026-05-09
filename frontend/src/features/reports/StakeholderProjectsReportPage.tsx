import type { TableHTMLAttributes } from 'react'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Empty, Progress, Select, Spin, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getJson } from '../../api/client'
import type {
  Project,
  StakeholderProjectReportRow,
  StakeholderProjectStakeholderRow,
  StakeholderProjectTransactionRow,
  StakeholderProjectsReport,
  StakeholderProjectsReportSource,
} from '../../api/types'
import { ProductNameCell } from '../../components/ProductNameCell'
import { formatCurrency } from '../../utils/money'

const OPTION_LIST_PAGE_SIZE = 100
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

function buildReportPath(projectId: number, stakeholderId: number) {
  const query = new URLSearchParams({
    projectId: String(projectId),
    stakeholderId: String(stakeholderId),
  })

  return `/reports/stakeholder-projects?${query.toString()}`
}

function formatProjectOption(project: Project) {
  const productName = project.product?.name?.trim()
  return productName
    ? `Project #${project.idProject} - ${productName}`
    : `Project #${project.idProject}`
}

function getNamedTableComponents(label: string) {
  return {
    table: (props: TableHTMLAttributes<HTMLTableElement>) => (
      <table {...props} aria-label={label} />
    ),
  }
}

export function StakeholderProjectsReportPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)
  const [selectedStakeholderId, setSelectedStakeholderId] = useState<
    number | null
  >(null)
  const projectsQuery = useQuery({
    queryKey: ['reports', 'stakeholder-projects', 'projects'],
    queryFn: () =>
      getJson<Project[]>(`/projects?pageSize=${OPTION_LIST_PAGE_SIZE}`),
  })
  const reportQuery = useQuery({
    enabled: selectedProjectId !== null && selectedStakeholderId !== null,
    queryKey: [
      'reports',
      'stakeholder-projects',
      selectedProjectId,
      selectedStakeholderId,
    ],
    queryFn: () =>
      getJson<StakeholderProjectsReport>(
        buildReportPath(selectedProjectId!, selectedStakeholderId!),
      ),
  })
  const projects = projectsQuery.data ?? []
  const selectedProject = projects.find(
    (project) => project.idProject === selectedProjectId,
  )
  const stakeholderOptions =
    selectedProject?.stakeholders?.map((line) => ({
      label: line.stakeholder?.name ?? `Stakeholder #${line.idStakeholder}`,
      value: line.idStakeholder,
    })) ?? []
  const report = reportQuery.data
  const sources = report?.sources ?? DEFAULT_REPORT_SOURCES
  const row = report?.row ?? null
  const hasSelectedScope =
    selectedProjectId !== null && selectedStakeholderId !== null
  const isLoading =
    projectsQuery.isLoading ||
    (hasSelectedScope && reportQuery.isLoading)
  const sourceColumns = useMemo<ColumnsType<StakeholderProjectReportRow>>(
    () =>
      sources.map((source) => ({
        children: [
          {
            align: 'right' as const,
            key: `${source}-quantity`,
            render: (_value: unknown, reportRow: StakeholderProjectReportRow) =>
              reportRow[source].quantity,
            title: 'Quantity',
            width: 112,
          },
          {
            align: 'right' as const,
            key: `${source}-amount`,
            render: (_value: unknown, reportRow: StakeholderProjectReportRow) =>
              formatCurrency(reportRow[source].amount),
            title: 'Amount',
            width: 136,
          },
        ],
        key: source,
        title: sourceLabels[source],
      })),
    [sources],
  )
  const transactionColumns = useMemo<
    ColumnsType<StakeholderProjectTransactionRow>
  >(
    () => [
      {
        dataIndex: 'date',
        key: 'date',
        render: (value: StakeholderProjectTransactionRow['date']) =>
          value || '-',
        title: 'Date',
        width: 140,
      },
      {
        dataIndex: 'description',
        key: 'description',
        render: (value: StakeholderProjectTransactionRow['description']) =>
          value || '-',
        title: 'Description',
        width: 260,
      },
      {
        align: 'right',
        dataIndex: 'amount',
        key: 'amount',
        render: (value: StakeholderProjectTransactionRow['amount']) =>
          value === undefined ? '-' : formatCurrency(value),
        title: 'Amount',
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

      <div className="report-controls">
        <div className="report-filter-row stakeholder-report-filter-row">
          <label className="form-field">
            Project
            <Select
              aria-label="Project"
              loading={projectsQuery.isLoading}
              onChange={(value) => {
                setSelectedProjectId(value)
                setSelectedStakeholderId(null)
              }}
              options={projects.map((project) => ({
                label: formatProjectOption(project),
                value: project.idProject,
              }))}
              placeholder="Select project"
              showSearch
              value={selectedProjectId}
            />
          </label>

          <label className="form-field">
            Stakeholder
            <Select
              aria-label="Stakeholder"
              disabled={selectedProjectId === null}
              onChange={(value) => setSelectedStakeholderId(value)}
              options={stakeholderOptions}
              placeholder="Select stakeholder"
              showSearch
              value={selectedStakeholderId}
            />
          </label>
        </div>
      </div>

      {projectsQuery.isError ? (
        <Alert
          showIcon
          title="Unable to load report selectors."
          type="error"
        />
      ) : null}

      {reportQuery.isError ? (
        <Alert
          showIcon
          title="Unable to load the stakeholder projects report."
          type="error"
        />
      ) : null}

      {isLoading ? (
        <div className="report-loading">
          <Spin />
        </div>
      ) : null}

      {!isLoading && !hasSelectedScope ? (
        <Empty description="Select a project and stakeholder to load the report." />
      ) : null}

      {!isLoading && hasSelectedScope && !reportQuery.isError && !row ? (
        <Empty description="No stakeholder report found for the selected project and stakeholder." />
      ) : null}

      {!isLoading && row ? (
        <section
          aria-label={`${row.productName} project ${row.projectId}`}
          className="stakeholder-project-report-section"
        >
          <div className="stakeholder-project-header">
            <ProductNameCell imageUrl={row.productImage} name={row.productName} />
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

          <StakeholderDetail
            stakeholder={row.stakeholder}
            transactionColumns={transactionColumns}
            transactions={row.transactions}
          />
        </section>
      ) : null}
    </section>
  )
}

function StakeholderDetail({
  stakeholder,
  transactionColumns,
  transactions,
}: {
  stakeholder: StakeholderProjectStakeholderRow
  transactionColumns: ColumnsType<StakeholderProjectTransactionRow>
  transactions: StakeholderProjectTransactionRow[]
}) {
  return (
    <section
      aria-label={`${stakeholder.stakeholderName} stakeholder detail`}
      className="stakeholder-detail-section"
    >
      <div className="stakeholder-detail-heading">
        <Typography.Title level={3}>{stakeholder.stakeholderName}</Typography.Title>
      </div>

      <div className="stakeholder-project-metrics">
        <Metric
          label="Stake percentage"
          value={formatPercentage(stakeholder.stakePercentage)}
        />
        <Metric
          label="Investment"
          value={formatCurrency(stakeholder.investment)}
        />
        <Metric label="Income" value={formatCurrency(stakeholder.income)} />
        <Metric label="Balance" value={formatCurrency(stakeholder.balance)} />
      </div>

      <Table<StakeholderProjectTransactionRow>
        className="report-table stakeholder-project-transaction-table"
        columns={transactionColumns}
        components={getNamedTableComponents(
          `${stakeholder.stakeholderName} transaction details`,
        )}
        dataSource={transactions}
        locale={{
          emptyText: (
            <Empty description="No stakeholder transactions have been recorded yet." />
          ),
        }}
        pagination={false}
        rowKey={(transaction) => transaction.id}
        scroll={{ x: 540 }}
        size="small"
      />
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
