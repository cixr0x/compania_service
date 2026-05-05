import { useMemo, useState, type FormEvent } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Link, useNavigate } from 'react-router-dom'
import { getJson, putJson } from '../../api/client'
import type { EntityConfig, EntityRow } from './entityConfigs'

const EMPTY_SPLIT_ROW = {
  idStakeholder: '',
  stakePercentage: '',
}

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

    if (detailQuery.isError || projectRowsQuery.isError) {
      return `Unable to load ${config.title.toLowerCase()}.`
    }

    return null
  }, [
    config.title,
    detailQuery.isError,
    mutationError,
    projectRowsQuery.isError,
  ])

  const isLoading =
    detailQuery.isLoading || (!isCreate && projectRowsQuery.isLoading)

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
            {isCreate ? `Create ${config.title}` : `Edit ${config.title}`}
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
            <label className="form-field">
              <span>Project ID</span>
              <input
                onChange={(event) => handleProjectIdChange(event.target.value)}
                readOnly={!isCreate}
                step="any"
                type="number"
                value={activeDraft.projectId}
              />
            </label>
            <div className="split-total" aria-live="polite">
              Total: {formatTotal(totalPercentage)}%
            </div>
          </div>

          <div className="split-rows">
            {activeDraft.rows.map((row, index) => (
              <div className="split-row" key={row.rowKey}>
                <label className="form-field">
                  <span>Stakeholder ID</span>
                  <input
                    onChange={(event) =>
                      handleRowChange(
                        row.rowKey,
                        'idStakeholder',
                        event.target.value,
                      )
                    }
                    step="any"
                    type="number"
                    value={row.idStakeholder}
                  />
                </label>
                <label className="form-field">
                  <span>Stake Percentage</span>
                  <input
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
                </label>
                <button
                  aria-label={`Remove row ${index + 1}`}
                  className="secondary-action split-remove-action"
                  disabled={activeDraft.rows.length === 1}
                  onClick={() => handleRemoveRow(row.rowKey)}
                  type="button"
                >
                  Remove
                </button>
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
