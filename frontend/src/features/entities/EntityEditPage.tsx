import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
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
): string | number | undefined {
  if (field.type === 'number') {
    const trimmedValue = typeof value === 'string' ? value.trim() : value
    if (trimmedValue === '' || trimmedValue === null || trimmedValue === undefined) {
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
    return value === null || value === undefined ? undefined : String(value).trim()
  }

  const trimmedValue = value.trim()
  return trimmedValue || undefined
}

function buildEntityPayload(config: EntityConfig, values: EntityRow): EntityRow {
  return Object.fromEntries(
    config.fields.flatMap((field) => {
      const value = serializeFieldValue(values[field.name], field)
      return value === undefined ? [] : [[field.name, value]]
    }),
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

  const formValues = isCreate || isDirty ? draftValues : detailQuery.data ?? {}

  if (!config) {
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

  function handleChange(name: string, value: string) {
    setIsDirty(true)
    setDraftValues((currentValues) => ({
      ...(isDirty ? currentValues : detailQuery.data ?? {}),
      [name]: value,
    }))
  }

  function handleSave() {
    setMutationError(null)
    saveMutation.mutate(buildEntityPayload(config!, formValues))
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
          config={config}
          errorMessage={errorMessage}
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
