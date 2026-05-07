import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Empty,
  Popconfirm,
  Result,
  Space,
  Spin,
  Table,
  Typography,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate, useParams } from 'react-router-dom'
import { deleteJson, getJson, patchJson, postJson, putJson } from '../../api/client'
import { EntityForm } from '../../components/EntityForm'
import { ProductNameCell } from '../../components/ProductNameCell'
import { parseMoneyNumber } from '../../utils/money'
import {
  getEntityConfig,
  type EntityConfig,
  type EntityField,
  type EntityRow,
} from './entityConfigs'
import {
  ProjectStakeholderLines,
  type ProjectStakeholderSplitPayloadRow,
  type ProjectStakeholderSplitState,
} from './ProjectStakeholderLines'

const EMPTY_PROJECT_SPLIT_STATE: ProjectStakeholderSplitState = {
  errorMessage: null,
  hasRows: false,
  isValid: true,
  rows: [],
}

type BuildEntityPayloadOptions = {
  isCreate: boolean
  originalValues: EntityRow
  touchedFieldNames: ReadonlySet<string>
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'The request could not be completed.'
}

function normalizeDateValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)
  }

  if (typeof value !== 'string') {
    return ''
  }

  const trimmedValue = value.trim()
  const dateMatch = trimmedValue.match(/^(\d{4}-\d{2}-\d{2})/)
  return dateMatch?.[1] ?? ''
}

function serializeFieldValue(
  value: unknown,
  field: EntityField,
  options: BuildEntityPayloadOptions,
): boolean | string | number | undefined {
  if (field.type === 'checkbox') {
    return value === true || value === 'true'
  }

  if (field.valueFormat === 'money') {
    return parseMoneyNumber(value) ?? undefined
  }

  if (field.type === 'number' || field.valueType === 'number') {
    const trimmedValue = typeof value === 'string' ? value.trim() : value
    if (
      trimmedValue === '' ||
      trimmedValue === null ||
      trimmedValue === undefined
    ) {
      return undefined
    }

    const numericValue = Number(trimmedValue)
    return Number.isFinite(numericValue) ? numericValue : undefined
  }

  if (field.type === 'date') {
    const dateValue = normalizeDateValue(value)
    return dateValue || undefined
  }

  if (typeof value !== 'string') {
    return value === null || value === undefined
      ? undefined
      : String(value).trim()
  }

  const trimmedValue = value.trim()
  if (isOptionalTextField(field) && trimmedValue === '') {
    if (
      !options.isCreate &&
      (options.touchedFieldNames.has(field.name) ||
        typeof options.originalValues[field.name] === 'string')
    ) {
      return ''
    }

    return undefined
  }

  return trimmedValue || undefined
}

function isOptionalTextField(field: EntityField) {
  return (
    (field.type === 'text' || field.type === 'textarea') &&
    !field.required &&
    !field.requiredOnCreate
  )
}

function buildEntityPayload(
  config: EntityConfig,
  values: EntityRow,
  options: BuildEntityPayloadOptions,
): EntityRow {
  return Object.fromEntries(
    config.fields.flatMap((field) => {
      if (
        (field.type === 'computed' && !field.persistComputed) ||
        field.type === 'imagePreview'
      ) {
        return []
      }

      const rawValue =
        field.type === 'computed' && field.computeValue
          ? field.computeValue(values)
          : values[field.name]
      const value = serializeFieldValue(rawValue, field, options)
      return value === undefined ? [] : [[field.name, value]]
    }),
  )
}

function getOptionSources(config: EntityConfig | null) {
  if (!config) {
    return []
  }

  return Array.from(
    new Set(
      config.fields
        .map((field) => field.optionSource?.path)
        .filter((path): path is EntityConfig['path'] => Boolean(path)),
    ),
  )
}

function buildFieldOptions(field: EntityField, rows: EntityRow[] | undefined) {
  const optionSource = field.optionSource

  if (!optionSource || !Array.isArray(rows)) {
    return field.options
  }

  return rows.flatMap((row) => {
    const rawValue = row[optionSource.valueField]
    const rawLabel = row[optionSource.labelField]
    const formattedLabel = optionSource.labelFormatter?.(row)

    if (rawValue === null || rawValue === undefined) {
      return []
    }

    const fallbackLabel =
      rawLabel === null ||
      rawLabel === undefined ||
      String(rawLabel).trim() === ''
        ? String(rawValue)
        : String(rawLabel)
    const label =
      typeof formattedLabel === 'string' && formattedLabel.trim() !== ''
        ? formattedLabel
        : fallbackLabel

    return [{ label, value: String(rawValue) }]
  })
}

function resolveDynamicOptions(
  config: EntityConfig | null,
  optionRowsByPath: Partial<Record<EntityConfig['path'], EntityRow[]>>,
): EntityConfig | null {
  if (!config) {
    return null
  }

  return {
    ...config,
    fields: config.fields.map((field) =>
      field.optionSource
        ? {
            ...field,
            options: buildFieldOptions(
              field,
              optionRowsByPath[field.optionSource.path],
            ),
          }
        : field,
    ),
  }
}

function getNumericId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : null
}

function getProjectId(
  record: EntityRow | null | undefined,
  fallbackId: string | undefined,
): number | null {
  return getNumericId(record?.idProject) ?? getNumericId(fallbackId)
}

function formatPercentage(value: unknown): string {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return ''
  }

  return `${Number.isInteger(numericValue) ? numericValue : numericValue.toFixed(2)}%`
}

function getNestedEntityName(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const name = (value as { name?: unknown }).name
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null
}

function getProjectParticipationProduct(row: EntityRow): EntityRow | null {
  const project =
    row.project && typeof row.project === 'object' && !Array.isArray(row.project)
      ? (row.project as EntityRow)
      : null
  const product =
    project?.product &&
    typeof project.product === 'object' &&
    !Array.isArray(project.product)
      ? (project.product as EntityRow)
      : null

  return product
}

function formatProjectParticipation(row: EntityRow): string {
  const productName = getNestedEntityName(getProjectParticipationProduct(row))

  return productName ?? '-'
}

function getSettingValue(settings: EntityRow[] | undefined, code: string) {
  const setting = settings?.find((row) => row.code === code)
  return parseMoneyNumber(setting?.value)
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getSelectedProduct(values: EntityRow, products: EntityRow[] | undefined) {
  const selectedProductId = getNumericId(values.idProduct)
  const optionProduct = products?.find(
    (product) => getNumericId(product.id) === selectedProductId,
  )

  if (optionProduct) {
    return optionProduct
  }

  return values.product && typeof values.product === 'object'
    ? (values.product as EntityRow)
    : null
}

function getActiveProjectForProduct(
  productId: number | null,
  projects: EntityRow[] | undefined,
) {
  if (productId === null || !Array.isArray(projects)) {
    return null
  }

  return (
    projects.find(
      (project) =>
        getNumericId(project.idProduct) === productId &&
        (project.isActive === true || project.isActive === 'true'),
    ) ?? null
  )
}

function withSalesCalculatedValues(
  values: EntityRow,
  products: EntityRow[] | undefined,
  salesTaxRate: number | null,
): EntityRow {
  const amount = parseMoneyNumber(values.amount) ?? 0
  const fee = parseMoneyNumber(values.fee) ?? 0
  const product = getSelectedProduct(values, products)
  const ownerPercentage = parseMoneyNumber(product?.ownership) ?? 0
  const tax =
    salesTaxRate === null
      ? (parseMoneyNumber(values.tax) ?? 0)
      : roundCurrency(amount * salesTaxRate)
  const profit = roundCurrency(amount - fee - tax)

  return {
    ...values,
    ownerPercentage,
    ownerProfit: roundCurrency(profit * (ownerPercentage / 100)),
    profit,
    salesTaxRate,
    tax,
  }
}

function StakeholderProjectsSection({ stakeholder }: { stakeholder: EntityRow }) {
  const projects = Array.isArray(stakeholder.projects)
    ? (stakeholder.projects as EntityRow[])
    : []
  const columns: ColumnsType<EntityRow> = [
    {
      dataIndex: 'project',
      key: 'project',
      render: (_value, projectRow) => {
        const name = formatProjectParticipation(projectRow)
        const product = getProjectParticipationProduct(projectRow)

        return name === '-' ? (
          '-'
        ) : (
          <ProductNameCell imageUrl={product?.image} name={name} />
        )
      },
      title: 'Project',
    },
    {
      align: 'right',
      dataIndex: 'stakePercentage',
      key: 'stakePercentage',
      render: (value) => formatPercentage(value) || '-',
      title: 'Stake %',
      width: 140,
    },
  ]

  return (
    <section
      aria-labelledby="stakeholder-project-participation-heading"
      className="detail-section"
    >
      <Space className="section-heading-row" align="center">
        <Typography.Title
          id="stakeholder-project-participation-heading"
          level={3}
        >
          Project Participation
        </Typography.Title>
        <Typography.Text type="secondary">
          {projects.length} projects
        </Typography.Text>
      </Space>

      {projects.length === 0 ? (
        <Empty description="This stakeholder is not assigned to any projects." />
      ) : (
        <Table
          columns={columns}
          dataSource={projects}
          pagination={false}
          rowKey={(projectRow, index) =>
            String(projectRow.idProject ?? index ?? '')
          }
          scroll={{ x: 520 }}
          size="small"
        />
      )}
    </section>
  )
}

export function EntityEditPage() {
  const { entityName, id } = useParams()
  const navigate = useNavigate()
  const config = getEntityConfig(entityName)
  const isCreate = id === undefined || id === 'new'
  const [draftValues, setDraftValues] = useState<EntityRow>({})
  const [isDirty, setIsDirty] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
  const [touchedFieldNames, setTouchedFieldNames] = useState<Set<string>>(
    () => new Set(),
  )
  const [projectSplitState, setProjectSplitState] =
    useState<ProjectStakeholderSplitState>(EMPTY_PROJECT_SPLIT_STATE)
  const optionSources = useMemo(() => getOptionSources(config), [config])
  const optionSourceQueries = useQueries({
    queries: optionSources.map((path) => ({
      enabled: Boolean(config),
      queryKey: ['entity-options', path],
      queryFn: () => getJson<EntityRow[]>(`/${path}`),
    })),
  })
  const salesTaxQuery = useQuery({
    enabled: config?.path === 'sales',
    queryKey: ['settings', 'sales_tax'],
    queryFn: () =>
      getJson<EntityRow[]>('/settings?search=sales_tax&pageSize=100'),
  })
  const optionRowsByPath = useMemo(
    () =>
      Object.fromEntries(
        optionSources.map((path, index) => [
          path,
          optionSourceQueries[index]?.data ?? [],
        ]),
      ) as Partial<Record<EntityConfig['path'], EntityRow[]>>,
    [optionSourceQueries, optionSources],
  )
  const salesTaxRate = useMemo(
    () => getSettingValue(salesTaxQuery.data, 'sales_tax'),
    [salesTaxQuery.data],
  )
  const formConfig = useMemo(() => {

    return resolveDynamicOptions(config, optionRowsByPath)
  }, [config, optionRowsByPath])

  const detailQuery = useQuery({
    enabled: Boolean(
      config && config.path !== 'project-stakeholders' && !isCreate && id,
    ),
    queryKey: ['entity', config?.path, id],
    queryFn: () => getJson<EntityRow>(`/${config!.path}/${id}`),
  })

  const saveMutation = useMutation({
    mutationFn: async (body: EntityRow) => {
      if (config!.path !== 'projects') {
        return isCreate
          ? postJson<EntityRow, EntityRow>(`/${config!.path}`, body)
          : patchJson<EntityRow, EntityRow>(`/${config!.path}/${id}`, body)
      }

      if (projectSplitState.hasRows && !projectSplitState.isValid) {
        throw new Error(
          projectSplitState.errorMessage ??
            'Project stakeholder split is not ready to save.',
        )
      }

      const savedProject = isCreate
        ? await postJson<EntityRow, EntityRow>('/projects', body)
        : await patchJson<EntityRow, EntityRow>(`/projects/${id}`, body)

      if (projectSplitState.hasRows) {
        const projectId = getProjectId(savedProject, id)

        if (projectId === null) {
          throw new Error('Project ID is required to save stakeholder split.')
        }

        await putJson<EntityRow[], ProjectStakeholderSplitPayloadRow[]>(
          `/project-stakeholders/projects/${projectId}`,
          projectSplitState.rows,
        )
      }

      return savedProject
    },
    onError: (error) => setMutationError(getErrorMessage(error)),
    onSuccess: () => navigate(`/${config!.path}`),
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteJson<unknown>(`/${config!.path}/${id}`),
    onError: (error) => setMutationError(getErrorMessage(error)),
    onSuccess: () => navigate(`/${config!.path}`),
  })

  const detailErrorMessage = useMemo(() => {
    if (detailQuery.isError) {
      return `Unable to load ${config?.title.toLowerCase() ?? 'record'}.`
    }

    return null
  }, [config?.title, detailQuery.isError])

  const formValues =
    isCreate || isDirty ? draftValues : (detailQuery.data ?? {})
  const displayedFormValues =
    config?.path === 'sales'
      ? withSalesCalculatedValues(
          formValues,
          optionRowsByPath.products,
          salesTaxRate,
        )
      : formValues

  if (!config || !formConfig) {
    return (
      <section className="page-panel" aria-labelledby="unknown-entity-heading">
        <Result
          status="404"
          title={
            <Typography.Title id="unknown-entity-heading" level={2}>
              Unknown Entity
            </Typography.Title>
          }
          subTitle="The requested admin entity is not configured."
        />
      </section>
    )
  }

  function handleChange(name: string, value: boolean | string) {
    setIsDirty(true)
    setTouchedFieldNames((currentFields) => {
      const nextFields = new Set(currentFields)
      nextFields.add(name)
      return nextFields
    })
    setDraftValues((currentValues) => {
      const nextValues = {
        ...(isDirty ? currentValues : (detailQuery.data ?? {})),
        [name]: value,
      }

      if (config?.path === 'sales' && name === 'idProduct') {
        const activeProject = getActiveProjectForProduct(
          getNumericId(value),
          optionRowsByPath.projects,
        )

        nextValues.idProject =
          activeProject && activeProject.idProject !== undefined
            ? String(activeProject.idProject)
            : ''
      }

      return nextValues
    })
  }

  function handleSave() {
    setMutationError(null)
    saveMutation.mutate(
      buildEntityPayload(formConfig!, displayedFormValues, {
        isCreate,
        originalValues: detailQuery.data ?? {},
        touchedFieldNames,
      }),
    )
  }

  function handleCancel() {
    navigate(`/${config!.path}`)
  }

  return (
    <section
      className="page-panel"
      aria-labelledby={`${config.path}-form-heading`}
    >
      <div className="page-heading-row">
        <Typography.Title id={`${config.path}-form-heading`} level={2}>
          {isCreate
            ? `Create ${config.singularTitle}`
            : `Edit ${config.title}`}
        </Typography.Title>
      </div>

      {detailQuery.isLoading ? (
        <Spin description="Loading record..." />
      ) : (
        <>
          {detailErrorMessage ? (
            <Alert
              className="form-error"
              message={detailErrorMessage}
              role="alert"
              showIcon
              type="error"
            />
          ) : null}
          <EntityForm
            config={formConfig}
            errorMessage={mutationError}
            isCreate={isCreate}
            isSaving={saveMutation.isPending}
            onChange={handleChange}
            onCancel={handleCancel}
            onSubmit={handleSave}
            values={displayedFormValues}
          >
            {config.path === 'projects' ? (
              <ProjectStakeholderLines
                isCreate={isCreate}
                onDraftChange={setProjectSplitState}
                projectId={isCreate ? null : id}
              />
            ) : null}
          </EntityForm>
        </>
      )}

      {config.path === 'stakeholders' && !isCreate && detailQuery.data ? (
        <StakeholderProjectsSection stakeholder={detailQuery.data} />
      ) : null}

      {!isCreate ? (
        <div className="danger-zone">
          <Popconfirm
            cancelText="Cancel"
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            okText="Confirm delete"
            onConfirm={() => {
              setMutationError(null)
              deleteMutation.mutate()
            }}
            title="Delete this record? This action cannot be undone."
          >
            <Button danger loading={deleteMutation.isPending}>
              Delete
            </Button>
          </Popconfirm>
        </div>
      ) : null}
    </section>
  )
}
