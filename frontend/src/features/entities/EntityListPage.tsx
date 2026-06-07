import { useMemo, useState, type Dispatch, type SetStateAction } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Button, Select, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getJson } from '../../api/client'
import type { Product, Project, SalesReportPeriod } from '../../api/types'
import {
  DataTable,
  type DataTableColumn,
  type DataTableSummaryItem,
} from '../../components/DataTable'
import { parseMoneyNumber } from '../../utils/money'
import { getEntityConfig, type EntityRow } from './entityConfigs'

const ENTITY_LIST_PAGE_SIZE = 100

type SalesFilters = {
  idProduct?: string
  idProject?: string
  month?: string
}

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  timeZone: 'UTC',
  year: 'numeric',
})

function buildEntityListPath(
  path: string,
  salesFilters: SalesFilters,
) {
  const query = new URLSearchParams({
    pageSize: String(ENTITY_LIST_PAGE_SIZE),
  })

  if (path === 'sales') {
    if (salesFilters.idProduct) {
      query.set('idProduct', salesFilters.idProduct)
    }

    if (salesFilters.idProject) {
      query.set('idProject', salesFilters.idProject)
    }

    if (salesFilters.month) {
      query.set('month', salesFilters.month)
    }
  }

  return `/${path}?${query.toString()}`
}

function formatProjectOption(project: Project) {
  return project.product?.name
    ? `Project #${String(project.idProject)} - ${project.product.name}`
    : `Project #${String(project.idProject)}`
}

function formatMonthValue(value: string) {
  const [year, month] = value.split('-').map(Number)
  return monthFormatter.format(new Date(Date.UTC(year, month - 1, 1)))
}

function buildMonthOptions(periods: SalesReportPeriod[]) {
  return periods
    .flatMap((period) =>
      Array.isArray(period.months)
        ? period.months.map((month) => {
            const value = `${period.year}-${String(month).padStart(2, '0')}`
            return {
              label: formatMonthValue(value),
              value,
            }
          })
        : [],
    )
    .sort((left, right) => right.value.localeCompare(left.value))
}

function getTableColumnValue(
  row: EntityRow,
  column: DataTableColumn<EntityRow>,
) {
  return column.valueGetter ? column.valueGetter(row) : row[column.key]
}

function sumTableColumn(
  rows: EntityRow[],
  columns: DataTableColumn<EntityRow>[],
  columnKey: string,
) {
  const column = columns.find((candidate) => candidate.key === columnKey)

  if (!column) {
    return 0
  }

  return rows.reduce(
    (total, row) =>
      total + (parseMoneyNumber(getTableColumnValue(row, column)) ?? 0),
    0,
  )
}

function getTableSummaryItems(
  rows: EntityRow[],
  columns: DataTableColumn<EntityRow>[],
  isSalesPage: boolean,
): DataTableSummaryItem<EntityRow>[] | undefined {
  return isSalesPage
    ? [
        {
          columnKey: 'ownerProfit',
          label: 'Total Owner Profit',
          value: sumTableColumn(rows, columns, 'ownerProfit'),
          valueFormat: 'money',
        },
      ]
    : undefined
}

type SalesTableFiltersProps = {
  filters: SalesFilters
  isLoading: boolean
  periods: SalesReportPeriod[]
  products: Product[]
  projects: Project[]
  setFilters: Dispatch<SetStateAction<SalesFilters>>
}

function SalesTableFilters({
  filters,
  isLoading,
  periods,
  products,
  projects,
  setFilters,
}: SalesTableFiltersProps) {
  const selectedProductId = filters.idProduct
    ? Number(filters.idProduct)
    : null
  const projectOptions = projects
    .filter((project) =>
      selectedProductId === null ? true : project.idProduct === selectedProductId,
    )
    .map((project) => ({
      label: formatProjectOption(project),
      value: String(project.idProject),
    }))
  const productOptions = products.map((product) => ({
    label: product.name,
    value: String(product.id),
  }))
  const monthOptions = buildMonthOptions(periods)

  return (
    <section
      aria-label="Sales filters"
      className="sales-table-filters"
      role="region"
    >
      <label className="sales-table-filter">
        <span>Product</span>
        <Select
          allowClear
          aria-label="Product filter"
          loading={isLoading}
          optionFilterProp="label"
          options={productOptions}
          placeholder="All products"
          showSearch
          value={filters.idProduct}
          onChange={(value?: string) => {
            setFilters((current) => {
              const nextProductId = value ? Number(value) : null
              const currentProject = projects.find(
                (project) => String(project.idProject) === current.idProject,
              )

              return {
                ...current,
                idProduct: value,
                idProject:
                  nextProductId !== null &&
                  currentProject?.idProduct === nextProductId
                    ? current.idProject
                    : undefined,
              }
            })
          }}
        />
      </label>

      <label className="sales-table-filter">
        <span>Project</span>
        <Select
          allowClear
          aria-label="Project filter"
          loading={isLoading}
          optionFilterProp="label"
          options={projectOptions}
          placeholder="All projects"
          showSearch
          value={filters.idProject}
          onChange={(value?: string) =>
            setFilters((current) => ({ ...current, idProject: value }))
          }
        />
      </label>

      <label className="sales-table-filter">
        <span>Month</span>
        <Select
          allowClear
          aria-label="Month filter"
          loading={isLoading}
          options={monthOptions}
          placeholder="All months"
          value={filters.month}
          onChange={(value?: string) =>
            setFilters((current) => ({ ...current, month: value }))
          }
        />
      </label>
    </section>
  )
}

function UnknownEntityPage() {
  return (
    <section className="page-panel" aria-labelledby="unknown-entity-heading">
      <h2 id="unknown-entity-heading">Unknown Entity</h2>
      <p className="page-description">
        The requested admin entity is not configured.
      </p>
    </section>
  )
}

export function EntityListPage() {
  const { entityName } = useParams()
  const navigate = useNavigate()
  const [salesFilters, setSalesFilters] = useState<SalesFilters>({})
  const config = getEntityConfig(entityName)
  const isSalesPage = config?.path === 'sales'
  const listPath = useMemo(
    () => (config ? buildEntityListPath(config.path, salesFilters) : ''),
    [config, salesFilters],
  )

  const query = useQuery({
    enabled: Boolean(config),
    queryKey: ['entities', listPath],
    queryFn: () => getJson<EntityRow[]>(listPath),
  })
  const productsQuery = useQuery({
    enabled: isSalesPage,
    queryKey: ['sales-table-filters', 'products'],
    queryFn: () => getJson<Product[]>('/products?pageSize=100'),
  })
  const projectsQuery = useQuery({
    enabled: isSalesPage,
    queryKey: ['sales-table-filters', 'projects'],
    queryFn: () => getJson<Project[]>('/projects?pageSize=100'),
  })
  const periodsQuery = useQuery({
    enabled: isSalesPage,
    queryKey: ['sales-table-filters', 'months'],
    queryFn: () =>
      getJson<SalesReportPeriod[]>('/reports/sales-summary/periods'),
  })

  if (!config) {
    return <UnknownEntityPage />
  }

  const rows = query.data ?? []

  return (
    <section className="page-panel" aria-labelledby={`${config.path}-heading`}>
      <div className="page-heading-row">
        <Typography.Title id={`${config.path}-heading`} level={2}>
          {config.title}
        </Typography.Title>
      </div>

      {query.isError ? (
        <div className="form-error" role="alert">
          Unable to load {config.title.toLowerCase()}.
        </div>
      ) : null}

      <DataTable
        columns={config.columns}
        emptyMessage={`No ${config.title.toLowerCase()} found.`}
        getRowId={(row) => String(row[config.idField])}
        isLoading={query.isLoading}
        onRowDoubleClick={(row) =>
          navigate(`/${config.path}/${String(row[config.idField])}`)
        }
        rows={rows}
        summaryItems={getTableSummaryItems(rows, config.columns, isSalesPage)}
        toolbarAction={
          <Link to={`/${config.path}/new`}>
            <Button icon={<PlusOutlined />} type="primary">
              Create
            </Button>
          </Link>
        }
        toolbarFilters={
          isSalesPage ? (
            <SalesTableFilters
              filters={salesFilters}
              isLoading={
                productsQuery.isLoading ||
                projectsQuery.isLoading ||
                periodsQuery.isLoading
              }
              periods={periodsQuery.data ?? []}
              products={productsQuery.data ?? []}
              projects={projectsQuery.data ?? []}
              setFilters={setSalesFilters}
            />
          ) : null
        }
      />
    </section>
  )
}
