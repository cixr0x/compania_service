import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getJson } from '../../api/client'
import type { EntityRow } from './entityConfigs'

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

export type ProjectStakeholderSplitPayloadRow = {
  idStakeholder: number
  stakePercentage: number
}

export type ProjectStakeholderSplitState = {
  errorMessage: string | null
  hasRows: boolean
  isValid: boolean
  rows: ProjectStakeholderSplitPayloadRow[]
}

type MaybeSplitPayloadRow = {
  idStakeholder: number | null
  stakePercentage: number | null
}

type ProjectStakeholderLinesProps = {
  isCreate: boolean
  onDraftChange: (state: ProjectStakeholderSplitState) => void
  projectId: string | number | null | undefined
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
): row is ProjectStakeholderSplitPayloadRow {
  return row.idStakeholder !== null && row.stakePercentage !== null
}

function buildDraftState(
  rows: SplitDraftRow[],
  totalPercentage: number,
): ProjectStakeholderSplitState {
  if (rows.length === 0) {
    return {
      errorMessage: null,
      hasRows: false,
      isValid: true,
      rows: [],
    }
  }

  const payloadRows: MaybeSplitPayloadRow[] = rows.map((row) => ({
    idStakeholder: parseNumericInput(row.idStakeholder),
    stakePercentage: parseNumericInput(row.stakePercentage),
  }))

  if (!payloadRows.every(isCompletePayloadRow)) {
    return {
      errorMessage: 'Every split row needs a stakeholder and percentage.',
      hasRows: true,
      isValid: false,
      rows: [],
    }
  }

  if (Math.abs(totalPercentage - 100) > 0.000001) {
    return {
      errorMessage: 'Total stake percentage must equal 100%.',
      hasRows: true,
      isValid: false,
      rows: payloadRows.filter(isCompletePayloadRow),
    }
  }

  return {
    errorMessage: null,
    hasRows: true,
    isValid: true,
    rows: payloadRows.filter(isCompletePayloadRow),
  }
}

export function ProjectStakeholderLines({
  isCreate,
  onDraftChange,
  projectId,
}: ProjectStakeholderLinesProps) {
  const projectIdValue = toInputValue(projectId)
  const [draftRows, setDraftRows] = useState<SplitDraftRow[] | null>(() =>
    isCreate ? [] : null,
  )
  const [nextRowIndex, setNextRowIndex] = useState(0)

  const stakeholdersQuery = useQuery({
    queryKey: ['project-stakeholder-options', 'stakeholders'],
    queryFn: () =>
      getJson<EntityRow[]>(`/stakeholders?pageSize=${OPTION_LIST_PAGE_SIZE}`),
  })

  const projectRowsQuery = useQuery({
    enabled: !isCreate && Boolean(projectIdValue),
    queryKey: ['project-stakeholder-split', projectIdValue],
    queryFn: () =>
      getJson<EntityRow[]>(`/project-stakeholders/projects/${projectIdValue}`),
  })

  const loadedRows = useMemo(
    () => (projectRowsQuery.data ?? []).map(buildDraftRow),
    [projectRowsQuery.data],
  )
  const activeRows = draftRows ?? loadedRows

  const stakeholderOptions = useMemo(
    () => (stakeholdersQuery.data ?? []).map(buildStakeholderOption),
    [stakeholdersQuery.data],
  )

  const totalPercentage = useMemo(
    () =>
      activeRows.reduce((total, row) => {
        const value = parseNumericInput(row.stakePercentage)
        return value === null ? total : total + value
      }, 0),
    [activeRows],
  )

  const draftState = useMemo(
    () => buildDraftState(activeRows, totalPercentage),
    [activeRows, totalPercentage],
  )

  useEffect(() => {
    onDraftChange(draftState)
  }, [draftState, onDraftChange])

  function handleAddRow() {
    setDraftRows([
      ...activeRows,
      { rowKey: `new-${nextRowIndex}`, ...EMPTY_SPLIT_ROW },
    ])
    setNextRowIndex((currentIndex) => currentIndex + 1)
  }

  function handleRemoveRow(rowKey: string) {
    setDraftRows(
      activeRows.length === 1
        ? activeRows
        : activeRows.filter((row) => row.rowKey !== rowKey),
    )
  }

  function handleRowChange(
    rowKey: string,
    field: 'idStakeholder' | 'stakePercentage',
    value: string,
  ) {
    setDraftRows(
      activeRows.map((row) =>
        row.rowKey === rowKey ? { ...row, [field]: value } : row,
      ),
    )
  }

  const isLoading = stakeholdersQuery.isLoading || projectRowsQuery.isLoading
  const isTotalComplete =
    activeRows.length === 0 || Math.abs(totalPercentage - 100) <= 0.000001

  return (
    <fieldset className="form-section split-editor">
      <legend>Stakeholder Split</legend>

      {stakeholdersQuery.isError || projectRowsQuery.isError ? (
        <div className="form-error" role="alert">
          Unable to load stakeholder split data.
        </div>
      ) : null}

      {isLoading ? (
        <p className="page-description">Loading stakeholder split...</p>
      ) : (
        <>
          <div className="split-summary">
            {activeRows.length === 0 ? (
              <p className="muted-copy">
                No stakeholders have been added to this project.
              </p>
            ) : null}
            <div
              aria-live="polite"
              className={
                isTotalComplete
                  ? 'split-total split-total-complete'
                  : 'split-total split-total-incomplete'
              }
            >
              <span>Total allocation: {formatTotal(totalPercentage)}%</span>
              <span>Total must equal 100% before saving.</span>
            </div>
          </div>

          <div className="split-rows">
            {activeRows.map((row, index) => (
              <div className="split-row" key={row.rowKey}>
                <div className="form-field">
                  <span className="field-label-row">
                    <label htmlFor={`project-split-stakeholder-${row.rowKey}`}>
                      Stakeholder
                    </label>
                    <span aria-hidden="true" className="field-required">
                      Required
                    </span>
                  </span>
                  <select
                    aria-describedby={`project-split-stakeholder-${row.rowKey}-helper`}
                    id={`project-split-stakeholder-${row.rowKey}`}
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
                    id={`project-split-stakeholder-${row.rowKey}-helper`}
                  >
                    Stakeholder receiving this share.
                  </span>
                </div>

                <div className="form-field">
                  <span className="field-label-row">
                    <label htmlFor={`project-split-percentage-${row.rowKey}`}>
                      Stake Percentage
                    </label>
                    <span aria-hidden="true" className="field-required">
                      Required
                    </span>
                  </span>
                  <span className="field-control field-control-adorned">
                    <input
                      id={`project-split-percentage-${row.rowKey}`}
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

                {activeRows.length > 1 ? (
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
              Add stakeholder
            </button>
          </div>
        </>
      )}
    </fieldset>
  )
}
