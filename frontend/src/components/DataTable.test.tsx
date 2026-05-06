import { useState } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DataTable, type DataTableColumn } from './DataTable'

type ProductRow = {
  id: number
  amount?: string | number
  adminCost?: number
  isActive?: boolean
  name: string
  productionCost?: number
  saleDate?: string
  tag: string
  totalCost?: number
  units?: number
}

const rows: ProductRow[] = [
  { id: 1, name: 'Walnut Desk', tag: 'office' },
  { id: 2, name: 'Canvas Chair', tag: 'studio' },
]

const columns: DataTableColumn<ProductRow>[] = [
  { key: 'name', header: 'Name' },
  { key: 'tag', header: 'Tag' },
]

function DataTableHarness({
  onRowDoubleClick = vi.fn(),
}: {
  onRowDoubleClick?: (row: ProductRow) => void
}) {
  const [searchValue, setSearchValue] = useState('')

  return (
    <DataTable
      columns={columns}
      getRowId={(row) => row.id}
      onRowDoubleClick={onRowDoubleClick}
      onSearchChange={setSearchValue}
      rows={rows}
      searchValue={searchValue}
    />
  )
}

describe('DataTable', () => {
  afterEach(() => {
    cleanup()
  })

  it('filters rows by search text across row values', async () => {
    const user = userEvent.setup()

    render(<DataTableHarness />)

    await user.type(screen.getByRole('searchbox', { name: /search/i }), 'desk')

    expect(screen.getByText('Walnut Desk')).toBeInTheDocument()
    expect(screen.queryByText('Canvas Chair')).not.toBeInTheDocument()
  })

  it('calls onRowDoubleClick with the double-clicked row', async () => {
    const user = userEvent.setup()
    const onRowDoubleClick = vi.fn()

    render(<DataTableHarness onRowDoubleClick={onRowDoubleClick} />)

    await user.dblClick(screen.getByText('Canvas Chair').closest('tr')!)

    expect(onRowDoubleClick).toHaveBeenCalledWith(rows[1])
  })

  it('calls onRowDoubleClick when Enter or Space activates a focused row', async () => {
    const user = userEvent.setup()
    const onRowDoubleClick = vi.fn()

    render(<DataTableHarness onRowDoubleClick={onRowDoubleClick} />)

    screen.getByText('Walnut Desk').closest('tr')!.focus()
    await user.keyboard('{Enter}')
    await user.keyboard(' ')

    expect(onRowDoubleClick).toHaveBeenNthCalledWith(1, rows[0])
    expect(onRowDoubleClick).toHaveBeenNthCalledWith(2, rows[0])
  })

  it('formats money columns with a dollar prefix, commas, and two decimal places', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', header: 'Name' },
          { key: 'amount', header: 'Amount', valueFormat: 'money' },
        ]}
        getRowId={(row) => row.id}
        onRowDoubleClick={vi.fn()}
        onSearchChange={vi.fn()}
        rows={[
          { id: 1, name: 'Large sale', tag: 'office', amount: 1000000 },
          { id: 2, name: 'Decimal sale', tag: 'studio', amount: '1250.5' },
        ]}
        searchValue=""
      />,
    )

    expect(screen.getByText('$1,000,000.00')).toBeVisible()
    expect(screen.getByText('$1,250.50')).toBeVisible()
  })

  it('formats operational values with aligned numeric cells, date text, boolean tags, and edit actions', async () => {
    const user = userEvent.setup()
    const onRowDoubleClick = vi.fn()
    const expectedDate = new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(2026, 4, 4))

    render(
      <DataTable
        columns={[
          { key: 'id', header: 'ID' },
          { key: 'saleDate', header: 'Date', valueType: 'date' },
          { key: 'isActive', header: 'Active', valueType: 'boolean' },
          { key: 'units', header: 'Units', valueType: 'number' },
          { key: 'amount', header: 'Amount', valueFormat: 'money' },
        ]}
        getRowId={(row) => row.id}
        onRowDoubleClick={onRowDoubleClick}
        onSearchChange={vi.fn()}
        rows={[
          {
            amount: 1250,
            id: 7,
            isActive: true,
            name: 'Sale',
            saleDate: '2026-05-04T10:00:00.000Z',
            tag: 'store',
            units: 3,
          },
        ]}
        searchValue=""
      />,
    )

    expect(screen.getByText(expectedDate)).toBeVisible()
    expect(screen.getByText('Yes').closest('.ant-tag')).toBeInTheDocument()
    expect(screen.getByText('3').closest('td')).toHaveClass('ant-table-cell-right')
    expect(screen.getByText('$1,250.00').closest('td')).toHaveClass(
      'ant-table-cell-right',
    )

    await user.click(screen.getByRole('button', { name: /edit sale/i }))

    expect(onRowDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 7 }),
    )
  })

  it('paginates longer datasets with a result range summary', () => {
    render(
      <DataTable
        columns={columns}
        getRowId={(row) => row.id}
        onRowDoubleClick={vi.fn()}
        onSearchChange={vi.fn()}
        rows={Array.from({ length: 12 }, (_, index) => ({
          id: index + 1,
          name: `Project ${index + 1}`,
          tag: 'batch',
        }))}
        searchValue=""
      />,
    )

    expect(screen.getByText('1-10 of 12')).toBeVisible()
    expect(screen.getByText('Project 1')).toBeVisible()
    expect(screen.queryByText('Project 12')).not.toBeInTheDocument()
  })

  it('renders, filters, and sorts derived column values', async () => {
    const user = userEvent.setup()

    const derivedColumns = [
      { key: 'name', header: 'Name' },
      {
        key: 'totalCost',
        header: 'Total Cost',
        valueFormat: 'money',
        valueGetter: (row: ProductRow) =>
          (row.productionCost ?? 0) + (row.adminCost ?? 0),
      },
    ] as DataTableColumn<ProductRow>[]

    function DerivedColumnHarness() {
      const [searchValue, setSearchValue] = useState('')

      return (
        <DataTable
          columns={derivedColumns}
          getRowId={(row) => row.id}
          onRowDoubleClick={vi.fn()}
          onSearchChange={setSearchValue}
          rows={[
            {
              id: 1,
              adminCost: 1250.5,
              name: 'Large project',
              productionCost: 8750,
              tag: 'office',
            },
            {
              id: 2,
              adminCost: 100,
              name: 'Small project',
              productionCost: 400,
              tag: 'studio',
            },
          ]}
          searchValue={searchValue}
        />
      )
    }

    render(<DerivedColumnHarness />)

    expect(screen.getByText('$10,000.50')).toBeVisible()
    expect(screen.getByText('$500.00')).toBeVisible()

    await user.type(
      screen.getByRole('searchbox', { name: /search/i }),
      '$10,000.50',
    )

    expect(screen.getByText('Large project')).toBeVisible()
    expect(screen.queryByText('Small project')).not.toBeInTheDocument()

    await user.clear(screen.getByRole('searchbox', { name: /search/i }))
    await user.click(screen.getByRole('columnheader', { name: /total cost/i }))

    const bodyRows = screen.getAllByRole('row').slice(1)
    expect(bodyRows[0]).toHaveTextContent('Small project')
    expect(bodyRows[1]).toHaveTextContent('Large project')
  })
})
