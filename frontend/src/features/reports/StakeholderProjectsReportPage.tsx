import {
  ArrowLeftOutlined,
  PieChartOutlined,
  PrinterOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Empty, Progress, Space, Spin, Typography } from 'antd'
import { Link, useSearchParams } from 'react-router-dom'
import { getJson } from '../../api/client'
import type {
  Project,
  StakeholderProjectReportRow,
  StakeholderProjectStakeholderRow,
  StakeholderProjectsReport,
  StakeholderProjectsReportSource,
} from '../../api/types'
import { formatCurrency } from '../../utils/money'
import { StakeholderProjectTransactionLines } from './StakeholderProjectTransactionLines'
import {
  ProjectsForStakeholder,
  StakeholderProjectCounts,
} from './StakeholderProjectsDrillDown'
import {
  buildProjectReportPath,
  buildStakeholderProjectsPath,
  stakeholderProjectsReportKeys,
  stakeholderProjectsReportPath,
} from './stakeholderProjectsReportQueries'

const sourceLabels: Record<StakeholderProjectsReportSource, string> = {
  ecommerce: 'Comercio electrónico',
  event: 'Evento',
  store: 'Tienda',
  surface: 'Surface',
}
const DEFAULT_REPORT_SOURCES: StakeholderProjectsReportSource[] = [
  'store',
  'ecommerce',
  'event',
]
const sourceTones: Record<StakeholderProjectsReportSource, string> = {
  ecommerce: 'emerald',
  event: 'amber',
  store: 'blue',
  surface: 'violet',
}

function formatPercentage(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  return `${new Intl.NumberFormat('es-MX', {
    maximumFractionDigits: 2,
  }).format(numericValue)}%`
}

function formatUnits(value: unknown) {
  const numericValue = Number(value)
  return Number.isFinite(numericValue)
    ? numericValue.toLocaleString('es-MX')
    : '-'
}

function formatUnitCount(value: unknown) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return '-'
  }

  return `${formatUnits(numericValue)} ${numericValue === 1 ? 'unidad' : 'unidades'}`
}

function formatProjectRoi(profit: unknown, calculatedCost: unknown) {
  const numericProfit = Number(profit)
  const numericCalculatedCost = Number(calculatedCost)

  if (
    !Number.isFinite(numericProfit) ||
    !Number.isFinite(numericCalculatedCost) ||
    numericCalculatedCost === 0
  ) {
    return '-'
  }

  return formatPercentage((numericProfit / numericCalculatedCost) * 100)
}

function buildPrintReportPath(projectId: number, stakeholderId: number) {
  return `${stakeholderProjectsReportPath}/print?projectId=${projectId}&stakeholderId=${stakeholderId}`
}

function useReportProject(projectId: number | null) {
  return useQuery({
    enabled: projectId !== null,
    queryKey: stakeholderProjectsReportKeys.project(projectId),
    queryFn: () => getJson<Project>(`/projects/${projectId!}`),
  })
}

function useStakeholderProjectReport(
  projectId: number | null,
  stakeholderId: number | null,
) {
  return useQuery({
    enabled: projectId !== null && stakeholderId !== null,
    queryKey: stakeholderProjectsReportKeys.detail(projectId, stakeholderId),
    queryFn: () =>
      getJson<StakeholderProjectsReport>(
        buildProjectReportPath(projectId!, stakeholderId!),
      ),
  })
}

function parseIdParam(value: string | null) {
  const numericValue = Number(value)

  return Number.isSafeInteger(numericValue) && numericValue > 0
    ? numericValue
    : null
}

export function StakeholderProjectsReportPage() {
  const [searchParams] = useSearchParams()
  const projectId = parseIdParam(searchParams.get('projectId'))
  const stakeholderId = parseIdParam(searchParams.get('stakeholderId'))
  const isInvalidScope =
    (searchParams.has('stakeholderId') && stakeholderId === null) ||
    (searchParams.has('projectId') &&
      (projectId === null || stakeholderId === null))
  const hasSelectedScope = projectId !== null && stakeholderId !== null
  const projectQuery = useReportProject(hasSelectedScope ? projectId : null)
  const reportQuery = useStakeholderProjectReport(projectId, stakeholderId)
  const row = reportQuery.data?.row ?? null
  const isLoadingDetail =
    reportQuery.isLoading || (row !== null && projectQuery.isLoading)
  const printReportPath = row
    ? buildPrintReportPath(row.projectId, row.stakeholder.stakeholderId)
    : null

  return (
    <section
      className="stakeholder-projects-page"
      aria-labelledby="stakeholder-projects-report-heading"
    >
      <div className="stakeholder-projects-heading">
        <div className="stakeholder-projects-heading-icon" aria-hidden="true">
          <PieChartOutlined />
        </div>
        <div>
          <Typography.Title id="stakeholder-projects-report-heading" level={2}>
            Proyectos por socio
          </Typography.Title>
          <Typography.Text className="stakeholder-projects-subtitle">
            Rendimiento de la inversión e historial de transacciones
          </Typography.Text>
        </div>
        {printReportPath ? (
          <div className="stakeholder-projects-heading-actions">
            <Button
              aria-label="Imprimir reporte"
              href={printReportPath}
              icon={<PrinterOutlined />}
              type="primary"
            >
              Imprimir
            </Button>
          </div>
        ) : null}
      </div>

      {stakeholderId !== null || isInvalidScope ? (
        <nav aria-label="Navegación del reporte">
          <Link
            to={
              hasSelectedScope
                ? buildStakeholderProjectsPath(stakeholderId)
                : stakeholderProjectsReportPath
            }
          >
            <Space size="small">
              <ArrowLeftOutlined aria-hidden="true" />
              {hasSelectedScope
                ? 'Volver a los proyectos del socio'
                : 'Volver a los socios'}
            </Space>
          </Link>
        </nav>
      ) : null}

      {isInvalidScope ? (
        <Alert showIcon title="El enlace del reporte no es válido." type="error" />
      ) : null}

      {!isInvalidScope && stakeholderId === null ? <StakeholderProjectCounts /> : null}

      {!isInvalidScope && stakeholderId !== null && projectId === null ? (
        <ProjectsForStakeholder stakeholderId={stakeholderId} />
      ) : null}

      {reportQuery.isError ? (
        <Alert
          showIcon
          title="No se pudo cargar el reporte de proyectos por socio."
          type="error"
        />
      ) : null}

      {row && projectQuery.isError ? (
        <Alert showIcon title="No se pudo cargar el enlace del producto." type="error" />
      ) : null}

      {isLoadingDetail ? (
        <div className="report-loading">
          <Spin />
        </div>
      ) : null}

      {hasSelectedScope && !isLoadingDetail && !reportQuery.isError && !row ? (
        <Empty description="No se encontró un reporte para el proyecto y el socio seleccionados." />
      ) : null}

      {!isLoadingDetail && row ? (
        <StakeholderProjectsReportContent
          readOnlyTransactions={false}
          row={row}
          selectedProjectProductId={projectQuery.data?.idProduct ?? null}
          sources={reportQuery.data?.sources ?? DEFAULT_REPORT_SOURCES}
        />
      ) : null}
    </section>
  )
}

export function StakeholderProjectsReportPrintPage() {
  const [searchParams] = useSearchParams()
  const selectedProjectId = parseIdParam(searchParams.get('projectId'))
  const selectedStakeholderId = parseIdParam(searchParams.get('stakeholderId'))
  const hasSelectedScope =
    selectedProjectId !== null && selectedStakeholderId !== null

  const projectQuery = useReportProject(selectedProjectId)
  const reportQuery = useStakeholderProjectReport(
    selectedProjectId,
    selectedStakeholderId,
  )
  const report = reportQuery.data
  const sources = report?.sources ?? DEFAULT_REPORT_SOURCES
  const row = report?.row ?? null

  return (
    <section
      className="stakeholder-projects-page stakeholder-projects-print-page"
      aria-labelledby="stakeholder-projects-report-heading"
    >
      <div className="stakeholder-projects-heading">
        <div className="stakeholder-projects-heading-icon" aria-hidden="true">
          <PieChartOutlined />
        </div>
        <div>
          <Typography.Title id="stakeholder-projects-report-heading" level={2}>
            Proyectos por socio
          </Typography.Title>
          <Typography.Text className="stakeholder-projects-subtitle">
            Reporte para imprimir
          </Typography.Text>
        </div>
      </div>

      {!hasSelectedScope ? (
        <Empty description="Abre este reporte para imprimir desde un reporte con un proyecto y un socio seleccionados." />
      ) : null}

      {reportQuery.isError ? (
        <Alert
          showIcon
          title="No se pudo cargar el reporte de proyectos por socio."
          type="error"
        />
      ) : null}

      {hasSelectedScope && reportQuery.isLoading ? (
        <div className="report-loading">
          <Spin />
        </div>
      ) : null}

      {hasSelectedScope && !reportQuery.isLoading && !reportQuery.isError && !row ? (
        <Empty description="No se encontró un reporte para el proyecto y el socio seleccionados." />
      ) : null}

      {row ? (
        <StakeholderProjectsReportContent
          readOnlyTransactions
          row={row}
          selectedProjectProductId={projectQuery.data?.idProduct ?? null}
          sources={sources}
        />
      ) : null}
    </section>
  )
}

function StakeholderProjectsReportContent({
  readOnlyTransactions,
  row,
  selectedProjectProductId,
  sources,
}: {
  readOnlyTransactions: boolean
  row: StakeholderProjectReportRow
  selectedProjectProductId: number | null
  sources: StakeholderProjectsReportSource[]
}) {
  const isFixedRoiPrintView = readOnlyTransactions && row.fixedRoi
  const profitDifferenceTone =
    row.profitDifference === null
      ? undefined
      : row.profitDifference < 0
        ? 'negative'
        : row.profitDifference > 0
          ? 'positive'
          : undefined

  return (
    <>
      <section
        aria-label={`${row.productName}, proyecto ${row.projectId}`}
        className="stakeholder-project-card"
      >
        <div className="stakeholder-project-summary-header">
          <div className="stakeholder-project-product">
            <div className="stakeholder-project-product-image">
              {row.productImage ? (
                <img
                  alt={`Miniatura de ${row.productName}`}
                  src={row.productImage}
                />
              ) : (
                <span>{row.productName.charAt(0) || '?'}</span>
              )}
            </div>
            <div>
              {selectedProjectProductId !== null ? (
                <Link
                  aria-label={row.productName}
                  className="entity-reference-link"
                  to={`/products/${selectedProjectProductId}`}
                >
                  <Typography.Title level={3}>
                    {row.productName}
                  </Typography.Title>
                </Link>
              ) : (
                <Typography.Title level={3}>{row.productName}</Typography.Title>
              )}
              <Link
                aria-label={`Proyecto #${row.projectId}`}
                className="entity-reference-link"
                to={`/projects/${row.projectId}`}
              >
                <Typography.Text type="secondary">
                  Proyecto #{row.projectId}
                </Typography.Text>
              </Link>
            </div>
          </div>

          {!isFixedRoiPrintView ? (
            <div className="stakeholder-project-progress">
              <Typography.Text type="secondary">
                {`${formatUnits(row.totalUnitsSold)} / ${formatUnits(row.totalUnits)} unidades vendidas`}
              </Typography.Text>
              <div className="stakeholder-project-progress-row">
                <Progress
                  percent={row.projectProgress}
                  showInfo={false}
                  size="small"
                  strokeColor="#f59e0b"
                />
                <Typography.Text className="stakeholder-project-progress-value">
                  {formatPercentage(row.projectProgress)}
                </Typography.Text>
              </div>
            </div>
          ) : null}
        </div>

        <div
          aria-label={`${row.productName}, totales por origen`}
          className="stakeholder-source-grid"
          role="list"
        >
          {sources.map((source) => (
            <div
              className={`stakeholder-source-card stakeholder-source-card-${sourceTones[source]}`}
              key={source}
              role="listitem"
            >
              <Typography.Text className="stakeholder-source-label">
                {sourceLabels[source]}
              </Typography.Text>
              <Typography.Text className="stakeholder-source-units">
                {formatUnitCount(row[source].quantity)}
              </Typography.Text>
              {!isFixedRoiPrintView ? (
                <Typography.Text className="stakeholder-source-amount">
                  {formatCurrency(row[source].amount)}
                </Typography.Text>
              ) : null}
            </div>
          ))}
        </div>

        <div className="stakeholder-project-metrics">
          {isFixedRoiPrintView ? (
            <>
              <Metric
                label="Unidades vendidas"
                value={formatUnits(row.totalUnitsSold)}
              />
              <Metric
                label="Costo calculado"
                value={formatCurrency(row.calculatedCost)}
              />
              <Metric
                label="ROI fijo"
                value={formatPercentage(row.fixedRoiPercentage)}
              />
              <Metric
                label="Utilidad otorgada"
                value={formatCurrency(row.fixedRoiProfit)}
              />
            </>
          ) : (
            <>
              <Metric
                label="Unidades restantes"
                value={formatUnits(row.unitsLeft)}
              />
              <Metric
                label="Ventas totales"
                value={formatCurrency(row.totalSales)}
              />
              <Metric
                label="Comisiones totales"
                value={formatCurrency(row.totalFees)}
              />
              <Metric
                label="Ventas netas totales"
                value={formatCurrency(row.netSalesTotal)}
              />
              <Metric
                label="Costo calculado"
                value={formatCurrency(row.calculatedCost)}
              />
              <Metric
                label="Utilidad"
                tone="positive"
                value={formatCurrency(row.profit)}
              />
              <Metric
                label="ROI del proyecto"
                value={formatProjectRoi(row.profit, row.calculatedCost)}
              />
              {row.fixedRoi ? (
                <>
                  <Metric
                    label="ROI fijo"
                    value={formatPercentage(row.fixedRoiPercentage)}
                  />
                  <Metric
                    label="Utilidad otorgada"
                    value={formatCurrency(row.fixedRoiProfit)}
                  />
                  <Metric
                    label="Diferencia de utilidad"
                    tone={profitDifferenceTone}
                    value={formatCurrency(row.profitDifference)}
                  />
                </>
              ) : null}
            </>
          )}
        </div>
      </section>

      <StakeholderDetail
        projectId={row.projectId}
        readOnlyTransactions={readOnlyTransactions}
        stakeholder={row.stakeholder}
      />
    </>
  )
}

function StakeholderDetail({
  projectId,
  readOnlyTransactions,
  stakeholder,
}: {
  projectId: number
  readOnlyTransactions: boolean
  stakeholder: StakeholderProjectStakeholderRow
}) {
  const hasAdjustments = stakeholder.adjustmentCount > 0
  const adjustmentTone =
    stakeholder.adjustments < 0
      ? 'negative'
      : stakeholder.adjustments > 0
        ? 'positive'
        : undefined

  return (
    <>
      <section
        aria-label={`${stakeholder.stakeholderName}, detalle del socio`}
        className="stakeholder-detail-card"
      >
        <div className="stakeholder-detail-heading">
          <Link
            aria-label={stakeholder.stakeholderName}
            className="entity-reference-link"
            to={`/stakeholders/${stakeholder.stakeholderId}`}
          >
            <Typography.Title level={3}>
              {stakeholder.stakeholderName}
            </Typography.Title>
          </Link>
        </div>

        <div className="stakeholder-project-metrics stakeholder-detail-metrics">
          <Metric
            label="Participación %"
            value={formatPercentage(stakeholder.stakePercentage)}
          />
          <Metric
            label="Saldo de inversión"
            tone={stakeholder.investment < 0 ? 'negative' : undefined}
            value={formatCurrency(stakeholder.investment)}
          />
          <Metric
            label="Pagos"
            tone="positive"
            value={formatCurrency(stakeholder.payments)}
          />
          <Metric
            label="Ingreso correspondiente"
            tone="income"
            value={formatCurrency(stakeholder.income)}
          />
          {hasAdjustments ? (
            <Metric
              label="Ajustes"
              tone={adjustmentTone}
              value={formatCurrency(stakeholder.adjustments)}
            />
          ) : null}
          <Metric
            label="Saldo"
            tone="warning"
            value={formatCurrency(stakeholder.balance)}
          />
        </div>
      </section>

      <StakeholderProjectTransactionLines
        key={`${projectId}-${stakeholder.stakeholderId}`}
        projectId={projectId}
        readOnly={readOnlyTransactions}
        stakeholderId={stakeholder.stakeholderId}
        stakeholderName={stakeholder.stakeholderName}
      />
    </>
  )
}

function Metric({
  label,
  tone,
  value,
}: {
  label: string
  tone?: 'income' | 'negative' | 'positive' | 'warning'
  value: number | string
}) {
  return (
    <div className="stakeholder-project-metric">
      <Typography.Text className="metric-label">{label}</Typography.Text>
      <Typography.Text
        className={`metric-value${tone ? ` metric-value-${tone}` : ''}`}
      >
        {value}
      </Typography.Text>
    </div>
  )
}
