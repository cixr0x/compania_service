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
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteJson, getJson, patchJson, postJson, putJson } from '../../api/client'
import { EntityForm } from '../../components/EntityForm'
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
  return trimmedValue || undefined
}

function buildEntityPayload(
  config: EntityConfig,
  values: EntityRow,
): EntityRow {
  return Object.fromEntries(
    config.fields.flatMap((field) => {
      if (field.type === 'computed' || field.type === 'imagePreview') {
        return []
      }

      const value = serializeFieldValue(values[field.name], field)
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

function formatProjectParticipation(row: EntityRow): string {
  const project =
    row.project && typeof row.project === 'object' && !Array.isArray(row.project)
      ? (row.project as EntityRow)
      : null
  const productName = getNestedEntityName(project?.product)

  return productName ?? '-'
}

function StakeholderProjectsSection({ stakeholder }: { stakeholder: EntityRow }) {
  const projects = Array.isArray(stakeholder.projects)
    ? (stakeholder.projects as EntityRow[])
    : []
  const columns: ColumnsType<EntityRow> = [
    {
      dataIndex: 'project',
      key: 'project',
      render: (_value, projectRow) => formatProjectParticipation(projectRow),
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
  const formConfig = useMemo(() => {
    const optionRowsByPath = Object.fromEntries(
      optionSources.map((path, index) => [
        path,
        optionSourceQueries[index]?.data ?? [],
      ]),
    ) as Partial<Record<EntityConfig['path'], EntityRow[]>>

    return resolveDynamicOptions(config, optionRowsByPath)
  }, [config, optionSourceQueries, optionSources])

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
    setDraftValues((currentValues) => ({
      ...(isDirty ? currentValues : (detailQuery.data ?? {})),
      [name]: value,
    }))
  }

  function handleSave() {
    setMutationError(null)
    saveMutation.mutate(buildEntityPayload(formConfig!, formValues))
  }

  return (
    <section
      className="page-panel"
      aria-labelledby={`${config.path}-form-heading`}
    >
      <Space className="page-heading-row" align="center">
        <div>
          <Typography.Text className="eyebrow">Workspace</Typography.Text>
          <Typography.Title id={`${config.path}-form-heading`} level={2}>
            {isCreate
              ? `Create ${config.singularTitle}`
              : `Edit ${config.title}`}
          </Typography.Title>
        </div>
        <Link to={`/${config.path}`}>
          <Button>Back</Button>
        </Link>
      </Space>

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
            onSubmit={handleSave}
            values={formValues}
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
