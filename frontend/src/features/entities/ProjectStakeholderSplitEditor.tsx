import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getJson, putJson } from '../../api/client'
import type { EntityConfig, EntityRow } from './entityConfigs'

const EMPTY_SPLIT_ROW = {
  idStakeholder: '',
  stakePercentage: '',
}
const OPTION_LIST_PAGE_SIZE = 100

type SplitDraftRow = {
  rowKey: string
  idStakeholder: string
  stakePercentage: string
}

type SplitDraft = {
  projectId: string
  rows: SplitDraftRow[]
}

type SplitPayloadRow = {
  idStakeholder: number
  stakePercentage: number
}

type MaybeSplitPayloadRow = {
  idStakeholder: number | null
  stakePercentage: number | null
}

type ProjectStakeholderSplitEditorProps = {
  config: EntityConfig
  id: string | undefined
  isCreate: boolean
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'The request could not be completed.'
}

function toInputValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function parseNumericInput(value: string): number | null {
  const trimmedValue = value.trim()
  if (!trimmedValue) {
    return null
  }

  const numericValue = Number(trimmedValue)
  return Number.isFinite(numericValue) ? numericValue : null
}

function formatTotal(total: number): string {
  return Number.isInteger(total) ? String(total) : total.toFixed(2)
}

function getNestedName(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  const name = (value as { name?: unknown }).name
  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null
}

function buildProjectOption(row: EntityRow) {
  const value = toInputValue(row.idProject)
  const productName = getNestedName(row.product)

  return {
    label: productName ? `Project #${value} - ${productName}` : `Project #${value}`,
    value,
  }
}

function buildStakeholderOption(row: EntityRow) {
  const value = toInputValue(row.idStakeholder)
  const stakeholderName =
    typeof row.name === 'string' && row.name.trim() !== ''
      ? row.name.trim()
      : null

  return {
    label: stakeholderName ?? `Stakeholder #${value}`,
    value,
  }
}

function buildDraftRow(row: EntityRow, index: number): SplitDraftRow {
  return {
    rowKey: `existing-${toInputValue(row.idProjectStakeholder) || index}`,
    idStakeholder: toInputValue(row.idStakeholder),
    stakePercentage: toInputValue(row.stakePercentage),
  }
}

function isCompletePayloadRow(
  row: MaybeSplitPayloadRow,
): row is SplitPayloadRow {
  return row.idStakeholder !== null && row.stakePercentage !== null
}

export function ProjectStakeholderSplitEditor({
  config,
  id,
  isCreate,
}: ProjectStakeholderSplitEditorProps) {
  const navigate = useNavigate()
  const [draft, setDraft] = useState<SplitDraft | null>(() =>
    isCreate
      ? { projectId: '', rows: [{ rowKey: 'new-0', ...EMPTY_SPLIT_ROW }] }
      : null,
  )
  const [nextRowIndex, setNextRowIndex] = useState(1)
  const [mutationError, setMutationError] = useState<string | null>(null)

  const projectsQuery = useQuery({
    queryKey: ['project-stakeholder-options', 'projects'],
    queryFn: () => getJson<EntityRow[]>(`/projects?pageSize=${OPTION_LIST_PAGE_SIZE}`),
  })

  const stakeholdersQuery = useQuery({
    queryKey: ['project-stakeholder-options', 'stakeholders'],
    queryFn: () =>
      getJson<EntityRow[]>(`/stakeholders?pageSize=${OPTION_LIST_PAGE_SIZE}`),
  })

  const detailQuery = useQuery({
    enabled: !isCreate && Boolean(id),
    queryKey: ['entity', config.path, id],
    queryFn: () => getJson<EntityRow>(`/${config.path}/${id}`),
  })

  const selectedProjectId = useMemo(
    () => toInputValue(detailQuery.data?.idProject),
    [detailQuery.data],
  )

  const projectRowsQuery = useQuery({
    enabled: !isCreate && Boolean(selectedProjectId),
    queryKey: ['project-stakeholder-split', selectedProjectId],
    queryFn: () =>
      getJson<EntityRow[]>(`/${config.path}/projects/${selectedProjectId}`),
  })

  const loadedDraft = useMemo<SplitDraft | null>(() => {
    if (isCreate || !selectedProjectId || !detailQuery.data) {
      return null
    }

    if (!projectRowsQuery.data) {
      return null
    }

    const rowsToPrefill =
      projectRowsQuery.data.length > 0 ? projectRowsQuery.data : [detailQuery.data]

    return {
      projectId: selectedProjectId,
      rows: rowsToPrefill.map(buildDraftRow),
    }
  }, [detailQuery.data, isCreate, projectRowsQuery.data, selectedProjectId])

  const fallbackDraft: SplitDraft = {
    projectId: '',
    rows: [{ rowKey: 'new-0', ...EMPTY_SPLIT_ROW }],
  }
  const activeDraft = draft ?? loadedDraft ?? fallbackDraft
  const projectOptions = useMemo(
    () => (projectsQuery.data ?? []).map(buildProjectOption),
    [projectsQuery.data],
  )
  const stakeholderOptions = useMemo(
    () => (stakeholdersQuery.data ?? []).map(buildStakeholderOption),
    [stakeholdersQuery.data],
  )

  const totalPercentage = useMemo(
    () =>
      activeDraft.rows.reduce((total, row) => {
        const value = parseNumericInput(row.stakePercentage)
        return value === null ? total : total + value
      }, 0),
    [activeDraft.rows],
  )

  const saveMutation = useMutation({
    mutationFn: ({
      projectNumber,
      payloadRows,
    }: {
      projectNumber: number
      payloadRows: SplitPayloadRow[]
    }) =>
      putJson<EntityRow[], SplitPayloadRow[]>(
        `/${config.path}/projects/${projectNumber}`,
        payloadRows,
      ),
    onError: (error) => setMutationError(getErrorMessage(error)),
    onSuccess: () => navigate(`/${config.path}`),
  })

  const errorMessage = useMemo(() => {
    if (mutationError) {
      return mutationError
    }

    if (
      detailQuery.isError ||
      projectRowsQuery.isError ||
      projectsQuery.isError ||
      stakeholdersQuery.isError
    ) {
      return `Unable to load ${config.title.toLowerCase()}.`
    }

    return null
  }, [
    config.title,
    detailQuery.isError,
    mutationError,
    projectRowsQuery.isError,
    projectsQuery.isError,
    stakeholdersQuery.isError,
  ])

  const isLoading =
    projectsQuery.isLoading ||
    stakeholdersQuery.isLoading ||
    detailQuery.isLoading ||
    (!isCreate && projectRowsQuery.isLoading)

  function handleProjectIdChange(value: string) {
    setMutationError(null)
    setDraft((currentDraft) => ({
      ...(currentDraft ?? activeDraft),
      projectId: value,
    }))
  }

  function handleRowChange(
    rowKey: string,
    field: 'idStakeholder' | 'stakePercentage',
    value: string,
  ) {
    setMutationError(null)
    setDraft((currentDraft) => {
      const baseDraft = currentDraft ?? activeDraft
      return {
        ...baseDraft,
        rows: baseDraft.rows.map((row) =>
          row.rowKey === rowKey ? { ...row, [field]: value } : row,
        ),
      }
    })
  }

  function handleAddRow() {
    setMutationError(null)
    setDraft((currentDraft) => {
      const baseDraft = currentDraft ?? activeDraft
      return {
        ...baseDraft,
        rows: [
          ...baseDraft.rows,
          { rowKey: `new-${nextRowIndex}`, ...EMPTY_SPLIT_ROW },
        ],
      }
    })
    setNextRowIndex((currentIndex) => currentIndex + 1)
  }

  function handleRemoveRow(rowKey: string) {
    setMutationError(null)
    setDraft((currentDraft) => {
      const baseDraft = currentDraft ?? activeDraft
      return {
        ...baseDraft,
        rows:
          baseDraft.rows.length === 1
            ? baseDraft.rows
            : baseDraft.rows.filter((row) => row.rowKey !== rowKey),
      }
    })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMutationError(null)

    const projectNumber = parseNumericInput(activeDraft.projectId)
    if (projectNumber === null) {
      setMutationError('Project ID is required.')
      return
    }

    const payloadRows: MaybeSplitPayloadRow[] = activeDraft.rows.map((row) => ({
      idStakeholder: parseNumericInput(row.idStakeholder),
      stakePercentage: parseNumericInput(row.stakePercentage),
    }))

    if (!payloadRows.every(isCompletePayloadRow)) {
      setMutationError('Every split row needs a stakeholder and percentage.')
      return
    }

    if (Math.abs(totalPercentage - 100) > 0.000001) {
      setMutationError('Total stake percentage must equal 100%.')
      return
    }

    saveMutation.mutate({
      projectNumber,
      payloadRows: payloadRows.filter(isCompletePayloadRow),
    })
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

      {isLoading ? (
        <p className="page-description">Loading record...</p>
      ) : (
        <form className="entity-form split-editor" onSubmit={handleSubmit}>
          {errorMessage ? (
            <div className="form-error" role="alert">
              {errorMessage}
            </div>
          ) : null}

          <div className="split-summary">
            <div className="form-field">
              <span className="field-label-row">
                <label htmlFor="split-project-id">Project</label>
                <span aria-hidden="true" className="field-required">
                  Required
                </span>
              </span>
              <select
                aria-describedby="split-project-helper"
                disabled={!isCreate}
                id="split-project-id"
                onChange={(event) => handleProjectIdChange(event.target.value)}
                value={activeDraft.projectId}
              >
                <option value="">Select project...</option>
                {projectOptions.some(
                  (option) => option.value === activeDraft.projectId,
                ) || !activeDraft.projectId ? null : (
                  <option value={activeDraft.projectId}>
                    Project #{activeDraft.projectId}
                  </option>
                )}
                {projectOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <span className="field-helper" id="split-project-helper">
                Project that all stakeholder rows belong to.
              </span>
            </div>
            <div
              className={
                Math.abs(totalPercentage - 100) <= 0.000001
                  ? 'split-total split-total-complete'
                  : 'split-total split-total-incomplete'
              }
              aria-live="polite"
            >
              <span>Total allocation: {formatTotal(totalPercentage)}%</span>
              <span>Total must equal 100% before saving.</span>
            </div>
          </div>

          <div className="split-rows">
            {activeDraft.rows.map((row, index) => (
              <div className="split-row" key={row.rowKey}>
                <div className="form-field">
                  <span className="field-label-row">
                    <label htmlFor={`split-stakeholder-${row.rowKey}`}>
                      Stakeholder
                    </label>
                    <span aria-hidden="true" className="field-required">
                      Required
                    </span>
                  </span>
                  <select
                    aria-describedby={`split-stakeholder-${row.rowKey}-helper`}
                    id={`split-stakeholder-${row.rowKey}`}
                    onChange={(event) =>
                      handleRowChange(
                        row.rowKey,
                        'idStakeholder',
                        event.target.value,
                      )
                    }
                    value={row.idStakeholder}
                  >
                    <option value="">Select stakeholder...</option>
                    {stakeholderOptions.some(
                      (option) => option.value === row.idStakeholder,
                    ) || !row.idStakeholder ? null : (
                      <option value={row.idStakeholder}>
                        Stakeholder #{row.idStakeholder}
                      </option>
                    )}
                    {stakeholderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <span
                    className="field-helper"
                    id={`split-stakeholder-${row.rowKey}-helper`}
                  >
                    Stakeholder receiving this share.
                  </span>
                </div>
                <div className="form-field">
                  <span className="field-label-row">
                    <label htmlFor={`split-percentage-${row.rowKey}`}>
                      Stake Percentage
                    </label>
                    <span aria-hidden="true" className="field-required">
                      Required
                    </span>
                  </span>
                  <span className="field-control field-control-adorned">
                    <input
                      id={`split-percentage-${row.rowKey}`}
                      max={100}
                      min={0}
                      onChange={(event) =>
                        handleRowChange(
                          row.rowKey,
                          'stakePercentage',
                          event.target.value,
                        )
                      }
                      step={0.01}
                      type="number"
                      value={row.stakePercentage}
                    />
                    <span aria-hidden="true" className="field-adornment">
                      %
                    </span>
                  </span>
                </div>
                {activeDraft.rows.length > 1 ? (
                  <button
                    aria-label={`Remove row ${index + 1}`}
                    className="secondary-action split-remove-action"
                    onClick={() => handleRemoveRow(row.rowKey)}
                    type="button"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="form-actions">
            <button
              className="secondary-action"
              onClick={handleAddRow}
              type="button"
            >
              Add row
            </button>
            <button
              className="primary-action"
              disabled={saveMutation.isPending}
              type="submit"
            >
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
