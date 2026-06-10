import type { TableHTMLAttributes } from 'react'
import { useMemo, useState } from 'react'
import {
  CloseOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, Button, Empty, Form, Input, Space, Table, Typography } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { getJson, putJson } from '../../api/client'
import type { StakeholderProjectTransaction } from '../../api/types'
import { formatMoney, parseMoneyNumber } from '../../utils/money'

const EMPTY_TRANSACTION_ROW = {
  amount: '',
  date: '',
  description: '',
}

type TransactionPayloadRow = {
  amount: number
  date: string
  description: string
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

type StakeholderProjectTransactionLinesProps = {
  projectId: number
  stakeholderId: number
  stakeholderName: string
}

function getTransactionsPath(projectId: number, stakeholderId: number) {
  return `/stakeholder-project-transactions/projects/${projectId}/stakeholders/${stakeholderId}`
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

function buildDraftRow(
  row: StakeholderProjectTransaction,
  index: number,
): TransactionDraftRow {
  return {
    rowKey: `existing-${toInputValue(row.idStakeholderProjectTransaction) || index}`,
    amount: formatMoney(row.amount),
    date: normalizeDateValue(row.date),
    description: toInputValue(row.description),
  }
}

function getNamedTableComponents(label: string) {
  return {
    table: (props: TableHTMLAttributes<HTMLTableElement>) => (
      <table {...props} aria-label={label} />
    ),
  }
}

function buildPayload(rows: TransactionDraftRow[]): TransactionPayloadRow[] {
  return rows.map((row) => ({
    amount: parseMoneyNumber(row.amount) ?? 0,
    date: row.date.trim(),
    description: row.description.trim(),
  }))
}

function compareTransactionRows(
  left: TransactionDraftRow,
  right: TransactionDraftRow,
) {
  const dateOrder = left.date.localeCompare(right.date)

  return dateOrder === 0 ? left.rowKey.localeCompare(right.rowKey) : dateOrder
}

function sortTransactionRows(rows: TransactionDraftRow[]) {
  return [...rows].sort(compareTransactionRows)
}

function getAmountTone(value: unknown) {
  const numericValue = parseMoneyNumber(value) ?? 0
  return numericValue < 0 ? 'negative' : 'positive'
}

function formatTransactionAmount(value: unknown) {
  const numericValue = parseMoneyNumber(value)

  if (numericValue === null) {
    return `$${formatMoney(value)}`
  }

  return numericValue < 0
    ? `-$${formatMoney(Math.abs(numericValue))}`
    : `$${formatMoney(numericValue)}`
}

export function StakeholderProjectTransactionLines({
  projectId,
  stakeholderId,
  stakeholderName,
}: StakeholderProjectTransactionLinesProps) {
  const [draftRows, setDraftRows] = useState<TransactionDraftRow[] | null>(null)
  const [editingRows, setEditingRows] = useState<
    Record<string, EditingTransactionRow>
  >({})
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({})
  const [nextRowIndex, setNextRowIndex] = useState(0)
  const [saveError, setSaveError] = useState<string | null>(null)
  const transactionsPath = getTransactionsPath(projectId, stakeholderId)
  const queryClient = useQueryClient()
  const tableComponents = useMemo(
    () => getNamedTableComponents(`${stakeholderName} transaction details`),
    [stakeholderName],
  )

  const transactionsQuery = useQuery({
    queryKey: [
      'stakeholder-project-transactions',
      projectId,
      stakeholderId,
    ],
    queryFn: () => getJson<StakeholderProjectTransaction[]>(transactionsPath),
  })

  const loadedRows = useMemo(
    () => sortTransactionRows((transactionsQuery.data ?? []).map(buildDraftRow)),
    [transactionsQuery.data],
  )
  const activeRows = draftRows ?? loadedRows

  const saveMutation = useMutation({
    mutationFn: (rows: TransactionDraftRow[]) =>
      putJson<StakeholderProjectTransaction[], TransactionPayloadRow[]>(
        transactionsPath,
        buildPayload(rows),
      ),
    onError: () =>
      setSaveError('Unable to save stakeholder project transactions.'),
    onSuccess: (rows) => {
      setDraftRows(sortTransactionRows(rows.map(buildDraftRow)))
      setSaveError(null)
      void queryClient.invalidateQueries({
        queryKey: [
          'reports',
          'stakeholder-projects',
          projectId,
          stakeholderId,
        ],
      })
    },
  })

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

    const nextRows = sortTransactionRows(
      activeRows.map((row) =>
        row.rowKey === rowKey
          ? { ...row, amount: formatMoney(amount), date, description }
          : row,
      ),
    )

    setDraftRows(nextRows)
    setEditingRows((currentRows) => {
      const nextEditingRows = { ...currentRows }
      delete nextEditingRows[rowKey]
      return nextEditingRows
    })
    setRowErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[rowKey]
      return nextErrors
    })
    saveMutation.mutate(nextRows)
  }

  function handleRemoveRow(rowKey: string) {
    const nextRows = activeRows.filter((row) => row.rowKey !== rowKey)
    setDraftRows(nextRows)
    setEditingRows((currentRows) => {
      const nextEditingRows = { ...currentRows }
      delete nextEditingRows[rowKey]
      return nextEditingRows
    })
    setRowErrors((currentErrors) => {
      const nextErrors = { ...currentErrors }
      delete nextErrors[rowKey]
      return nextErrors
    })
    saveMutation.mutate(nextRows)
  }

  const tableColumns: ColumnsType<TransactionDraftRow> = [
    {
      className: 'stakeholder-transaction-date-cell',
      dataIndex: 'date',
      key: 'date',
      render: (_value: string, row) => {
        const editingRow = editingRows[row.rowKey]

        return editingRow ? (
          <Input
            aria-label="Date"
            id={`stakeholder-project-transaction-date-${row.rowKey}`}
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
      className: 'stakeholder-transaction-description-cell',
      dataIndex: 'description',
      key: 'description',
      render: (_value: string, row) => {
        const editingRow = editingRows[row.rowKey]

        return editingRow ? (
          <Space orientation="vertical" size={4} style={{ width: '100%' }}>
            <Input
              aria-label="Description"
              id={`stakeholder-project-transaction-description-${row.rowKey}`}
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
      align: 'right',
      className: 'stakeholder-transaction-amount-cell',
      dataIndex: 'amount',
      key: 'amount',
      render: (_value: string, row) => {
        const editingRow = editingRows[row.rowKey]

        return editingRow ? (
          <Input
            aria-label="Amount"
            id={`stakeholder-project-transaction-amount-${row.rowKey}`}
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
          <span
            className={`stakeholder-transaction-amount stakeholder-transaction-amount-${getAmountTone(row.amount)}`}
          >
            {formatTransactionAmount(row.amount)}
          </span>
        )
      },
      title: 'Amount',
      width: 180,
    },
    {
      align: 'right',
      className: 'stakeholder-transaction-actions-cell',
      key: 'actions',
      render: (_value: unknown, row, index) => {
        const isEditing = Boolean(editingRows[row.rowKey])
        const rowNumber = index + 1

        return isEditing ? (
          <Space size="small">
            <Button
              aria-label={`Save row ${rowNumber}`}
              icon={<SaveOutlined />}
              loading={saveMutation.isPending}
              onClick={() => handleSaveRow(row.rowKey)}
              size="small"
              type="primary"
            />
            <Button
              aria-label={`Cancel row ${rowNumber}`}
              icon={<CloseOutlined />}
              onClick={() => handleCancelRow(row.rowKey)}
              size="small"
              type="default"
            />
          </Space>
        ) : (
          <Space size="small">
            <Button
              aria-label={`Edit row ${rowNumber}`}
              icon={<EditOutlined />}
              onClick={() => handleEditRow(row)}
              size="small"
              type="default"
            />
            <Button
              aria-label={`Remove row ${rowNumber}`}
              icon={<DeleteOutlined />}
              loading={saveMutation.isPending}
              onClick={() => handleRemoveRow(row.rowKey)}
              size="small"
              type="default"
            />
          </Space>
        )
      },
      title: 'Actions',
      width: 180,
    },
  ]

  return (
    <section
      aria-label="Stakeholder Transactions"
      className="stakeholder-transactions-card"
    >
      <div className="stakeholder-transactions-card-header">
        <Typography.Title level={3}>Stakeholder Transactions</Typography.Title>
      </div>

      {transactionsQuery.isError ? (
        <Alert
          role="alert"
          showIcon
          title="Unable to load stakeholder project transactions."
          type="error"
        />
      ) : null}

      {saveError ? (
        <Alert role="alert" showIcon title={saveError} type="error" />
      ) : null}

      {transactionsQuery.isLoading ? (
        <Typography.Paragraph className="page-description">
          Loading stakeholder project transactions...
        </Typography.Paragraph>
      ) : (
        <Form component={false} layout="vertical">
          <Table<TransactionDraftRow>
            className="report-table stakeholder-project-transaction-table"
            columns={tableColumns}
            components={tableComponents}
            dataSource={activeRows}
            locale={{
              emptyText: (
                <Empty description="No stakeholder transactions have been recorded yet." />
              ),
            }}
            pagination={false}
            rowKey="rowKey"
            scroll={{ x: 760 }}
            size="small"
          />

          <div className="stakeholder-transactions-card-footer">
            <Button
              aria-label="Add transaction"
              icon={<PlusOutlined />}
              onClick={handleAddRow}
              type="link"
            >
              Add transaction
            </Button>
          </div>
        </Form>
      )}
    </section>
  )
}
