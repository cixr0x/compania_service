import { useMemo } from 'react'
import { Input, Table } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { formatMoney } from '../utils/money'

export type DataTableColumn<Row extends Record<string, unknown>> = {
  key: keyof Row & string
  header: string
  valueGetter?: (row: Row) => unknown
  valueFormat?: 'money'
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
}

function formatCellValue<Row extends Record<string, unknown>>(
  value: unknown,
  column?: DataTableColumn<Row>,
): string {
  if (value === null || value === undefined || value === '') {
    return '-'
  }

  if (column?.valueFormat === 'money') {
    return formatMoney(value)
  }

  return String(value)
}

function compareValues(left: unknown, right: unknown): number {
  const leftNumber = typeof left === 'number' ? left : Number(left)
  const rightNumber = typeof right === 'number' ? right : Number(right)

  if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
    return leftNumber - rightNumber
  }

  return formatCellValue(left).localeCompare(formatCellValue(right), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

function getColumnValue<Row extends Record<string, unknown>>(
  row: Row,
  column: DataTableColumn<Row>,
): unknown {
  return column.valueGetter ? column.valueGetter(row) : row[column.key]
}

const DEFAULT_PAGE_SIZE = 10

export function DataTable<Row extends Record<string, unknown>>({
  rows,
  columns,
  searchValue,
  onSearchChange,
  getRowId,
  onRowDoubleClick,
  isLoading = false,
  emptyMessage = 'No records found.',
}: DataTableProps<Row>) {
  const visibleRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()
    return normalizedSearch
      ? rows.filter((row) =>
          columns.some((column) =>
            formatCellValue(getColumnValue(row, column), column)
              .toLowerCase()
              .includes(normalizedSearch),
          ),
        )
      : rows
  }, [columns, rows, searchValue])

  const tableColumns: ColumnsType<Row> = columns.map((column) => ({
    dataIndex: column.key,
    key: column.key,
    sorter: (left, right) =>
      compareValues(getColumnValue(left, column), getColumnValue(right, column)),
    title: column.header,
    render: (_value: unknown, row: Row) =>
      formatCellValue(getColumnValue(row, column), column),
  }))

  return (
    <div className="table-stack">
      <label className="search-field ant-search-field">
        <span>Search</span>
        <Input.Search
          allowClear
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search records"
          value={searchValue}
        />
      </label>

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
