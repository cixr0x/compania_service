import { useMemo, useState } from 'react'
import { formatMoney } from '../utils/money'

export type DataTableColumn<Row extends Record<string, unknown>> = {
  key: keyof Row & string
  header: string
  valueFormat?: 'money'
}

type SortDirection = 'asc' | 'desc'

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
  const [sort, setSort] = useState<{
    key: keyof Row & string
    direction: SortDirection
  } | null>(null)

  const visibleRows = useMemo(() => {
    const normalizedSearch = searchValue.trim().toLowerCase()
    const filteredRows = normalizedSearch
      ? rows.filter((row) =>
          columns.some((column) =>
            formatCellValue(row[column.key], column)
              .toLowerCase()
              .includes(normalizedSearch),
          ),
        )
      : rows

    if (!sort) {
      return filteredRows
    }

    return [...filteredRows].sort((left, right) => {
      const result = compareValues(left[sort.key], right[sort.key])
      return sort.direction === 'asc' ? result : -result
    })
  }, [columns, rows, searchValue, sort])

  function updateSort(key: keyof Row & string) {
    setSort((currentSort) => {
      if (currentSort?.key !== key) {
        return { key, direction: 'asc' }
      }

      return {
        key,
        direction: currentSort.direction === 'asc' ? 'desc' : 'asc',
      }
    })
  }

  return (
    <div className="table-stack">
      <label className="search-field">
        <span>Search</span>
        <input
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search records"
          type="search"
          value={searchValue}
        />
      </label>

      <div className="table-scroll">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  aria-sort={
                    sort?.key === column.key
                      ? sort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : 'none'
                  }
                  key={column.key}
                  scope="col"
                >
                  <button
                    className="table-sort-button"
                    onClick={() => updateSort(column.key)}
                    type="button"
                  >
                    <span>{column.header}</span>
                    <span aria-hidden="true">
                      {sort?.key === column.key
                        ? sort.direction === 'asc'
                          ? 'Asc'
                          : 'Desc'
                        : 'Sort'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td className="table-state" colSpan={columns.length}>
                  Loading records...
                </td>
              </tr>
            ) : visibleRows.length > 0 ? (
              visibleRows.map((row) => (
                <tr
                  key={getRowId(row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      onRowDoubleClick(row)
                    }
                  }}
                  onDoubleClick={() => onRowDoubleClick(row)}
                  tabIndex={0}
                >
                  {columns.map((column) => (
                    <td key={column.key}>
                      {formatCellValue(row[column.key], column)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td className="table-state" colSpan={columns.length}>
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
