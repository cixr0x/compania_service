import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
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

const starterProject = {
  idProject: 501,
  idProduct: 101,
  idModel: 7,
  isActive: true,
  units: 100,
  unitCost: '10',
  productionCost: '0',
  adminCost: '0',
  costAdjustment: '0',
  adjustmentDescription: null,
  model: {
    idModel: 7,
    code: 'ladrillo',
    name: 'Ladrillo',
    description: null,
  },
}

const consignaProject = {
  ...starterProject,
  idProject: 502,
  idModel: 8,
  model: {
    idModel: 8,
    code: 'consigna',
    name: 'Consigna',
    description: null,
  },
}

const stagedRows: ImportStageRow[] = [
  {
    idImportStage: 10,
    idImportBatch: 1,
    rowNumber: 2,
    externalProductId: 'SKU-STARTER',
    importedProductDescription: 'Starter kit black bundle',
    idProduct: 101,
    idProject: 501,
    quantity: 3,
    amount: '129.99',
    rawRow: null,
    createdAt: '2026-05-05T10:00:00.000Z',
    product: {
      id: 101,
      name: 'Starter Kit',
      description: null,
      image: 'https://example.test/starter-kit.jpg',
      idEcommerce: 'SKU-STARTER',
      idStore: null,
      idEvent: null,
      idSurface: null,
      idModel: null,
      ownership: 100,
      projects: [starterProject],
      tag: null,
    },
    project: starterProject,
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

function mockImportQueries(
  rows: ImportStageRow[],
  errors: ImportError[],
  batch: ImportBatch = importBatch,
) {
  vi.mocked(getJson).mockImplementation((path: string) => {
    if (path === '/import-batches/1') {
      return Promise.resolve(batch)
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

async function selectAntOption(
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
  optionName: string,
) {
  await user.click(combobox)
  const options = await screen.findAllByTitle(optionName)
  await user.click(options[options.length - 1])
}

function getFileInput() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')

  if (!input) {
    throw new Error('Expected a file input rendered by Ant Design Upload')
  }

  return input
}

describe('SalesImportPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders staged rows in an Ant Design table with expected columns and status tags', async () => {
    mockImportQueries(stagedRows, [])

    renderSalesImportPage()

    expect(screen.queryByText('Workspace')).not.toBeInTheDocument()

    const stagedRowsRegion = await screen.findByRole('region', {
      name: 'Staged Rows',
    })
    const table = within(stagedRowsRegion).getByRole('table')
    const columnWidths = Array.from(table.querySelectorAll('col')).map(
      (column) => column.getAttribute('style'),
    )

    expect(table.closest('.import-stage-table')).toBeInTheDocument()
    expect(table).toHaveStyle({ tableLayout: 'fixed', width: '1240px' })
    expect(columnWidths).toEqual([
      'width: 64px;',
      'width: 132px;',
      'width: 280px;',
      'width: 220px;',
      'width: 200px;',
      'width: 82px;',
      'width: 122px;',
      'width: 140px;',
    ])
    for (const columnName of [
      'Row',
      'External ID',
      'Imported Description',
      'Matched Product',
      'Project',
      'Quantity',
      'Amount',
      'Status',
    ]) {
      expect(
        within(table).getByRole('columnheader', { name: columnName }),
      ).toBeVisible()
    }
    expect(
      await within(stagedRowsRegion).findByText('Starter kit black bundle'),
    ).toBeVisible()
    expect(within(table).getByText('Starter Kit')).toBeVisible()
    expect(
      within(table).getByRole('img', { name: 'Starter Kit thumbnail' }),
    ).toHaveAttribute('src', 'https://example.test/starter-kit.jpg')
    expect(within(table).getByText('Project #501 - Ladrillo')).toBeVisible()
    expect(within(table).getByText('Valid').closest('.ant-tag')).toBeInTheDocument()
  })

  it('lets the user select the staged project when a matched product has multiple projects', async () => {
    const user = userEvent.setup()
    const multiProjectRow: ImportStageRow = {
      ...stagedRows[0],
      idProject: null,
      project: null,
      product: {
        ...stagedRows[0].product!,
        projects: [starterProject, consignaProject],
      },
    }
    mockImportQueries([multiProjectRow], [])
    vi.mocked(patchJson).mockResolvedValue({
      ...multiProjectRow,
      idProject: 502,
      project: consignaProject,
    })

    renderSalesImportPage()

    const stagedRowsRegion = await screen.findByRole('region', {
      name: 'Staged Rows',
    })
    const projectSelect = await within(stagedRowsRegion).findByRole(
      'combobox',
      { name: 'Project for row 2' },
    )
    expect(within(stagedRowsRegion).getByText('Needs review')).toBeVisible()

    await selectAntOption(user, projectSelect, 'Project #502 - Consigna')

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith('/import-batches/1/stage/10', {
        idProject: 502,
      })
    })
  })

  it('formats staged sale amounts with a dollar prefix, commas, and two decimal places', async () => {
    mockImportQueries([{ ...stagedRows[0], amount: '1000000' }], [])

    renderSalesImportPage()

    expect(await screen.findByText('$1,000,000.00')).toBeVisible()
  })

  it('presents upload, validation, and commit as sequential steps with empty-state hints', () => {
    renderWithQueryClient(
      <MemoryRouter>
        <SalesImportPage />
      </MemoryRouter>,
    )

    expect(screen.getByText('1')).toBeVisible()
    expect(screen.getByText('Upload')).toBeVisible()
    expect(screen.getByText('2')).toBeVisible()
    expect(screen.getByText('Validate/Revalidate')).toBeVisible()
    expect(screen.getByText('3')).toBeVisible()
    expect(screen.getByText('Commit')).toBeVisible()
    expect(screen.getByText(/choose a csv or xlsx file/i)).toBeVisible()
    expect(
      screen.getByRole('group', { name: 'Workflow actions' }),
    ).toBeVisible()
    expect(screen.getByText(/upload a file to stage rows/i)).toBeVisible()
    expect(screen.getByText(/validate the uploaded batch/i)).toBeVisible()
  })

  it('labels the file picker area with the selected file name', async () => {
    const user = userEvent.setup()
    const file = new File(['external_id,amount'], 'sales.csv', {
      type: 'text/csv',
    })

    renderWithQueryClient(
      <MemoryRouter>
        <SalesImportPage />
      </MemoryRouter>,
    )

    const fileInput = getFileInput()

    expect(fileInput.closest('.ant-upload-wrapper')).toBeInTheDocument()

    await user.upload(fileInput, file)

    expect(screen.getByText('sales.csv')).toBeVisible()
  })

  it('hydrates existing batch source and import date from initial batch detail', async () => {
    mockImportQueries(stagedRows, [])

    renderSalesImportPage()

    await waitFor(() => {
      expect(screen.getByLabelText('Import date')).toHaveValue('2026-05-04')
    })
    const sourceSelect = screen.getByRole('combobox', { name: 'Source' })

    expect(sourceSelect.closest('.ant-select')).toHaveTextContent('Store')
    expect(
      screen.getByText('Source is locked for the active batch: Store.'),
    ).toBeVisible()
  })

  it('renders import errors as an Ant Design alert with list items', async () => {
    mockImportQueries(stagedRows, rowErrors)

    renderSalesImportPage()

    const importErrorsRegion = await screen.findByRole('region', {
      name: 'Import Errors',
    })
    const alert = await within(importErrorsRegion).findByRole('alert')
    const list = within(alert).getByRole('list', { name: 'Import error list' })

    expect(alert).toHaveClass('ant-alert-warning')
    expect(list).not.toHaveClass('ant-list')
    expect(within(list).getByRole('listitem')).toHaveTextContent(
      'Row 2 amount Amount is required',
    )
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

  it('keeps commit disabled until validated, dated, error-free, and complete', async () => {
    const user = userEvent.setup()
    mockImportQueries(stagedRows, rowErrors)

    renderSalesImportPage()

    const blockedCommit = await screen.findByRole('button', { name: /commit/i })
    expect(blockedCommit).toBeDisabled()

    cleanup()
    vi.clearAllMocks()
    mockImportQueries(
      [
        {
          ...stagedRows[0],
          idProduct: null,
          idProject: null,
          product: null,
          project: null,
        },
      ],
      [],
      {
        ...importBatch,
        importDate: null,
      },
    )

    renderSalesImportPage()

    const incompleteCommit = await screen.findByRole('button', { name: /commit/i })
    await user.type(screen.getByLabelText('Import date'), '2026-05-05')

    expect(incompleteCommit).toBeDisabled()

    cleanup()
    vi.clearAllMocks()
    mockImportQueries(
      [
        {
          ...stagedRows[0],
          idProject: null,
          project: null,
          product: {
            ...stagedRows[0].product!,
            projects: [starterProject, consignaProject],
          },
        },
      ],
      [],
    )

    renderSalesImportPage()

    expect(await screen.findByRole('button', { name: /commit/i })).toBeDisabled()

    cleanup()
    vi.clearAllMocks()
    mockImportQueries(stagedRows, [], {
      ...importBatch,
      importDate: null,
    })

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
    const alert = screen.getByRole('alert')

    expect(alert).toHaveClass('ant-alert-error')
    expect(alert).toHaveTextContent('Unable to load batch')
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

    expect(await screen.findByText('sales.csv')).toBeVisible()
    expect(getFileInput()).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'New import' }))

    expect(screen.queryByText('Active batch #1')).not.toBeInTheDocument()
    expect(getFileInput()).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Upload' })).toBeEnabled()
  })

  it('uploads FormData with source selected from Ant Select and file selected from Ant Upload', async () => {
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

    const sourceSelect = screen.getByRole('combobox', { name: 'Source' })
    const fileInput = getFileInput()

    expect(sourceSelect.closest('.ant-select')).toBeInTheDocument()
    expect(fileInput.closest('.ant-upload-wrapper')).toBeInTheDocument()

    await selectAntOption(user, sourceSelect, 'Event')
    await user.upload(fileInput, file)
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
