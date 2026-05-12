import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Form, Input, Space, Table, Tag, Typography } from 'antd'
import { getJson } from '../../api/client'
import { formatMoney, parseMoneyNumber } from '../../utils/money'
import type { EntityRow } from './entityConfigs'

const EMPTY_TRANSACTION_ROW = {
  amount: '',
  date: '',
  description: '',
}

type TransactionDraftRow = {
  rowKey: string
  amount: string
  date: string
  description: string
}

type EditingTransactionRow = TransactionDraftRow & {
  isNew: boolean
}

export type ProjectTransactionPayloadRow = {
  amount: number
  date: string
  description: string
}

export type ProjectTransactionState = {
  errorMessage: string | null
  isDirty: boolean
  isValid: boolean
  rows: ProjectTransactionPayloadRow[]
  totalCost: number
}

type MaybeTransactionPayloadRow = {
  amount: number | null
  date: string
  description: string
}

type ProjectTransactionLinesProps = {
  isCreate: boolean
  onDraftChange: (state: ProjectTransactionState) => void
  projectId: string | number | null | undefined
}

function toInputValue(value: unknown): string {
  return value === null || value === undefined ? '' : String(value)
}

function normalizeDateValue(value: unknown): string {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? '' : value.toISOString().slice(0, 10)
  }

  if (typeof value !== 'string') {
    return ''
  }

  const trimmedValue = value.trim()
  const dateMatch = /^(\d{4}-\d{2}-\d{2})/.exec(trimmedValue)
  return dateMatch?.[1] ?? ''
}

function getTodayDateValue() {
  return new Date().toISOString().slice(0, 10)
}

function buildDraftRow(row: EntityRow, index: number): TransactionDraftRow {
  return {
    rowKey: `existing-${toInputValue(row.idProjectTransaction) || index}`,
    amount: formatMoney(row.amount),
    date: normalizeDateValue(row.date),
    description: toInputValue(row.description),
  }
}

function isCompletePayloadRow(
  row: MaybeTransactionPayloadRow,
): row is ProjectTransactionPayloadRow {
  return (
    row.amount !== null &&
    row.date.trim() !== '' &&
    row.description.trim() !== ''
  )
}

function buildDraftState(
  rows: TransactionDraftRow[],
  isDirty: boolean,
  hasEditingRows: boolean,
): ProjectTransactionState {
  const totalCost = rows.reduce(
    (total, row) => total + (parseMoneyNumber(row.amount) ?? 0),
    0,
  )

  if (hasEditingRows) {
    return {
      errorMessage: 'Save or cancel transaction row edits before saving the project.',
      isDirty,
      isValid: false,
      rows: [],
      totalCost,
    }
  }

  if (rows.length === 0) {
    return {
      errorMessage: null,
      isDirty,
      isValid: true,
      rows: [],
      totalCost: 0,
    }
  }

  const payloadRows: MaybeTransactionPayloadRow[] = rows.map((row) => ({
    amount: parseMoneyNumber(row.amount),
    date: row.date.trim(),
    description: row.description.trim(),
  }))
  const completeRows = payloadRows.filter(isCompletePayloadRow)

  if (!payloadRows.every(isCompletePayloadRow)) {
    return {
      errorMessage: 'Every transaction row needs a date, amount, and description.',
      isDirty,
      isValid: false,
      rows: completeRows,
      totalCost,
    }
  }

  return {
    errorMessage: null,
    isDirty,
    isValid: true,
    rows: completeRows,
    totalCost,
  }
}

export function ProjectTransactionLines({
  isCreate,
  onDraftChange,
  projectId,
}: ProjectTransactionLinesProps) {
  const projectIdValue = toInputValue(projectId)
  const [draftRows, setDraftRows] = useState<TransactionDraftRow[] | null>(() =>
    isCreate ? [] : null,
  )
  const [editingRows, setEditingRows] = useState<
    Record<string, EditingTransactionRow>
  >({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [nextRowIndex, setNextRowIndex] = useState(0)
  const [hasChanged, setHasChanged] = useState(false)

  const projectRowsQuery = useQuery({
    enabled: !isCreate && Boolean(projectIdValue),
    queryKey: ['project-cost-transactions', projectIdValue],
    queryFn: () =>
      getJson<EntityRow[]>(`/project-transactions/projects/${projectIdValue}`),
  })

  const loadedRows = useMemo(
    () => (projectRowsQuery.data ?? []).map(buildDraftRow),
    [projectRowsQuery.data],
  )
  const activeRows = draftRows ?? loadedRows

  const draftState = useMemo(
    () =>
      buildDraftState(activeRows, hasChanged, Object.keys(editingRows).length > 0),
    [activeRows, editingRows, hasChanged],
  )

  useEffect(() => {
    onDraftChange(draftState)
  }, [draftState, onDraftChange])

  function handleAddRow() {
    const rowKey = `new-${nextRowIndex}`
    const nextRow = {
      rowKey,
      ...EMPTY_TRANSACTION_ROW,
      date: getTodayDateValue(),
    }

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

  function handleEditRow(row: TransactionDraftRow) {
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

    const amount = parseMoneyNumber(editedRow.amount)
    const date = editedRow.date.trim()
    const description = editedRow.description.trim()

    if (amount === null || date === '' || description === '') {
      setRowErrors((currentErrors) => ({
        ...currentErrors,
        [rowKey]: 'Date, amount, and description are required.',
      }))
      return
    }

    setDraftRows(
      activeRows.map((row) =>
        row.rowKey === rowKey
          ? { ...row, amount: formatMoney(amount), date, description }
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
    field: 'amount' | 'date' | 'description',
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

  const tableColumns = [
    {
      dataIndex: 'date',
      key: 'date',
      render: (_value: string, row: TransactionDraftRow) => {
        const editingRow = editingRows[row.rowKey]

        return editingRow ? (
          <Input
            aria-label="Date"
            id={`project-transaction-date-${row.rowKey}`}
            onChange={(event) =>
              handleRowChange(row.rowKey, 'date', event.target.value)
            }
            size="small"
            status={rowErrors[row.rowKey] ? 'error' : undefined}
            type="date"
            value={editingRow.date}
          />
        ) : (
          row.date || '-'
        )
      },
      title: 'Date',
      width: 150,
    },
    {
      dataIndex: 'description',
      key: 'description',
      render: (_value: string, row: TransactionDraftRow) => {
        const editingRow = editingRows[row.rowKey]

        return editingRow ? (
          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <Input
              aria-label="Description"
              id={`project-transaction-description-${row.rowKey}`}
              onChange={(event) =>
                handleRowChange(row.rowKey, 'description', event.target.value)
              }
              size="small"
              status={rowErrors[row.rowKey] ? 'error' : undefined}
              value={editingRow.description}
            />
            {rowErrors[row.rowKey] ? (
              <Typography.Text type="danger">
                {rowErrors[row.rowKey]}
              </Typography.Text>
            ) : null}
          </Space>
        ) : (
          row.description || '-'
        )
      },
      title: 'Description',
    },
    {
      align: 'right' as const,
      dataIndex: 'amount',
      key: 'amount',
      render: (_value: string, row: TransactionDraftRow) => {
        const editingRow = editingRows[row.rowKey]

        return editingRow ? (
          <Input
            aria-label="Amount"
            id={`project-transaction-amount-${row.rowKey}`}
            inputMode="decimal"
            onChange={(event) =>
              handleRowChange(row.rowKey, 'amount', event.target.value)
            }
            prefix="$"
            size="small"
            status={rowErrors[row.rowKey] ? 'error' : undefined}
            value={editingRow.amount}
          />
        ) : (
          `$${formatMoney(row.amount)}`
        )
      },
      title: 'Amount',
      width: 180,
    },
    {
      align: 'right' as const,
      key: 'actions',
      render: (_value: string, row: TransactionDraftRow, index: number) => {
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
      <legend>Project Cost Transactions</legend>

      {projectRowsQuery.isError ? (
        <Alert
          title="Unable to load project cost transactions."
          role="alert"
          showIcon
          type="error"
        />
      ) : null}

      {projectRowsQuery.isLoading ? (
        <Typography.Paragraph className="page-description">
          Loading project cost transactions...
        </Typography.Paragraph>
      ) : (
        <Form component={false} layout="vertical">
          <Space className="split-summary" orientation="vertical" size="small">
            <Tag color={draftState.isValid ? 'success' : 'error'}>
              Total cost: ${formatMoney(draftState.totalCost)}
            </Tag>
            {draftState.errorMessage ? (
              <Alert title={draftState.errorMessage} showIcon type="error" />
            ) : null}
          </Space>

          <Table
            columns={tableColumns}
            dataSource={activeRows}
            locale={{
              emptyText: 'No cost transactions have been added to this project.',
            }}
            pagination={false}
            rowKey="rowKey"
            scroll={{ x: 860 }}
            size="small"
          />

          <Space className="form-actions">
            <Button onClick={handleAddRow} type="default">
              Add transaction
            </Button>
          </Space>
        </Form>
      )}
    </fieldset>
  )
}
