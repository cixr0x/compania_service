import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Form,
  InputNumber,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from 'antd'
import { getJson } from '../../api/client'
import { formatCurrency } from '../../utils/money'
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

type EditingSplitRow = SplitDraftRow & {
  isNew: boolean
}

type StakeholderOption = {
  label: string
  value: string
}

export type ProjectStakeholderSplitPayloadRow = {
  idStakeholder: number
  stakePercentage: number
}

export type ProjectStakeholderSplitState = {
  errorMessage: string | null
  hasRows: boolean
  isDirty: boolean
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
  totalProjectCost: number
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

function formatPercentage(value: string): string {
  const numericValue = parseNumericInput(value)
  return numericValue === null ? '-' : `${formatTotal(numericValue)}%`
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function getStakeAmount(totalProjectCost: number, row: SplitDraftRow) {
  const stakePercentage = parseNumericInput(row.stakePercentage)

  if (stakePercentage === null) {
    return 0
  }

  return roundCurrency(totalProjectCost * (stakePercentage / 100))
}

function buildStakeholderOption(row: EntityRow): StakeholderOption {
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
  return (
    row.idStakeholder !== null &&
    row.stakePercentage !== null &&
    row.stakePercentage > 0
  )
}

function buildDraftState(
  rows: SplitDraftRow[],
  totalPercentage: number,
  isDirty: boolean,
  hasEditingRows: boolean,
): ProjectStakeholderSplitState {
  if (hasEditingRows) {
    return {
      errorMessage: 'Save or cancel stakeholder row edits before saving the project.',
      hasRows: rows.length > 0,
      isDirty,
      isValid: false,
      rows: [],
    }
  }

  if (rows.length === 0) {
    return {
      errorMessage: null,
      hasRows: false,
      isDirty,
      isValid: true,
      rows: [],
    }
  }

  const payloadRows: MaybeSplitPayloadRow[] = rows.map((row) => ({
    idStakeholder: parseNumericInput(row.idStakeholder),
    stakePercentage: parseNumericInput(row.stakePercentage),
  }))
  const completeRows = payloadRows.filter(isCompletePayloadRow)

  if (!payloadRows.every(isCompletePayloadRow)) {
    return {
      errorMessage: 'Every split row needs a stakeholder and percentage.',
      hasRows: true,
      isDirty,
      isValid: false,
      rows: completeRows,
    }
  }

  if (Math.abs(totalPercentage - 100) > 0.000001) {
    return {
      errorMessage: 'Total stake percentage must equal 100%.',
      hasRows: true,
      isDirty,
      isValid: false,
      rows: completeRows,
    }
  }

  return {
    errorMessage: null,
    hasRows: true,
    isDirty,
    isValid: true,
    rows: completeRows,
  }
}

function getStakeholderLabel(
  row: SplitDraftRow,
  stakeholderOptions: StakeholderOption[],
) {
  const option = stakeholderOptions.find(
    (candidate) => candidate.value === row.idStakeholder,
  )

  return option?.label ?? `Stakeholder #${row.idStakeholder || '-'}`
}

function getRowStakeholderOptions(
  row: SplitDraftRow,
  stakeholderOptions: StakeholderOption[],
) {
  return stakeholderOptions.some((option) => option.value === row.idStakeholder) ||
    !row.idStakeholder
    ? stakeholderOptions
    : [
        {
          label: `Stakeholder #${row.idStakeholder}`,
          value: row.idStakeholder,
        },
        ...stakeholderOptions,
      ]
}

export function ProjectStakeholderLines({
  isCreate,
  onDraftChange,
  projectId,
  totalProjectCost,
}: ProjectStakeholderLinesProps) {
  const projectIdValue = toInputValue(projectId)
  const [draftRows, setDraftRows] = useState<SplitDraftRow[] | null>(() =>
    isCreate ? [] : null,
  )
  const [editingRows, setEditingRows] = useState<
    Record<string, EditingSplitRow>
  >({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [nextRowIndex, setNextRowIndex] = useState(0)
  const [hasChanged, setHasChanged] = useState(false)

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
    () =>
      buildDraftState(
        activeRows,
        totalPercentage,
        hasChanged,
        Object.keys(editingRows).length > 0,
      ),
    [activeRows, editingRows, hasChanged, totalPercentage],
  )

  useEffect(() => {
    onDraftChange(draftState)
  }, [draftState, onDraftChange])

  function handleAddRow() {
    const rowKey = `new-${nextRowIndex}`
    const nextRow = { rowKey, ...EMPTY_SPLIT_ROW }

    setDraftRows([...activeRows, nextRow])
    setEditingRows((currentRows) => ({
      ...currentRows,
      [rowKey]: { ...nextRow, isNew: true },
    }))
    setNextRowIndex((currentIndex) => currentIndex + 1)
  }

  function handleRemoveRow(rowKey: string) {
    setDraftRows(activeRows.filter((row) => row.rowKey !== rowKey))
    setEditingRows((currentRows) => {
      const nextRows = { ...currentRows }
      delete nextRows[rowKey]
      return nextRows
    })
    setRowErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[rowKey]
      return nextErrors
    })
    setHasChanged(true)
  }

  function handleEditRow(row: SplitDraftRow) {
    setEditingRows((currentRows) => ({
      ...currentRows,
      [row.rowKey]: { ...row, isNew: false },
    }))
  }

  function handleCancelRow(rowKey: string) {
    const editedRow = editingRows[rowKey]

    if (editedRow?.isNew) {
      setDraftRows(activeRows.filter((row) => row.rowKey !== rowKey))
    }

    setEditingRows((currentRows) => {
      const nextRows = { ...currentRows }
      delete nextRows[rowKey]
      return nextRows
    })
    setRowErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[rowKey]
      return nextErrors
    })
  }

  function handleSaveRow(rowKey: string) {
    const editedRow = editingRows[rowKey]

    if (!editedRow) {
      return
    }

    const idStakeholder = parseNumericInput(editedRow.idStakeholder)
    const stakePercentage = parseNumericInput(editedRow.stakePercentage)

    if (
      idStakeholder === null ||
      stakePercentage === null ||
      stakePercentage <= 0 ||
      stakePercentage > 100
    ) {
      setRowErrors((currentErrors) => ({
        ...currentErrors,
        [rowKey]: 'Stakeholder and percentage are required.',
      }))
      return
    }

    setDraftRows(
      activeRows.map((row) =>
        row.rowKey === rowKey
          ? {
              ...row,
              idStakeholder: String(idStakeholder),
              stakePercentage: String(stakePercentage),
            }
          : row,
      ),
    )
    setEditingRows((currentRows) => {
      const nextRows = { ...currentRows }
      delete nextRows[rowKey]
      return nextRows
    })
    setRowErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[rowKey]
      return nextErrors
    })
    setHasChanged(true)
  }

  function handleRowChange(
    rowKey: string,
    field: 'idStakeholder' | 'stakePercentage',
    value: string,
  ) {
    setEditingRows((currentRows) => {
      const currentRow = currentRows[rowKey]

      return currentRow
        ? {
            ...currentRows,
            [rowKey]: { ...currentRow, [field]: value },
          }
        : currentRows
    })
    setRowErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[rowKey]
      return nextErrors
    })
  }

  const isLoading = stakeholdersQuery.isLoading || projectRowsQuery.isLoading
  const isTotalComplete =
    activeRows.length === 0 || Math.abs(totalPercentage - 100) <= 0.000001
  const totalStatusColor = draftState.isValid ? 'success' : 'error'
  const tableColumns = [
    {
      dataIndex: 'idStakeholder',
      key: 'idStakeholder',
      render: (_value: string, row: SplitDraftRow) => {
        const editingRow = editingRows[row.rowKey]

        return editingRow ? (
          <Select
            aria-label="Stakeholder"
            id={`project-split-stakeholder-${row.rowKey}`}
            onChange={(value) =>
              handleRowChange(row.rowKey, 'idStakeholder', value)
            }
            options={getRowStakeholderOptions(editingRow, stakeholderOptions)}
            placeholder="Select stakeholder..."
            size="small"
            status={rowErrors[row.rowKey] ? 'error' : undefined}
            value={editingRow.idStakeholder || undefined}
          />
        ) : (
          getStakeholderLabel(row, stakeholderOptions)
        )
      },
      title: 'Stakeholder',
    },
    {
      align: 'right' as const,
      dataIndex: 'stakePercentage',
      key: 'stakePercentage',
      render: (_value: string, row: SplitDraftRow) => {
        const editingRow = editingRows[row.rowKey]

        return editingRow ? (
          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <InputNumber
              aria-label="Stake Percentage"
              id={`project-split-percentage-${row.rowKey}`}
              max={100}
              min={0}
              onChange={(value) =>
                handleRowChange(
                  row.rowKey,
                  'stakePercentage',
                  value === null ? '' : String(value),
                )
              }
              precision={2}
              size="small"
              status={rowErrors[row.rowKey] ? 'error' : undefined}
              step={0.01}
              suffix="%"
              value={
                editingRow.stakePercentage === ''
                  ? null
                  : Number(editingRow.stakePercentage)
              }
            />
            {rowErrors[row.rowKey] ? (
              <Typography.Text type="danger">
                {rowErrors[row.rowKey]}
              </Typography.Text>
            ) : null}
          </Space>
        ) : (
          formatPercentage(row.stakePercentage)
        )
      },
      title: 'Stake Percentage',
      width: 180,
    },
    {
      align: 'right' as const,
      key: 'stakeAmount',
      render: (_value: string, row: SplitDraftRow) => {
        const displayRow = editingRows[row.rowKey] ?? row

        return (
          <Typography.Text aria-label="Stake Amount">
            {formatCurrency(getStakeAmount(totalProjectCost, displayRow))}
          </Typography.Text>
        )
      },
      title: 'Stake Amount',
      width: 180,
    },
    {
      align: 'right' as const,
      key: 'actions',
      render: (_value: string, row: SplitDraftRow, index: number) => {
        const isEditing = Boolean(editingRows[row.rowKey])
        const rowNumber = index + 1

        return isEditing ? (
          <Space size="small">
            <Button
              aria-label={`Save row ${rowNumber}`}
              onClick={() => handleSaveRow(row.rowKey)}
              size="small"
              type="primary"
            >
              Save
            </Button>
            <Button
              aria-label={`Cancel row ${rowNumber}`}
              onClick={() => handleCancelRow(row.rowKey)}
              size="small"
              type="default"
            >
              Cancel
            </Button>
          </Space>
        ) : (
          <Space size="small">
            <Button
              aria-label={`Edit row ${rowNumber}`}
              onClick={() => handleEditRow(row)}
              size="small"
              type="default"
            >
              Edit
            </Button>
            <Button
              aria-label={`Remove row ${rowNumber}`}
              onClick={() => handleRemoveRow(row.rowKey)}
              size="small"
              type="default"
            >
              Remove
            </Button>
          </Space>
        )
      },
      title: 'Actions',
      width: 180,
    },
  ]

  return (
    <fieldset className="form-section split-editor">
      <legend>Stakeholder Split</legend>

      {stakeholdersQuery.isError || projectRowsQuery.isError ? (
        <Alert
          title="Unable to load stakeholder split data."
          role="alert"
          showIcon
          type="error"
        />
      ) : null}

      {isLoading ? (
        <Typography.Paragraph className="page-description">
          Loading stakeholder split...
        </Typography.Paragraph>
      ) : (
        <Form component={false} layout="vertical">
          <Space className="split-summary" orientation="vertical" size="small">
            <Space aria-live="polite" size="small">
              <Tag color={totalStatusColor}>
                Total allocation: {formatTotal(totalPercentage)}%
              </Tag>
              <Typography.Text type={isTotalComplete ? 'secondary' : 'danger'}>
                Total must equal 100% before saving.
              </Typography.Text>
            </Space>
            {draftState.errorMessage ? (
              <Alert title={draftState.errorMessage} showIcon type="error" />
            ) : null}
          </Space>

          <Table
            columns={tableColumns}
            dataSource={activeRows}
            locale={{
              emptyText: 'No stakeholders have been added to this project.',
            }}
            pagination={false}
            rowKey="rowKey"
            scroll={{ x: 900 }}
            size="small"
          />

          <Space className="form-actions">
            <Button onClick={handleAddRow} type="default">
              Add stakeholder
            </Button>
          </Space>
        </Form>
      )}
    </fieldset>
  )
}
