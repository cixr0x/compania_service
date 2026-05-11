import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Form, Input, Space, Table, Tag, Typography } from 'antd'
import { getJson } from '../../api/client'
import { formatMoney, parseMoneyNumber } from '../../utils/money'
import type { EntityRow } from './entityConfigs'

const EMPTY_TRANSACTION_ROW = {
  amount: '',
  description: '',
}

type TransactionDraftRow = {
  rowKey: string
  amount: string
  description: string
}

export type ProjectTransactionPayloadRow = {
  amount: number
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

function buildDraftRow(row: EntityRow, index: number): TransactionDraftRow {
  return {
    rowKey: `existing-${toInputValue(row.idProjectTransaction) || index}`,
    amount: formatMoney(row.amount),
    description: toInputValue(row.description),
  }
}

function isCompletePayloadRow(
  row: MaybeTransactionPayloadRow,
): row is ProjectTransactionPayloadRow {
  return row.amount !== null && row.description.trim() !== ''
}

function buildDraftState(
  rows: TransactionDraftRow[],
  isDirty: boolean,
): ProjectTransactionState {
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
    description: row.description.trim(),
  }))
  const completeRows = payloadRows.filter(isCompletePayloadRow)
  const totalCost = completeRows.reduce((total, row) => total + row.amount, 0)

  if (!payloadRows.every(isCompletePayloadRow)) {
    return {
      errorMessage: 'Every transaction row needs an amount and description.',
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
    () => buildDraftState(activeRows, hasChanged),
    [activeRows, hasChanged],
  )

  useEffect(() => {
    onDraftChange(draftState)
  }, [draftState, onDraftChange])

  function handleAddRow() {
    setDraftRows([
      ...activeRows,
      { rowKey: `new-${nextRowIndex}`, ...EMPTY_TRANSACTION_ROW },
    ])
    setNextRowIndex((currentIndex) => currentIndex + 1)
    setHasChanged(true)
  }

  function handleRemoveRow(rowKey: string) {
    setDraftRows(activeRows.filter((row) => row.rowKey !== rowKey))
    setHasChanged(true)
  }

  function handleRowChange(
    rowKey: string,
    field: 'amount' | 'description',
    value: string,
  ) {
    setDraftRows(
      activeRows.map((row) =>
        row.rowKey === rowKey ? { ...row, [field]: value } : row,
      ),
    )
    setHasChanged(true)
  }

  const tableColumns = [
    {
      align: 'right' as const,
      dataIndex: 'amount',
      key: 'amount',
      render: (_value: string, row: TransactionDraftRow) => (
        <Form.Item
          htmlFor={`project-transaction-amount-${row.rowKey}`}
          label="Amount"
          required
        >
          <Input
            aria-label="Amount"
            id={`project-transaction-amount-${row.rowKey}`}
            inputMode="decimal"
            onChange={(event) =>
              handleRowChange(row.rowKey, 'amount', event.target.value)
            }
            prefix="$"
            value={row.amount}
          />
        </Form.Item>
      ),
      title: 'Amount',
      width: 220,
    },
    {
      dataIndex: 'description',
      key: 'description',
      render: (_value: string, row: TransactionDraftRow) => (
        <Form.Item
          htmlFor={`project-transaction-description-${row.rowKey}`}
          label="Description"
          required
        >
          <Input
            aria-label="Description"
            id={`project-transaction-description-${row.rowKey}`}
            onChange={(event) =>
              handleRowChange(row.rowKey, 'description', event.target.value)
            }
            value={row.description}
          />
        </Form.Item>
      ),
      title: 'Description',
    },
    {
      align: 'right' as const,
      key: 'actions',
      render: (_value: string, row: TransactionDraftRow, index: number) => (
        <Button
          aria-label={`Remove row ${index + 1}`}
          onClick={() => handleRemoveRow(row.rowKey)}
          type="default"
        >
          Remove
        </Button>
      ),
      title: 'Actions',
      width: 120,
    },
  ]

  return (
    <fieldset className="form-section split-editor">
      <legend>Project Cost Transactions</legend>

      {projectRowsQuery.isError ? (
        <Alert
          message="Unable to load project cost transactions."
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
              <Alert message={draftState.errorMessage} showIcon type="error" />
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
            scroll={{ x: 720 }}
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
