import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type DataTableColumn } from './DataTable'

type ProductRow = {
  id: number
  name: string
  tag: string
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
})
