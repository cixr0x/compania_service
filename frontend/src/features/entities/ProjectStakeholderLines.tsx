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
  const totalStatusColor = isTotalComplete ? 'success' : 'error'
  const tableColumns = [
    {
      dataIndex: 'idStakeholder',
      key: 'idStakeholder',
      render: (_value: string, row: SplitDraftRow) => {
        const rowOptions =
          stakeholderOptions.some((option) => option.value === row.idStakeholder) ||
          !row.idStakeholder
            ? stakeholderOptions
            : [
                {
                  label: `Stakeholder #${row.idStakeholder}`,
                  value: row.idStakeholder,
                },
                ...stakeholderOptions,
              ]

        return (
          <Form.Item
            htmlFor={`project-split-stakeholder-${row.rowKey}`}
            label="Stakeholder"
            required
          >
            <Select
              aria-describedby={`project-split-stakeholder-${row.rowKey}-helper`}
              aria-label="Stakeholder"
              id={`project-split-stakeholder-${row.rowKey}`}
              onChange={(value) =>
                handleRowChange(row.rowKey, 'idStakeholder', value)
              }
              options={rowOptions}
              placeholder="Select stakeholder..."
              value={row.idStakeholder || undefined}
            />
            <Typography.Text
              id={`project-split-stakeholder-${row.rowKey}-helper`}
              type="secondary"
            >
              Stakeholder receiving this share.
            </Typography.Text>
          </Form.Item>
        )
      },
      title: 'Stakeholder',
    },
    {
      dataIndex: 'stakePercentage',
      key: 'stakePercentage',
      render: (_value: string, row: SplitDraftRow) => (
        <Form.Item
          htmlFor={`project-split-percentage-${row.rowKey}`}
          label="Stake Percentage"
          required
        >
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
            step={0.01}
            suffix="%"
            value={
              row.stakePercentage === ''
                ? null
                : Number(row.stakePercentage)
            }
          />
        </Form.Item>
      ),
      title: 'Stake Percentage',
    },
    {
      key: 'actions',
      render: (_value: string, row: SplitDraftRow, index: number) =>
        activeRows.length > 1 ? (
          <Button
            aria-label={`Remove row ${index + 1}`}
            onClick={() => handleRemoveRow(row.rowKey)}
            type="default"
          >
            Remove
          </Button>
        ) : null,
      title: 'Actions',
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
