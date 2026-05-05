import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJson, patchJson, postJson } from '../../api/client'
import type { ImportError, ImportStageRow } from '../../api/types'
import { SalesImportPage } from './SalesImportPage'

vi.mock('../../api/client', () => ({
  api: {
    post: vi.fn(),
  },
  getJson: vi.fn(),
  patchJson: vi.fn(),
  postJson: vi.fn(),
}))

const stagedRows: ImportStageRow[] = [
  {
    idImportStage: 10,
    idImportBatch: 1,
    rowNumber: 2,
    externalProductId: 'SKU-STARTER',
    importedProductDescription: 'Starter kit black bundle',
    idProduct: 101,
    quantity: 3,
    amount: '129.99',
    rawRow: null,
    createdAt: '2026-05-05T10:00:00.000Z',
    product: {
      id: 101,
      name: 'Starter Kit',
      description: null,
      image: null,
      idEcommerce: 'SKU-STARTER',
      idStore: null,
      idEvent: null,
      idSurface: null,
      idModel: null,
      ownership: 100,
      tag: null,
    },
    errors: [],
  },
]

const rowErrors: ImportError[] = [
  {
    idImportError: 20,
    idImportBatch: 1,
    idImportStage: 10,
    rowNumber: 2,
    field: 'amount',
    message: 'Amount is required',
    createdAt: '2026-05-05T10:01:00.000Z',
  },
]

function mockImportQueries(rows: ImportStageRow[], errors: ImportError[]) {
  vi.mocked(getJson).mockImplementation((path: string) => {
    if (path === '/import-batches/1/stage') {
      return Promise.resolve(rows)
    }

    if (path === '/import-batches/1/errors') {
      return Promise.resolve(errors)
    }

    return Promise.reject(new Error(`Unexpected GET ${path}`))
  })
}

function renderSalesImportPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <SalesImportPage initialBatchId={1} />
    </QueryClientProvider>,
  )
}

describe('SalesImportPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('shows imported descriptions beside matched product names', async () => {
    mockImportQueries(stagedRows, [])

    renderSalesImportPage()

    expect(await screen.findByText('Starter kit black bundle')).toBeVisible()
    expect(screen.getByText('Starter Kit')).toBeVisible()
  })

  it('enables commit only when rows, import date, and no errors are present', async () => {
    const user = userEvent.setup()
    mockImportQueries(stagedRows, rowErrors)

    renderSalesImportPage()

    const blockedCommit = await screen.findByRole('button', { name: /commit/i })
    expect(blockedCommit).toBeDisabled()

    cleanup()
    vi.clearAllMocks()
    mockImportQueries(stagedRows, [])

    renderSalesImportPage()

    const enabledCommit = await screen.findByRole('button', { name: /commit/i })
    expect(enabledCommit).toBeDisabled()

    await user.type(screen.getByLabelText('Import date'), '2026-05-05')

    expect(enabledCommit).toBeEnabled()
  })

  it('patches import date before commit without patching source', async () => {
    const user = userEvent.setup()
    mockImportQueries(stagedRows, [])
    vi.mocked(patchJson).mockResolvedValue({
      idImportBatch: 1,
      source: 'ecommerce',
      importDate: '2026-05-05T00:00:00.000Z',
      originalFilename: 'sales.csv',
      status: 'validated',
      createdAt: '2026-05-05T10:00:00.000Z',
      updatedAt: '2026-05-05T10:02:00.000Z',
      committedAt: null,
    })
    vi.mocked(postJson).mockResolvedValue({
      idImportBatch: 1,
      source: 'ecommerce',
      importDate: '2026-05-05T00:00:00.000Z',
      originalFilename: 'sales.csv',
      status: 'committed',
      createdAt: '2026-05-05T10:00:00.000Z',
      updatedAt: '2026-05-05T10:03:00.000Z',
      committedAt: '2026-05-05T10:03:00.000Z',
    })

    renderSalesImportPage()

    await user.type(await screen.findByLabelText('Import date'), '2026-05-05')
    await user.click(screen.getByRole('button', { name: /commit/i }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith('/import-batches/1', {
        importDate: '2026-05-05',
      })
    })
    expect(postJson).toHaveBeenCalledWith('/import-batches/1/commit', {})
    expect(patchJson).not.toHaveBeenCalledWith(
      '/import-batches/1',
      expect.objectContaining({ source: expect.anything() }),
    )
  })
})
