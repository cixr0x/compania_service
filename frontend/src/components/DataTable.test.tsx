import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
  return (
    <DataTable
      columns={columns}
      getRowId={(row) => row.id}
      onRowDoubleClick={onRowDoubleClick}
      rows={rows}
    />
  )
}

describe('DataTable', () => {
  afterEach(() => {
    cleanup()
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

  it('renders toolbar actions without the global search field', () => {
    render(
      <DataTable
        columns={columns}
        getRowId={(row) => row.id}
        onRowDoubleClick={vi.fn()}
        rows={rows}
        toolbarAction={<button type="button">Create</button>}
      />,
    )

    const toolbar = screen.getByRole('button', { name: 'Create' }).closest('.table-toolbar')

    expect(toolbar).toBeInTheDocument()
    expect(screen.queryByRole('searchbox', { name: /search/i })).not.toBeInTheDocument()
    expect(within(toolbar as HTMLElement).getByRole('button', { name: 'Create' })).toBeVisible()
  })

  it('wraps the table in a labeled scroll region for narrow viewports', () => {
    render(<DataTableHarness />)

    const scrollRegion = screen.getByRole('region', {
      name: 'Scrollable records table',
    })

    expect(scrollRegion).toHaveClass('responsive-table-frame')
    expect(within(scrollRegion).getByRole('table')).toBeVisible()
  })

  it('uses the compact Ant Design table density by default', () => {
    render(<DataTableHarness />)

    expect(screen.getByRole('table').closest('.ant-table')).toHaveClass(
      'ant-table-small',
    )
  })

  it('applies custom header classes to configured columns', () => {
    render(
      <DataTable
        columns={[
          { key: 'name', header: 'Name' },
          {
            key: 'tag',
            header: 'Store ID',
            headerClassName: 'channel-header-store',
          },
        ]}
        getRowId={(row) => row.id}
        onRowDoubleClick={vi.fn()}
        rows={rows}
      />,
    )

    expect(screen.getByRole('columnheader', { name: 'Store ID' })).toHaveClass(
      'channel-header-store',
    )
  })

  it('renders configured cell values as links', () => {
    render(
      <MemoryRouter>
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Name',
              linkGetter: (row) => `/products/${row.id}`,
            },
            { key: 'tag', header: 'Tag' },
          ]}
          getRowId={(row) => row.id}
          onRowDoubleClick={vi.fn()}
          rows={rows}
        />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Walnut Desk' })).toHaveAttribute(
      'href',
      '/products/1',
    )
    expect(screen.getByText('office').closest('a')).toBeNull()
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
        rows={[
          { id: 1, name: 'Large sale', tag: 'office', amount: 1000000 },
          { id: 2, name: 'Decimal sale', tag: 'studio', amount: '1250.5' },
        ]}
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

  it('shows 50 rows per page with a single pager above the table', () => {
    render(
      <DataTable
        columns={columns}
        getRowId={(row) => row.id}
        onRowDoubleClick={vi.fn()}
        rows={Array.from({ length: 52 }, (_, index) => ({
          id: index + 1,
          name: `Project ${index + 1}`,
          tag: 'batch',
        }))}
      />,
    )

    expect(screen.getByText('1-50 of 52')).toBeVisible()
    expect(screen.getByText('Project 1')).toBeVisible()
    expect(screen.getByText('Project 50')).toBeVisible()
    expect(screen.queryByText('Project 51')).not.toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(table.querySelectorAll('tbody tr[data-row-key]')).toHaveLength(50)
    const pager = document.querySelector('.ant-pagination')!
    expect(document.querySelectorAll('.ant-pagination')).toHaveLength(1)
    expect(
      pager.compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    fireEvent.click(screen.getByTitle('2'))
    expect(screen.getByText('51-52 of 52')).toBeVisible()
    expect(screen.getByText('Project 52')).toBeVisible()
    expect(screen.queryByText('Project 1')).not.toBeInTheDocument()
  })

  it('does not add pagination to a dataset that fits on one page', () => {
    render(<DataTableHarness />)
    expect(document.querySelector('.ant-pagination')).not.toBeInTheDocument()
  })

  it('searches displayed and raw values without exposing hidden fields', () => {
    render(
      <DataTable<ProductRow>
        columns={[
          { key: 'id', header: 'ID' },
          { key: 'name', header: 'Name' },
          { key: 'isActive', header: 'Active', valueType: 'boolean' },
          { key: 'saleDate', header: 'Date', valueType: 'date' },
          { key: 'amount', header: 'Amount', valueFormat: 'money' },
          {
            key: 'totalCost',
            header: 'Total Cost',
            valueFormat: 'money',
            valueGetter: (row) =>
              (row.productionCost ?? 0) + (row.adminCost ?? 0),
          },
        ]}
        getRowId={(row) => row.id}
        onRowDoubleClick={vi.fn()}
        rows={[
          {
            id: 901,
            name: 'Walnut Desk',
            tag: 'secret-hidden',
            amount: 1250,
            productionCost: 800,
            adminCost: 950,
            isActive: true,
            saleDate: '2026-05-04',
          },
          {
            id: 902,
            name: 'Canvas Chair',
            tag: 'hidden',
            amount: 90,
            productionCost: 10,
            adminCost: 20,
            isActive: false,
          },
        ]}
        searchable
      />,
    )

    const search = screen.getByRole('searchbox', { name: 'Search' })
    const formattedDate = new Intl.DateTimeFormat(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(2026, 4, 4))
    for (const query of [
      '  wAlNuT  ', '901', 'Yes', '1250', '$1,250.00', '$1250.00',
      '1750', '$1,750.00', formattedDate,
    ]) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('Walnut Desk')).toBeVisible()
      expect(screen.queryByText('Canvas Chair')).not.toBeInTheDocument()
    }
    fireEvent.change(search, { target: { value: 'No' } })
    expect(screen.getByText('Canvas Chair')).toBeVisible()
    expect(screen.queryByText('Walnut Desk')).not.toBeInTheDocument()
    for (const query of ['secret-hidden', '800', 'Edit', 'not-a-match']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('No records found.')).toBeVisible()
    }
    fireEvent.change(search, { target: { value: '   ' } })
    expect(screen.getByText('Walnut Desk')).toBeVisible()
    expect(screen.getByText('Canvas Chair')).toBeVisible()
  })

  it('resets search to page one while preserving sort, links and edit actions', () => {
    const onRowDoubleClick = vi.fn()
    render(
      <MemoryRouter>
        <DataTable
          columns={[
            {
              key: 'name',
              header: 'Name',
              linkGetter: (row) => `/products/${row.id}`,
            },
            { key: 'tag', header: 'Tag' },
          ]}
          getRowId={(row) => row.id}
          onRowDoubleClick={onRowDoubleClick}
          rows={Array.from({ length: 60 }, (_, index) => ({
            id: index + 1,
            name: `Product ${index + 1}`,
            tag: 'batch',
          }))}
          searchable
        />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('columnheader', { name: 'Name' }))
    fireEvent.click(screen.getByRole('columnheader', { name: 'Name' }))
    fireEvent.click(screen.getByTitle('2'))
    expect(screen.getByText('51-60 of 60')).toBeVisible()
    const search = screen.getByRole('searchbox', { name: 'Search' })
    fireEvent.change(search, { target: { value: 'batch' } })
    expect(screen.getByText('1-50 of 60')).toBeVisible()
    const table = screen.getByRole('table')
    expect(table.querySelector('tbody tr[data-row-key]')).toHaveTextContent('Product 60')
    expect(screen.getByRole('link', { name: 'Product 60' })).toHaveAttribute(
      'href', '/products/60',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit Product 60' }))
    expect(onRowDoubleClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 60 }),
    )
    fireEvent.click(screen.getByTitle('2'))
    fireEvent.change(search, { target: { value: '' } })
    expect(screen.getByText('1-50 of 60')).toBeVisible()
    expect(table.querySelector('tbody tr[data-row-key]')).toHaveTextContent('Product 60')
  }, 10000)

  it('renders and sorts derived column values', async () => {
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
      return (
        <DataTable
          columns={derivedColumns}
          getRowId={(row) => row.id}
          onRowDoubleClick={vi.fn()}
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
        />
      )
    }

    render(<DerivedColumnHarness />)

    expect(screen.getByText('$10,000.50')).toBeVisible()
    expect(screen.getByText('$500.00')).toBeVisible()

    expect(screen.queryByRole('searchbox', { name: /search/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('columnheader', { name: /total cost/i }))

    const bodyRows = screen.getAllByRole('row').slice(1)
    expect(bodyRows[0]).toHaveTextContent('Small project')
    expect(bodyRows[1]).toHaveTextContent('Large project')
  })
})
