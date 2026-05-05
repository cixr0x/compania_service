import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
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
      if (field.type === 'imagePreview') {
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
  const projectId = getNumericId(project?.idProject) ?? getNumericId(row.idProject)
  const productName = getNestedEntityName(project?.product)

  return productName && projectId !== null
    ? `Project #${projectId} - ${productName}`
    : `Project #${projectId ?? ''}`.trim()
}

function StakeholderProjectsSection({ stakeholder }: { stakeholder: EntityRow }) {
  const projects = Array.isArray(stakeholder.projects)
    ? (stakeholder.projects as EntityRow[])
    : []

  return (
    <section
      aria-labelledby="stakeholder-project-participation-heading"
      className="detail-section"
    >
      <div className="section-heading-row">
        <h3 id="stakeholder-project-participation-heading">
          Project Participation
        </h3>
        <span>{projects.length} projects</span>
      </div>

      {projects.length === 0 ? (
        <p className="muted-copy">
          This stakeholder is not assigned to any projects.
        </p>
      ) : (
        <div className="table-scroll">
          <table className="data-table detail-table">
            <thead>
              <tr>
                <th scope="col">Project</th>
                <th scope="col">Stake %</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((projectRow, index) => (
                <tr key={`${projectRow.idProject ?? index}`}>
                  <td>{formatProjectParticipation(projectRow)}</td>
                  <td>{formatPercentage(projectRow.stakePercentage)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

  const errorMessage = useMemo(() => {
    if (mutationError) {
      return mutationError
    }

    if (detailQuery.isError) {
      return `Unable to load ${config?.title.toLowerCase() ?? 'record'}.`
    }

    return null
  }, [config?.title, detailQuery.isError, mutationError])

  const formValues =
    isCreate || isDirty ? draftValues : (detailQuery.data ?? {})

  if (!config || !formConfig) {
    return (
      <section className="page-panel" aria-labelledby="unknown-entity-heading">
        <p className="eyebrow">Workspace</p>
        <h2 id="unknown-entity-heading">Unknown Entity</h2>
        <p className="page-description">
          The requested admin entity is not configured.
        </p>
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
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id={`${config.path}-form-heading`}>
            {isCreate
              ? `Create ${config.singularTitle}`
              : `Edit ${config.title}`}
          </h2>
        </div>
        <Link className="secondary-action" to={`/${config.path}`}>
          Back
        </Link>
      </div>

      {detailQuery.isLoading ? (
        <p className="page-description">Loading record...</p>
      ) : (
        <EntityForm
          config={formConfig}
          errorMessage={errorMessage}
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
      )}

      {config.path === 'stakeholders' && !isCreate && detailQuery.data ? (
        <StakeholderProjectsSection stakeholder={detailQuery.data} />
      ) : null}

      {!isCreate ? (
        <div className="danger-zone">
          <button
            className="danger-action"
            disabled={deleteMutation.isPending}
            onClick={() => {
              setMutationError(null)
              deleteMutation.mutate()
            }}
            type="button"
          >
            {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      ) : null}
    </section>
  )
}
