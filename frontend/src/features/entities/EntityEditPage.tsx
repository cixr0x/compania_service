import { useMemo, useState } from 'react'
import { useMutation, useQueries, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteJson, getJson, patchJson, postJson } from '../../api/client'
import { EntityForm } from '../../components/EntityForm'
import {
  getEntityConfig,
  type EntityConfig,
  type EntityField,
  type EntityRow,
} from './entityConfigs'
import { ProjectStakeholderSplitEditor } from './ProjectStakeholderSplitEditor'

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

    if (rawValue === null || rawValue === undefined) {
      return []
    }

    const label =
      rawLabel === null ||
      rawLabel === undefined ||
      String(rawLabel).trim() === ''
        ? String(rawValue)
        : String(rawLabel)

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

export function EntityEditPage() {
  const { entityName, id } = useParams()
  const navigate = useNavigate()
  const config = getEntityConfig(entityName)
  const isCreate = id === undefined || id === 'new'
  const [draftValues, setDraftValues] = useState<EntityRow>({})
  const [isDirty, setIsDirty] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)
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
    mutationFn: (body: EntityRow) =>
      isCreate
        ? postJson<EntityRow, EntityRow>(`/${config!.path}`, body)
        : patchJson<EntityRow, EntityRow>(`/${config!.path}/${id}`, body),
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

  if (config.path === 'project-stakeholders') {
    return (
      <ProjectStakeholderSplitEditor
        config={config}
        id={id}
        isCreate={isCreate}
      />
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
        />
      )}

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
