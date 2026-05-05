import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { api, getJson, patchJson, postJson } from '../../api/client'
import App from '../../App'
import type { ImportBatch, ImportError, ImportStageRow } from '../../api/types'
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

const importBatch: ImportBatch = {
  idImportBatch: 1,
  source: 'store',
  importDate: '2026-05-04T00:00:00.000Z',
  originalFilename: 'sales.csv',
  status: 'validated',
  createdAt: '2026-05-05T10:00:00.000Z',
  updatedAt: '2026-05-05T10:02:00.000Z',
  committedAt: null,
}

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
    if (path === '/import-batches/1') {
      return Promise.resolve(importBatch)
    }

    if (path === '/import-batches/1/stage') {
      return Promise.resolve(rows)
    }

    if (path === '/import-batches/1/errors') {
      return Promise.resolve(errors)
    }

    return Promise.reject(new Error(`Unexpected GET ${path}`))
  })
}

function renderWithQueryClient(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>,
  )
}

function renderSalesImportPage() {
  return renderWithQueryClient(
    <MemoryRouter>
      <SalesImportPage initialBatchId={1} />
    </MemoryRouter>,
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

  it('hydrates existing batch source and import date from initial batch detail', async () => {
    mockImportQueries(stagedRows, [])

    renderSalesImportPage()

    await waitFor(() => {
      expect(screen.getByLabelText('Import date')).toHaveValue('2026-05-04')
    })
    expect(screen.getByLabelText('Source')).toHaveValue('store')
    expect(
      screen.getByText('Source is locked for the active batch: Store.'),
    ).toBeVisible()
  })

  it('wires /imports/:id to the import page before generic entity routes', async () => {
    mockImportQueries(stagedRows, [])

    renderWithQueryClient(
      <MemoryRouter initialEntries={['/imports/1']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Sales Imports' }),
    ).toBeVisible()
    expect(getJson).toHaveBeenCalledWith('/import-batches/1')
    expect(screen.queryByRole('heading', { name: /Edit/i })).not.toBeInTheDocument()
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

  it('keeps commit disabled when detail query fails', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/import-batches/1') {
        return Promise.reject(new Error('Unable to load batch'))
      }

      if (path === '/import-batches/1/stage') {
        return Promise.resolve(stagedRows)
      }

      if (path === '/import-batches/1/errors') {
        return Promise.resolve([])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderSalesImportPage()

    await user.type(await screen.findByLabelText('Import date'), '2026-05-05')

    expect(screen.getByRole('button', { name: /commit/i })).toBeDisabled()
  })

  it('keeps commit disabled while validation refetch is pending', async () => {
    const user = userEvent.setup()
    let resolveStageRefetch: (rows: ImportStageRow[]) => void = () => undefined
    let stageCalls = 0

    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/import-batches/1') {
        return Promise.resolve(importBatch)
      }

      if (path === '/import-batches/1/stage') {
        stageCalls += 1
        if (stageCalls === 1) {
          return Promise.resolve(stagedRows)
        }

        return new Promise((resolve) => {
          resolveStageRefetch = resolve
        })
      }

      if (path === '/import-batches/1/errors') {
        return Promise.resolve([])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })
    vi.mocked(postJson).mockResolvedValue(importBatch)

    renderSalesImportPage()

    await user.clear(await screen.findByLabelText('Import date'))
    await user.type(screen.getByLabelText('Import date'), '2026-05-05')
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /commit/i })).toBeEnabled()
    })

    await user.click(screen.getByRole('button', { name: /validate\/revalidate/i }))

    expect(screen.getByRole('button', { name: /commit/i })).toBeDisabled()

    resolveStageRefetch(stagedRows)
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

    await waitFor(() => {
      expect(screen.getByLabelText('Import date')).toHaveValue('2026-05-04')
    })
    await user.clear(screen.getByLabelText('Import date'))
    await user.type(screen.getByLabelText('Import date'), '2026-05-05')
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

  it('refetches batch, stage, and errors when commit fails after patch', async () => {
    const user = userEvent.setup()
    mockImportQueries(stagedRows, [])
    vi.mocked(patchJson).mockResolvedValue(importBatch)
    vi.mocked(postJson).mockRejectedValue(new Error('Batch has validation errors'))

    renderSalesImportPage()

    await waitFor(() => {
      expect(screen.getByLabelText('Import date')).toHaveValue('2026-05-04')
    })
    await user.clear(screen.getByLabelText('Import date'))
    await user.type(screen.getByLabelText('Import date'), '2026-05-05')
    await user.click(screen.getByRole('button', { name: /commit/i }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/import-batches/1/commit', {})
    })

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/import-batches/1')
      expect(getJson).toHaveBeenCalledWith('/import-batches/1/stage')
      expect(getJson).toHaveBeenCalledWith('/import-batches/1/errors')
      expect(vi.mocked(getJson).mock.calls.length).toBeGreaterThan(3)
    })
  })

  it('disables upload controls for active batches and reset starts a new import', async () => {
    const user = userEvent.setup()
    mockImportQueries(stagedRows, [])

    renderSalesImportPage()

    expect(await screen.findByLabelText('Sales file')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'New import' }))

    expect(screen.queryByText('Active batch #1')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Sales file')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled()
  })

  it('uploads FormData with selected source and file for a new import', async () => {
    const user = userEvent.setup()
    const file = new File(['external_id,amount'], 'sales.csv', {
      type: 'text/csv',
    })
    vi.mocked(api.post).mockResolvedValue({
      data: {
        ...importBatch,
        source: 'event',
        importDate: null,
      },
    })
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/import-batches/1') {
        return Promise.resolve({
          ...importBatch,
          source: 'event',
          importDate: null,
        })
      }

      if (path === '/import-batches/1/stage') {
        return Promise.resolve(stagedRows)
      }

      if (path === '/import-batches/1/errors') {
        return Promise.resolve([])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderWithQueryClient(
      <MemoryRouter>
        <SalesImportPage />
      </MemoryRouter>,
    )

    await user.selectOptions(screen.getByLabelText('Source'), 'event')
    await user.upload(screen.getByLabelText('Sales file'), file)
    await user.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith(
        '/import-batches',
        expect.any(FormData),
      )
    })

    const formData = vi.mocked(api.post).mock.calls[0][1] as FormData
    expect(formData.get('source')).toBe('event')
    expect(formData.get('file')).toBe(file)
  })
})
