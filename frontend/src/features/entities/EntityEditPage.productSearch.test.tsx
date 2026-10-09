import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getJson, patchJson, postJson } from '../../api/client'
import { EntityEditPage } from './EntityEditPage'
import type { EntityRow } from './entityConfigs'

vi.mock('../../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../api/client')>()),
  getJson: vi.fn(),
  patchJson: vi.fn(),
  postJson: vi.fn(),
}))

const initialProducts = Array.from({ length: 25 }, (_, index) => ({
  id: index + 1,
  name: `Initial product ${index + 1}`,
}))
const outsideProduct = { id: 101, name: 'Needle & Oak' }

function renderProject(initialEntry = '/projects/new') {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <ConfigProvider theme={{ token: { motion: false } }}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <Routes>
            <Route path="/:entityName/:id" element={<EntityEditPage />} />
            <Route path="/:entityName" element={<div>List page</div>} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    </ConfigProvider>,
  )
}

function mockProducts(
  search: (query: string) => EntityRow[] | Promise<EntityRow[]>,
  project?: EntityRow,
) {
  vi.mocked(getJson).mockImplementation(async (path) => {
    if (path === '/products') return initialProducts
    if (path.startsWith('/products?')) {
      const params = new URL(path, 'http://test.local').searchParams
      expect(params.get('page')).toBe('1')
      expect(params.get('pageSize')).toBe('25')
      return search(params.get('search') ?? '')
    }
    if (path === '/projects/77') return project ?? {}
    return []
  })
}

function deferredProducts() {
  let resolve!: (rows: EntityRow[]) => void
  const promise = new Promise<EntityRow[]>((complete) => {
    resolve = complete
  })
  return { promise, resolve }
}

async function chooseProduct(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  const options = await screen.findAllByTitle(name)
  await user.click(options[options.length - 1])
}

describe('project Product catalog search', () => {
  beforeEach(() => {
    vi.mocked(postJson).mockResolvedValue({ idProject: 501 })
    vi.mocked(patchJson).mockResolvedValue({ idProject: 77 })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('selects a product outside the initial 25 by its typed name and saves its numeric ID', async () => {
    const user = userEvent.setup()
    mockProducts((query) => (query === 'Needle & Oak' ? [outsideProduct] : []))
    renderProject()
    const product = screen.getByRole('combobox', { name: 'Product' })

    await user.click(product)
    expect(await screen.findByTitle('Initial product 1')).toBeInTheDocument()
    expect(screen.queryByTitle('Needle & Oak')).not.toBeInTheDocument()
    await user.type(product, 'Needle & Oak')
    await chooseProduct(user, 'Needle & Oak')
    await user.type(screen.getByLabelText('Percentage Fee'), '18')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/projects', {
        feeModel: 'percentage',
        feeValue: 18,
        fixedRoi: false,
        idProduct: 101,
        isActive: true,
      })
    })
  })

  it('keeps arbitrary text separate from the required selection and shows no results', async () => {
    const user = userEvent.setup()
    mockProducts(() => [])
    renderProject()
    const product = screen.getByRole('combobox', { name: 'Product' })

    await user.type(screen.getByLabelText('Percentage Fee'), '18')
    await user.type(product, 'not an existing product')
    expect(await screen.findByText('No products found.')).toBeVisible()
    await user.keyboard('{Enter}')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(postJson).not.toHaveBeenCalled()
    expect(screen.getByText('Product is required.')).toBeVisible()
  })

  it('restores default choices after clearing search without losing the selected name or ID', async () => {
    const user = userEvent.setup()
    mockProducts((query) => (query === 'Needle' ? [outsideProduct] : []))
    renderProject()
    const product = screen.getByRole('combobox', { name: 'Product' })

    await user.type(product, 'Needle')
    await chooseProduct(user, 'Needle & Oak')
    await user.type(product, 'unrelated')
    expect(await screen.findByText('No products found.')).toBeVisible()
    await user.clear(product)
    expect(await screen.findByTitle('Initial product 1')).toBeInTheDocument()
    await user.click(screen.getByLabelText('Percentage Fee'))
    expect(product.closest('.ant-select')).toHaveTextContent('Needle & Oak')
    await user.type(screen.getByLabelText('Percentage Fee'), '18')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith(
        '/projects',
        expect.objectContaining({ idProduct: 101 }),
      )
    })
  })

  it('shows loading while searching and ignores a slower response for an older search', async () => {
    const user = userEvent.setup()
    const first = deferredProducts()
    const latest = deferredProducts()
    mockProducts((query) => (query === 'older' ? first.promise : latest.promise))
    renderProject()
    const product = screen.getByRole('combobox', { name: 'Product' })

    await user.type(product, 'older')
    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/products?search=older&page=1&pageSize=25')
    })
    expect(screen.getByText('Loading products...')).toBeVisible()
    expect(screen.queryByTitle('Initial product 1')).not.toBeInTheDocument()
    await user.clear(product)
    await user.type(product, 'latest')
    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/products?search=latest&page=1&pageSize=25')
    })
    await act(async () => latest.resolve([{ id: 102, name: 'Latest catalog match' }]))
    expect(await screen.findByTitle('Latest catalog match')).toBeInTheDocument()
    await act(async () => first.resolve([{ id: 103, name: 'Older catalog match' }]))

    expect(screen.getByTitle('Latest catalog match')).toBeInTheDocument()
    expect(screen.queryByTitle('Older catalog match')).not.toBeInTheDocument()
  })

  it('shows an edit selection absent from the initial results and allows a remotely searched replacement', async () => {
    const user = userEvent.setup()
    mockProducts(() => [{ id: 102, name: 'Replacement desk' }], {
      feeModel: 'percentage',
      feeValue: 18,
      fixedRoi: false,
      idProduct: 101,
      idProject: 77,
      isActive: true,
      product: outsideProduct,
    })
    renderProject('/projects/77')
    const product = await screen.findByRole('combobox', { name: 'Product' })

    expect(product.closest('.ant-select')).toHaveTextContent('Needle & Oak')
    await user.type(product, 'replacement')
    await chooseProduct(user, 'Replacement desk')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith(
        '/projects/77',
        expect.objectContaining({ idProduct: 102 }),
      )
    })
  })

  it('shows a query failure in the field and recovers on a new search', async () => {
    const user = userEvent.setup()
    mockProducts((query) => {
      if (query === 'failed') return Promise.reject(new Error('Network offline'))
      return [outsideProduct]
    })
    renderProject()
    const product = screen.getByRole('combobox', { name: 'Product' })

    await user.type(product, 'failed')
    expect(await screen.findByText('Unable to load products. Try searching again.')).toBeVisible()
    await user.clear(product)
    await user.type(product, 'Needle')
    expect(await screen.findByTitle('Needle & Oak')).toBeInTheDocument()
    expect(screen.queryByText('Unable to load products. Try searching again.')).not.toBeInTheDocument()
  })
})
