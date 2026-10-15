import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJson, patchJson, postJson } from '../../api/client'
import { EntityEditPage } from './EntityEditPage'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getJson: vi.fn(),
  patchJson: vi.fn(),
  postJson: vi.fn(),
}))

function renderForm(route: string, client = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
})) {
  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/:entityName/:id" element={<EntityEditPage />} />
            <Route path="/:entityName" element={<div>List page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ConfigProvider>,
  )
}

const laterProduct = { id: 131, name: 'Needle & Oak', ownership: 50 }
const laterProject = {
  idProject: 231, idProduct: 131, name: 'Autumn launch',
  product: laterProduct, feeModel: 'percentage', feeValue: 18,
}
const otherProject = { ...laterProject, idProject: 232, name: 'Winter launch' }
const unrelatedProject = {
  idProject: 333, idProduct: 999, name: 'Unrelated launch',
}

function mockCatalog(detail?: Record<string, unknown>) {
  vi.mocked(getJson).mockImplementation(async (path) => {
    if (path === '/products?pageSize=100') return Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Product ${i + 1}` }))
    if (path === '/products?pageSize=100&page=2') return [laterProduct]
    if (path === '/projects?pageSize=100') return Array.from({ length: 100 }, (_, i) => ({ idProject: i + 1, idProduct: i + 1, name: `Project ${i + 1}` }))
    if (path === '/projects?pageSize=100&page=2') return [laterProject, otherProject, unrelatedProject]
    if (path === '/stakeholders') return [{ idStakeholder: 10, name: 'Alicia' }]
    if (path === '/sales/9' || path === '/project-stakeholders/9') return detail ?? {}
    throw new Error(`Unexpected GET ${path}`)
  })
}

describe('Product and Project form dropdown search', () => {
  afterEach(() => { cleanup(); vi.clearAllMocks() })

  it('loads complete catalogs, filters sale choices by labels and product, and saves only selected numeric IDs', async () => {
    const user = userEvent.setup()
    mockCatalog()
    vi.mocked(postJson).mockResolvedValue({ idSale: 9 })
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    // The remote Projects Product cache contains only its first 25 matches.
    client.setQueryData(['entity-options', 'products'], [{ id: 1, name: 'Remote-only result' }])
    renderForm('/sales/new', client)
    const product = screen.getByRole('combobox', { name: 'Product' })
    await user.click(product)
    await user.paste('  nEEdLe  ')
    await waitFor(() => expect(screen.getByTitle('Needle & Oak')).toBeVisible())
    expect(screen.queryByTitle('Product 1')).not.toBeInTheDocument()
    expect(postJson).not.toHaveBeenCalled()
    await user.click(screen.getByTitle('Needle & Oak'))

    const project = screen.getByRole('combobox', { name: 'Project' })
    expect(project).not.toBeDisabled()
    expect(project).toHaveAttribute('aria-required', 'true')
    await user.click(project)
    await user.paste('  231  ')
    await waitFor(() => expect(screen.getByTitle('Autumn launch (#231)')).toBeVisible())
    expect(screen.queryByTitle('Winter launch (#232)')).not.toBeInTheDocument()
    expect(screen.queryByTitle('Unrelated launch (#333)')).not.toBeInTheDocument()
    await user.click(screen.getByTitle('Autumn launch (#231)'))
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-05' } })
    await user.type(screen.getByLabelText('Amount'), '100')
    expect(screen.getByLabelText('Fee')).toHaveValue('18.00')
    await user.click(project)
    await user.paste('no matching project')
    expect(screen.queryAllByTitle('Autumn launch (#231)').filter((element) => element.classList.contains('ant-select-item-option'))).toHaveLength(0)
    await user.tab()
    expect(project.closest('.ant-select')).toHaveTextContent('Autumn launch (#231)')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(postJson).toHaveBeenCalledWith('/sales', expect.objectContaining({ idProduct: 131, idProject: 231, fee: 18 })))
    expect(getJson).toHaveBeenCalledWith('/products?pageSize=100&page=2')
    expect(getJson).toHaveBeenCalledWith('/projects?pageSize=100&page=2')
  })

  it('keeps an edited sale selection and payload when searches are unmatched or cleared', async () => {
    const user = userEvent.setup()
    mockCatalog({ idSale: 9, idProduct: 131, idProject: 231, product: laterProduct, project: laterProject, date: '2026-05-05', amount: 100 })
    vi.mocked(patchJson).mockResolvedValue({ idSale: 9 })
    renderForm('/sales/9')
    await waitFor(() => expect(getJson).toHaveBeenCalledWith('/projects?pageSize=100&page=2'))
    for (const name of ['Product', 'Project']) {
      const input = await screen.findByRole('combobox', { name })
      await user.click(input)
      await user.paste('unmatched')
      await user.clear(input)
      await user.paste('still unmatched')
      await user.tab()
    }
    expect(patchJson).not.toHaveBeenCalled()
    expect(postJson).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(patchJson).toHaveBeenCalledWith('/sales/9', expect.objectContaining({ idProduct: 131, idProject: 231 })))
  })

  it('keeps required sale fields empty after typing and auto-selects the sole eligible project only after choosing a product', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => path.startsWith('/products')
      ? [laterProduct]
      : [laterProject, unrelatedProject])
    renderForm('/sales/new')
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-05-05' } })
    const product = screen.getByRole('combobox', { name: 'Product' })
    await user.click(product)
    await user.paste('Needle')
    await user.tab()
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('Product is required.')).toBeVisible()
    expect(postJson).not.toHaveBeenCalled()
    await user.click(product)
    await user.clear(product)
    await user.paste('  OAK  ')
    await user.click(await screen.findByTitle('Needle & Oak'))
    const project = screen.getByRole('combobox', { name: 'Project' })
    expect(project).toBeDisabled()
    expect(project.closest('.ant-select')).toHaveTextContent('Autumn launch (#231)')
  })

  it('filters Project Stakeholders project names and visible IDs from later pages and sends numeric IDs', async () => {
    const user = userEvent.setup()
    mockCatalog()
    vi.mocked(postJson).mockResolvedValue({ idProjectStakeholder: 9 })
    renderForm('/project-stakeholders/new')
    const project = screen.getByRole('combobox', { name: 'Project' })
    await user.click(project)
    await user.paste('  AUTUMN  ')
    await waitFor(() => expect(screen.getByTitle('Autumn launch (#231)')).toBeVisible())
    expect(screen.queryByTitle('Winter launch (#232)')).not.toBeInTheDocument()
    await user.clear(project)
    await user.paste('  231 ')
    await user.click(screen.getByTitle('Autumn launch (#231)'))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(postJson).toHaveBeenCalledWith('/project-stakeholders', { idProject: 231 }))
    expect(getJson).toHaveBeenCalledWith('/stakeholders')
    expect(getJson).not.toHaveBeenCalledWith('/stakeholders?pageSize=100')
  })

  it('keeps full-catalog options unavailable until every page succeeds and shows a later-page error', async () => {
    let failLastPage!: (error: Error) => void
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products?pageSize=100') return Array.from({ length: 100 }, (_, i) => ({ id: i + 1, name: `Partial product ${i + 1}` }))
      if (path === '/products?pageSize=100&page=2') return new Promise((_resolve, reject) => { failLastPage = reject })
      return []
    })
    const user = userEvent.setup()
    renderForm('/sales/new')
    await waitFor(() => expect(getJson).toHaveBeenCalledWith('/products?pageSize=100&page=2'))
    await user.click(screen.getByRole('combobox', { name: 'Product' }))
    expect(screen.queryByTitle('Partial product 1')).not.toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('Loading products...')).toBeVisible())
    await act(async () => failLastPage(new Error('Page two failed')))
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load products.')
    expect(screen.queryByTitle('Partial product 1')).not.toBeInTheDocument()
  })

  it('waits for the dependent Projects catalog before offering sale Products and then auto-selects the sole project', async () => {
    let finishProjects!: (rows: unknown[]) => void
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path.startsWith('/products')) return [laterProduct]
      return new Promise((resolve) => { finishProjects = resolve })
    })
    const user = userEvent.setup()
    renderForm('/sales/new')
    await waitFor(() => expect(getJson).toHaveBeenCalledWith('/projects?pageSize=100'))
    const product = screen.getByRole('combobox', { name: 'Product' })
    await user.click(product)
    await user.paste('Needle')
    expect(screen.queryByTitle('Needle & Oak')).not.toBeInTheDocument()
    await act(async () => finishProjects([laterProject]))
    await user.click(await screen.findByTitle('Needle & Oak'))
    const project = screen.getByRole('combobox', { name: 'Project' })
    expect(project).toBeDisabled()
    expect(project.closest('.ant-select')).toHaveTextContent('Autumn launch (#231)')
  })

  it('preserves edited labels and IDs while the dependent catalog loads or fails', async () => {
    let failProjects!: (reason: Error) => void
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/sales/9') return { idSale: 9, idProduct: 131, idProject: 231, product: laterProduct, project: laterProject, date: '2026-05-05' }
      if (path.startsWith('/products')) return [laterProduct]
      return new Promise((_resolve, reject) => { failProjects = reject })
    })
    const user = userEvent.setup()
    renderForm('/sales/9')
    const product = await screen.findByRole('combobox', { name: 'Product' })
    const project = screen.getByRole('combobox', { name: 'Project' })
    expect(product.closest('.ant-select')).toHaveTextContent('Needle & Oak')
    expect(project.closest('.ant-select')).toHaveTextContent('Autumn launch (#231)')
    await act(async () => failProjects(new Error('Projects unavailable')))
    await user.click(product)
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load projects.')
    expect(screen.queryAllByTitle('Needle & Oak').filter((element) => element.classList.contains('ant-select-item-option'))).toHaveLength(0)
    expect(product.closest('.ant-select')).toHaveTextContent('Needle & Oak')
    expect(project.closest('.ant-select')).toHaveTextContent('Autumn launch (#231)')
    expect(postJson).not.toHaveBeenCalled()
    expect(patchJson).not.toHaveBeenCalled()
  })

  it('keeps complete cached choices available during a background Projects refetch', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    client.setQueryData(['entity-options-all', 'projects'], [laterProject])
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path.startsWith('/products')) return [laterProduct]
      return new Promise(() => {})
    })
    const user = userEvent.setup()
    renderForm('/sales/new', client)
    const product = screen.getByRole('combobox', { name: 'Product' })
    await user.click(product)
    await user.paste('Needle')
    await waitFor(() => expect(screen.getByTitle('Needle & Oak')).toBeVisible())
    await user.click(screen.getByTitle('Needle & Oak'))
    expect(screen.getByRole('combobox', { name: 'Project' })).toBeDisabled()
    expect(screen.getByRole('combobox', { name: 'Project' }).closest('.ant-select')).toHaveTextContent('Autumn launch (#231)')
  })
})
