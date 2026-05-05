import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { deleteJson, getJson, patchJson, postJson } from '../../api/client'
import { EntityForm } from '../../components/EntityForm'
import { getEntityConfig, type EntityRow } from './entityConfigs'

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'The request could not be completed.'
}

function coerceFormValue(
  value: unknown,
  fieldType?: string,
): string | number | null {
  if (value === '') {
    return null
  }

  if (fieldType === 'number') {
    const numericValue = Number(value)
    return Number.isFinite(numericValue) ? numericValue : null
  }

  return value as string | number | null
}

export function EntityEditPage() {
  const { entityName, id } = useParams()
  const navigate = useNavigate()
  const config = getEntityConfig(entityName)
  const isCreate = id === 'new'
  const [draftValues, setDraftValues] = useState<EntityRow>({})
  const [isDirty, setIsDirty] = useState(false)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const detailQuery = useQuery({
    enabled: Boolean(config && !isCreate && id),
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

  function handleChange(name: string, value: string) {
    setIsDirty(true)
    setDraftValues((currentValues) => ({
      ...(isDirty ? currentValues : detailQuery.data ?? {}),
      [name]: value,
    }))
  }

  function handleSave() {
    setMutationError(null)
    const fieldTypes = new Map(
      config?.fields.map((field) => [field.name, field.type]) ?? [],
    )

    saveMutation.mutate(
      Object.fromEntries(
        Object.entries(formValues).map(([key, value]) => [
          key,
          coerceFormValue(value, fieldTypes.get(key)),
        ]),
      ),
    )
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
            {isCreate ? `Create ${config.title}` : `Edit ${config.title}`}
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
