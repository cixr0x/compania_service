import { EditOutlined } from '@ant-design/icons'
import { useMemo, type ReactNode } from 'react'
import { Button, Input, Table, Tag } from 'antd'
import type { ColumnType, ColumnsType } from 'antd/es/table'
import { formatCurrency } from '../utils/money'

export type DataTableColumn<Row extends Record<string, unknown>> = {
  key: keyof Row & string
  header: string
  valueGetter?: (row: Row) => unknown
  valueFormat?: 'money'
  valueType?: 'boolean' | 'date' | 'number' | 'string'
  width?: number
}

type DataTableProps<Row extends Record<string, unknown>> = {
  rows: Row[]
  columns: DataTableColumn<Row>[]
  searchValue: string
  onSearchChange: (value: string) => void
  getRowId: (row: Row) => string | number
  onRowDoubleClick: (row: Row) => void
  isLoading?: boolean
  emptyMessage?: string
  toolbarAction?: ReactNode
}

type ColumnKind = 'boolean' | 'date' | 'id' | 'money' | 'number' | 'string'

const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function isEmptyValue(value: unknown): boolean {
  return value === null || value === undefined || value === ''
}

function parseDateLikeValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmedValue = value.trim()
  const dateOnlyMatch = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dateOnlyMatch) {
    return new Date(
      Number(dateOnlyMatch[1]),
      Number(dateOnlyMatch[2]) - 1,
      Number(dateOnlyMatch[3]),
    )
  }

  if (!/^\d{4}-\d{2}-\d{2}(?:[T\s].*)?$/.test(trimmedValue)) {
    return null
  }

  const date = new Date(trimmedValue)
  return Number.isNaN(date.getTime()) ? null : date
}

function inferColumnKind<Row extends Record<string, unknown>>(
  column: DataTableColumn<Row>,
  rows: Row[],
): ColumnKind {
  if (column.valueFormat === 'money') {
    return 'money'
  }

  if (column.valueType) {
    return column.valueType
  }

  const lowerKey = column.key.toLowerCase()
  const lowerHeader = column.header.toLowerCase()

  if (lowerKey.startsWith('id') || lowerHeader === 'id' || lowerHeader.endsWith(' id')) {
    return 'id'
  }

  const values = rows
    .map((row) => getColumnValue(row, column))
    .filter((value) => !isEmptyValue(value))

  if (values.some((value) => typeof value === 'boolean')) {
    return 'boolean'
  }

  if (
    lowerKey.includes('date') ||
    values.some((value) => parseDateLikeValue(value) !== null)
  ) {
    return 'date'
  }

  if (values.some((value) => typeof value === 'number')) {
    return 'number'
  }

  return 'string'
}

function formatCellValue<Row extends Record<string, unknown>>(
  value: unknown,
  column?: DataTableColumn<Row>,
  kind?: ColumnKind,
): string {
  if (isEmptyValue(value)) {
    return '-'
  }

  if (column?.valueFormat === 'money' || kind === 'money') {
    return formatCurrency(value)
  }

  if (kind === 'boolean') {
    return value === true || value === 'true' || value === 1 || value === '1'
      ? 'Yes'
      : 'No'
  }

  if (kind === 'date') {
    const date = parseDateLikeValue(value)
    return date ? dateFormatter.format(date) : String(value)
  }

  return String(value)
}

function renderCellValue<Row extends Record<string, unknown>>(
  value: unknown,
  column: DataTableColumn<Row>,
  kind: ColumnKind,
): ReactNode {
  if (isEmptyValue(value)) {
    return '-'
  }

  if (kind === 'boolean') {
    const isEnabled =
      value === true || value === 'true' || value === 1 || value === '1'
    return <Tag color={isEnabled ? 'success' : 'default'}>{isEnabled ? 'Yes' : 'No'}</Tag>
  }

  return formatCellValue(value, column, kind)
}

function compareValues(
  left: unknown,
  right: unknown,
  kind: ColumnKind = 'string',
): number {
  if (kind === 'date') {
    const leftDate = parseDateLikeValue(left)
    const rightDate = parseDateLikeValue(right)

    if (leftDate && rightDate) {
      return leftDate.getTime() - rightDate.getTime()
    }
  }

  const leftNumber = typeof left === 'number' ? left : Number(left)
  const rightNumber = typeof right === 'number' ? right : Number(right)

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber
  }

  return formatCellValue(left, undefined, kind).localeCompare(
    formatCellValue(right, undefined, kind),
    undefined,
    {
      numeric: true,
      sensitivity: 'base',
    },
  )
}

function getColumnValue<Row extends Record<string, unknown>>(
  row: Row,
  column: DataTableColumn<Row>,
): unknown {
  return column.valueGetter ? column.valueGetter(row) : row[column.key]
}

const DEFAULT_PAGE_SIZE = 10

function getColumnWidth(kind: ColumnKind, columnWidth: number | undefined) {
  if (columnWidth) {
    return columnWidth
  }

  if (kind === 'id') {
    return 96
  }

  if (kind === 'boolean') {
    return 112
  }

  if (kind === 'date') {
    return 144
  }

  if (kind === 'money') {
    return 144
  }

  if (kind === 'number') {
    return 120
  }

  return undefined
}

function isRightAligned(kind: ColumnKind) {
  return kind === 'id' || kind === 'money' || kind === 'number'
}

function getRowEditLabel<Row extends Record<string, unknown>>(
  row: Row,
  columns: DataTableColumn<Row>[],
  rows: Row[],
): string {
  const nameValue = row.name

  if (typeof nameValue === 'string' && nameValue.trim() !== '') {
    return nameValue.trim()
  }

  const firstColumn = columns[0]
  if (!firstColumn) {
    return 'record'
  }

  return formatCellValue(
    getColumnValue(row, firstColumn),
    firstColumn,
    inferColumnKind(firstColumn, rows),
  )
}

export function DataTable<Row extends Record<string, unknown>>({
  rows,
  columns,
  searchValue,
  onSearchChange,
  getRowId,
  onRowDoubleClick,
  isLoading = false,
  emptyMessage = 'No records found.',
  toolbarAction,
}: DataTableProps<Row>) {
  const visibleRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()
    return normalizedSearch
      ? rows.filter((row) =>
          columns.some((column) => {
            const kind = inferColumnKind(column, rows)

            return formatCellValue(getColumnValue(row, column), column, kind)
              .toLowerCase()
              .includes(normalizedSearch)
          }),
        )
      : rows
  }, [columns, rows, searchValue])

  const dataColumns: ColumnType<Row>[] = columns.map((column) => {
    const kind = inferColumnKind(column, visibleRows)

    return {
      align: isRightAligned(kind) ? ('right' as const) : undefined,
      className: isRightAligned(kind) ? 'ant-table-cell-right' : undefined,
      dataIndex: column.key,
      key: column.key,
      sorter: (left: Row, right: Row) =>
        compareValues(
          getColumnValue(left, column),
          getColumnValue(right, column),
          kind,
        ),
      title: column.header,
      render: (_value: unknown, row: Row) =>
        renderCellValue(getColumnValue(row, column), column, kind),
      width: getColumnWidth(kind, column.width),
    }
  })

  const tableColumns: ColumnsType<Row> = [
    ...dataColumns,
    {
      align: 'right' as const,
      className: 'entity-data-table-action-cell',
      fixed: 'right',
      key: 'actions',
      render: (_value: unknown, row: Row) => (
        <Button
          aria-label={`Edit ${getRowEditLabel(row, columns, visibleRows)}`}
          icon={<EditOutlined />}
          onClick={(event) => {
            event.stopPropagation()
            onRowDoubleClick(row)
          }}
          size="small"
          type="link"
        >
          Edit
        </Button>
      ),
      title: 'Action',
      width: 96,
    },
  ]

  return (
    <div className="table-stack">
      <div className="table-toolbar">
        <label className="search-field ant-search-field">
          <span>Search</span>
          <Input.Search
            allowClear
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search records"
            value={searchValue}
          />
        </label>
        {toolbarAction ? (
          <div className="table-toolbar-actions">{toolbarAction}</div>
        ) : null}
      </div>

      <Table<Row>
        className="entity-data-table"
        columns={tableColumns}
        dataSource={visibleRows}
        loading={isLoading}
        locale={{
          emptyText: isLoading ? 'Loading records...' : emptyMessage,
        }}
        onRow={(row) => ({
          onDoubleClick: () => onRowDoubleClick(row),
          onKeyDown: (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              onRowDoubleClick(row)
            }
          },
          tabIndex: 0,
        })}
        pagination={
          visibleRows.length > DEFAULT_PAGE_SIZE
            ? {
                pageSize: DEFAULT_PAGE_SIZE,
                showSizeChanger: false,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}`,
              }
            : false
        }
        rowKey={(row) => String(getRowId(row))}
        scroll={{ x: 'max-content' }}
        size="middle"
      />
    </div>
  )
}
