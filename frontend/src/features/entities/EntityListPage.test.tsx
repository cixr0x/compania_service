import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJson } from '../../api/client'
import { EntityListPage } from './EntityListPage'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderEntityList(initialEntry = '/products') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Link to="/products">Products list</Link>
        <Link to="/projects">Projects list</Link>
        <Routes>
          <Route path="/:entityName" element={<EntityListPage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

function renderProductsList() {
  return renderEntityList('/products')
}

async function selectAntOption(
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
  optionName: string,
) {
  await user.click(combobox)
  let titledOptions = screen.queryAllByTitle(optionName)
  let textOptions = screen.queryAllByText(optionName)

  if (titledOptions.length === 0 && textOptions.length === 0) {
    await user.click(combobox)
    titledOptions = screen.queryAllByTitle(optionName)
    textOptions = screen.queryAllByText(optionName)
  }

  const options =
    titledOptions.length > 0
      ? titledOptions
      : textOptions.length > 0
        ? textOptions
        : await screen.findAllByText(optionName)
  await user.click(options[options.length - 1])
}

describe('EntityListPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('links Products create action to the new product route', async () => {
    vi.mocked(getJson).mockResolvedValue([
      { id: 101, name: 'Walnut Desk', tag: 'office' },
    ])

    renderProductsList()

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeVisible()
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument()

    const createLink = screen.getByRole('link', { name: /create/i })
    const toolbar = createLink.closest('.table-toolbar')

    expect(createLink).toHaveAttribute('href', '/products/new')
    expect(toolbar).toBeInTheDocument()
    expect(
      within(toolbar as HTMLElement).getByRole('searchbox', { name: 'Search' }),
    ).toBeVisible()
  })

  it('requests an explicit MVP page size for Products', async () => {
    vi.mocked(getJson).mockResolvedValue([])

    renderProductsList()

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/products?pageSize=100')
    })
  })

  it('filters Products by each displayed field and clears without searching hidden data', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      {
        id: 101,
        name: 'Walnut Desk',
        tag: 'office',
        ownership: 37,
        idEcommerce: 'EC-RED',
        idStore: 'ST-BLUE',
        idEvent: 'EV-GREEN',
        idSurface: 'SF-GOLD',
        image: 'https://example.test/secret-image.jpg',
        description: 'secret-description',
        model: { name: 'secret-object' },
      },
      { id: 102, name: 'Canvas Chair', tag: 'studio', ownership: 62 },
    ])
    renderProductsList()
    expect(await screen.findByText('Walnut Desk')).toBeVisible()
    const search = screen.getByRole('searchbox', { name: 'Search' })
    for (const query of [
      '  wAlNuT  ', '101', 'office', '37', 'ec-red', 'ST-BLUE', 'ev-green', 'sf-gold',
    ]) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('Walnut Desk')).toBeVisible()
      expect(screen.queryByText('Canvas Chair')).not.toBeInTheDocument()
    }
    for (const query of [
      'secret-image', 'secret-description', 'secret-object', 'Edit', 'walnut office',
    ]) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('No products found.')).toBeVisible()
    }
    await user.click(screen.getByRole('button', { name: 'Clear search' }))
    expect(search).toHaveValue('')
    expect(screen.getByText('Walnut Desk')).toBeVisible()
    expect(screen.getByText('Canvas Chair')).toBeVisible()
  })

  it('searches Projects by related names, statuses and derived fees and costs', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        idProject: 501,
        name: 'Wholesale launch',
        idProduct: 42,
        product: {
          name: 'Walnut Desk',
          image: 'https://example.test/hidden-cover.jpg',
          description: 'hidden-product',
        },
        feeModel: 'fixed',
        feeValue: 1250,
        fixedRoi: true,
        fixedRoiPercentage: 12,
        isActive: true,
        units: 5,
        unitCost: 1875,
        transactions: [{ amount: 6500 }, { amount: 2250 }],
        adminCost: 7722,
      },
      {
        idProject: 502,
        name: 'Retail launch',
        idProduct: 43,
        product: { name: 'Canvas Chair' },
        feeModel: 'percentage',
        feeValue: 18,
        fixedRoi: false,
        isActive: false,
        units: 2,
        unitCost: 20,
        transactions: [],
      },
    ])
    renderEntityList('/projects')
    expect(await screen.findByText('Wholesale launch')).toBeVisible()
    const search = screen.getByRole('searchbox', { name: 'Search' })
    for (const query of [
      '501', '  WALNUT  ', 'Fixed fee per unit', 'Yes', '1250', '$1,250.00',
      '$1250.00', '12%', '1875', '8750', '$8,750.00', '1750',
    ]) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('Wholesale launch')).toBeVisible()
      expect(screen.queryByText('Retail launch')).not.toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Walnut Desk' })).toHaveAttribute(
      'href', '/products/42',
    )
    for (const query of ['No', 'Percentage fee', '18%']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('Retail launch')).toBeVisible()
      expect(screen.queryByText('Wholesale launch')).not.toBeInTheDocument()
    }
    for (const query of ['hidden-cover', 'hidden-product', '7722', '6500', '42']) {
      fireEvent.change(search, { target: { value: query } })
      expect(screen.getByText('No projects found.')).toBeVisible()
    }
  })

  it.each(['products', 'projects'])('searches %s records after the first API page', async (entity) => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      id: index + 1,
      idProject: index + 1,
      name: `Record ${index + 1}`,
    }))
    vi.mocked(getJson).mockImplementation((path) => {
      if (path === `/${entity}?pageSize=100`) return Promise.resolve(firstPage)
      if (path === `/${entity}?pageSize=100&page=2`) {
        return Promise.resolve([
          { id: 101, idProject: 101, name: 'Beyond first page', tag: 'special-match' },
        ])
      }
      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })
    renderEntityList(`/${entity}`)
    expect(await screen.findByText('1-50 of 101')).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'Beyond first' },
    })
    expect(screen.getByText('Beyond first page')).toBeVisible()
    expect(screen.queryByText('Record 1')).not.toBeInTheDocument()
    expect(getJson).toHaveBeenCalledTimes(2)
  })

  it.each(['products', 'projects'])('stops %s loading after an empty trailing page for exact multiples', async (entity) => {
    vi.mocked(getJson).mockImplementation((path) => {
      if (path === `/${entity}?pageSize=100`) {
        return Promise.resolve(Array.from({ length: 100 }, (_, index) => ({
          id: index + 1,
          idProject: index + 1,
          name: `Record ${index + 1}`,
        })))
      }
      if (path === `/${entity}?pageSize=100&page=2`) return Promise.resolve([])
      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })
    renderEntityList(`/${entity}`)
    expect(await screen.findByText('1-50 of 100')).toBeVisible()
    expect(getJson).toHaveBeenCalledTimes(2)
  })

  it('loads successive full pages before accepting a short final page', async () => {
    vi.mocked(getJson).mockImplementation((path) => {
      const page = Number(
        new URL(path, 'http://example.test').searchParams.get('page') ?? 1,
      )
      return Promise.resolve(
        Array.from({ length: page === 3 ? 1 : 100 }, (_, index) => ({
          id: (page - 1) * 100 + index + 1,
          name: page === 3
            ? 'Third page target'
            : `Record ${(page - 1) * 100 + index + 1}`,
        })),
      )
    })
    renderProductsList()
    expect(await screen.findByText('1-50 of 201')).toBeVisible()
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search' }), {
      target: { value: 'Third page target' },
    })
    expect(screen.getByText('Third page target')).toBeVisible()
    expect(getJson).toHaveBeenNthCalledWith(3, '/products?pageSize=100&page=3')
    expect(getJson).toHaveBeenCalledTimes(3)
  })

  it('shows a later-page failure without presenting partial results as complete', async () => {
    vi.mocked(getJson).mockImplementation((path) => {
      if (path === '/products?pageSize=100') {
        return Promise.resolve(Array.from({ length: 100 }, (_, index) => ({
          id: index + 1,
          name: `Partial ${index + 1}`,
        })))
      }
      return Promise.reject(new Error('Page two unavailable'))
    })
    renderProductsList()
    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load products.')
    expect(screen.queryByText('Partial 1')).not.toBeInTheDocument()
    expect(screen.queryByText('1-50 of 100')).not.toBeInTheDocument()
  })

  it('stops requesting additional pages when the entity list is unmounted', async () => {
    let resolveFirstPage!: (rows: { id: number; name: string }[]) => void
    vi.mocked(getJson).mockImplementation(() =>
      new Promise((resolve) => { resolveFirstPage = resolve }),
    )
    const { unmount } = renderProductsList()
    await waitFor(() => expect(getJson).toHaveBeenCalledTimes(1))
    unmount()
    await act(async () => resolveFirstPage(
      Array.from({ length: 100 }, (_, index) => ({
        id: index + 1,
        name: `Record ${index + 1}`,
      })),
    ))
    expect(getJson).toHaveBeenCalledTimes(1)
  })

  it('resets search when navigating between entity lists', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path) =>
      Promise.resolve(path.startsWith('/products')
        ? [{ id: 101, name: 'Walnut Desk' }]
        : [{ idProject: 501, name: 'Retail launch' }]),
    )
    renderProductsList()
    expect(await screen.findByText('Walnut Desk')).toBeVisible()
    await user.type(screen.getByRole('searchbox', { name: 'Search' }), 'Walnut')
    await user.click(screen.getByRole('link', { name: 'Projects list' }))
    expect(await screen.findByText('Retail launch')).toBeVisible()
    expect(screen.getByRole('searchbox', { name: 'Search' })).toHaveValue('')
  })

  it('keeps other entity lists limited to their existing first page without search', async () => {
    vi.mocked(getJson).mockResolvedValue(
      Array.from({ length: 100 }, (_, index) => ({
        idStakeholder: index + 1,
        name: `Stakeholder ${index + 1}`,
      })),
    )
    renderEntityList('/stakeholders')
    expect(await screen.findByText('1-50 of 100')).toBeVisible()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(getJson).toHaveBeenCalledTimes(1)
    expect(getJson).toHaveBeenCalledWith('/stakeholders?pageSize=100')
  })

  it('shows product external ID columns', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        id: 101,
        idEcommerce: 'EC-101',
        idEvent: 'EV-101',
        idStore: 'ST-101',
        idSurface: 'SF-101',
        image: 'https://example.test/walnut-desk.jpg',
        name: 'Walnut Desk',
      },
    ])

    renderProductsList()

    const ecommerceHeader = await screen.findByRole('columnheader', {
      name: 'Ecommerce ID',
    })
    const storeHeader = screen.getByRole('columnheader', { name: 'Store ID' })
    const eventHeader = screen.getByRole('columnheader', { name: 'Event ID' })
    const surfaceHeader = screen.getByRole('columnheader', { name: 'Surface ID' })

    expect(ecommerceHeader).toHaveClass('channel-header-ecommerce')
    expect(storeHeader).toHaveClass('channel-header-store')
    expect(eventHeader).toHaveClass('channel-header-event')
    expect(surfaceHeader).toHaveClass('channel-header-surface')
    expect(await screen.findByText('EC-101')).toBeVisible()
    expect(
      screen.getByRole('img', { name: 'Walnut Desk thumbnail' }),
    ).toHaveAttribute('src', 'https://example.test/walnut-desk.jpg')
    expect(screen.getByText('ST-101')).toBeVisible()
    expect(screen.getByText('EV-101')).toBeVisible()
    expect(screen.getByText('SF-101')).toBeVisible()
  })

  it('navigates to a product edit route when a row is double-clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      { id: 101, name: 'Walnut Desk', tag: 'office' },
    ])

    renderProductsList()

    await user.dblClick(
      (await screen.findByText('Walnut Desk')).closest('tr')!,
    )

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/products/101')
    })
  })

  it('shows derived total project cost in the projects table', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        adminCost: 2250.5,
        costAdjustment: -250.75,
        idProduct: 42,
        idProject: 501,
        isActive: true,
        productionCost: 7500.25,
        transactions: [
          { amount: 7500.25 },
          { amount: 2250.5 },
          { amount: -250.75 },
        ],
        unitCost: 1000000,
        units: 10,
      },
    ])

    renderEntityList('/projects')

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible()
    expect(screen.queryByText('Production Cost')).not.toBeInTheDocument()
    expect(screen.queryByText('Admin Cost')).not.toBeInTheDocument()
    expect(screen.queryByText('Cost Adjustment')).not.toBeInTheDocument()
    expect(screen.getAllByText('Total Cost')).not.toHaveLength(0)
    expect(await screen.findByText('$9,500.00')).toBeVisible()
  })

  it('does not show the legacy product model column', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        id: 101,
        idModel: 7,
        model: { idModel: 7, name: 'Furniture' },
        name: 'Walnut Desk',
      },
    ])

    renderProductsList()

    expect(await screen.findByText('Walnut Desk')).toBeVisible()
    expect(screen.queryByText('Furniture')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Model' })).not.toBeInTheDocument()
    expect(screen.queryByText('7')).not.toBeInTheDocument()
  })

  it('shows project fee configuration in the projects table', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        createdDate: '2026-07-03T12:00:00.000Z',
        feeModel: 'percentage',
        feeValue: '18',
        idProduct: 42,
        idProject: 501,
        name: 'Wholesale launch',
        product: { id: 42, name: 'Walnut Desk' },
        transactions: [],
      },
    ])

    renderEntityList('/projects')

    expect(await screen.findByText('Wholesale launch')).toBeVisible()
    expect(await screen.findByText('Percentage fee')).toBeVisible()
    expect(screen.getByText('18%')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Fee Model' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Fee' })).toBeVisible()
    expect(screen.queryByText('2026-07-03T12:00:00.000Z')).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Model' })).not.toBeInTheDocument()
  })

  it('shows product names instead of product IDs in the projects table', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        adminCost: 0,
        idProduct: 42,
        idProject: 501,
        product: {
          id: 42,
          image: 'https://example.test/walnut-desk.jpg',
          name: 'Walnut Desk',
          ownership: 25,
        },
        productionCost: 0,
      },
    ])

    renderEntityList('/projects')

    expect(await screen.findByText('Walnut Desk')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Walnut Desk' })).toHaveAttribute(
      'href',
      '/products/42',
    )
    expect(
      screen.getByRole('img', { name: 'Walnut Desk thumbnail' }),
    ).toHaveAttribute('src', 'https://example.test/walnut-desk.jpg')
    expect(screen.queryByRole('columnheader', { name: 'Product ID' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeVisible()
    expect(screen.queryByText('42')).not.toBeInTheDocument()
  })

  it('shows related names instead of foreign key IDs in the sales table', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        amount: 100,
        date: '2026-05-05',
        fee: 0,
        idProduct: 42,
        idProject: 501,
        idSale: 900,
        product: {
          id: 42,
          image: 'https://example.test/walnut-desk.jpg',
          name: 'Walnut Desk',
          ownership: 25,
        },
        project: {
          idProject: 501,
          product: {
            id: 42,
            image: 'https://example.test/walnut-project.jpg',
            name: 'Walnut Desk Project',
          },
        },
        quantity: 1,
        source: 'store',
      },
    ])

    renderEntityList('/sales')

    expect(await screen.findByText('Walnut Desk')).toBeVisible()
    expect(screen.getByText('Walnut Desk Project')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Walnut Desk' })).toHaveAttribute(
      'href',
      '/products/42',
    )
    expect(
      screen.getByRole('link', { name: 'Walnut Desk Project' }),
    ).toHaveAttribute('href', '/projects/501')
    expect(
      screen.getByRole('img', { name: 'Walnut Desk thumbnail' }),
    ).toHaveAttribute('src', 'https://example.test/walnut-desk.jpg')
    expect(
      screen.getByRole('img', { name: 'Walnut Desk Project thumbnail' }),
    ).toHaveAttribute('src', 'https://example.test/walnut-project.jpg')
    expect(screen.queryByRole('columnheader', { name: 'Product ID' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Project ID' })).not.toBeInTheDocument()
    const salesTable = screen.getByRole('table')
    const colStyles = Array.from(salesTable.querySelectorAll('col')).map(
      (column) => column.getAttribute('style') ?? '',
    )

    for (const width of [56, 112, 190, 190, 84, 114, 94, 112, 112, 124]) {
      expect(
        colStyles.some((style) => style.includes(`width: ${width}px`)),
      ).toBe(true)
    }
    expect(screen.queryByRole('columnheader', { name: 'Tax' })).not.toBeInTheDocument()
    expect(screen.getAllByText('$100.00')).toHaveLength(2)
    expect(screen.getAllByText('$0.00')).not.toHaveLength(0)
    expect(screen.getAllByText('$25.00')).toHaveLength(2)
    expect(screen.queryByText('42')).not.toBeInTheDocument()
    expect(screen.queryByText('501')).not.toBeInTheDocument()
  })

  it('filters the sales table by product, project, and sale month outside the table headers', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/sales?pageSize=100') {
        return Promise.resolve([])
      }

      if (path === '/products?pageSize=100') {
        return Promise.resolve([
          {
            id: 42,
            image: 'https://example.test/walnut-desk.jpg',
            name: 'Walnut Desk',
          },
        ])
      }

      if (path === '/projects?pageSize=100') {
        return Promise.resolve([
          {
            idProduct: 42,
            idProject: 501,
            product: {
              id: 42,
              image: 'https://example.test/walnut-desk.jpg',
              name: 'Walnut Desk',
            },
          },
        ])
      }

      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([{ months: [5], year: 2026 }])
      }

      if (path === '/sales?pageSize=100&idProduct=42') {
        return Promise.resolve([])
      }

      if (path === '/sales?pageSize=100&idProduct=42&idProject=501') {
        return Promise.resolve([])
      }

      if (path === '/sales?pageSize=100&idProduct=42&idProject=501&month=2026-05') {
        return Promise.resolve([])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderEntityList('/sales')

    const salesFilters = await screen.findByRole('region', {
      name: 'Sales filters',
    })
    const productFilter = within(salesFilters).getByRole('combobox', {
      name: 'Product filter',
    })
    const projectFilter = within(salesFilters).getByRole('combobox', {
      name: 'Project filter',
    })
    const monthFilter = within(salesFilters).getByRole('combobox', {
      name: 'Month filter',
    })

    expect(productFilter).toBeVisible()
    expect(projectFilter).toBeVisible()
    expect(monthFilter).toBeVisible()
    expect(
      screen.queryByRole('columnheader', { name: 'Product filter' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Project filter' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Month filter' }),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/reports/sales-summary/periods')
    })

    await selectAntOption(user, productFilter, 'Walnut Desk')
    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/sales?pageSize=100&idProduct=42')
    })

    await selectAntOption(user, projectFilter, 'Project #501 - Walnut Desk')
    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith(
        '/sales?pageSize=100&idProduct=42&idProject=501',
      )
    })

    const updatedSalesFilters = screen.getByRole('region', {
      name: 'Sales filters',
    })
    await selectAntOption(
      user,
      within(updatedSalesFilters).getByRole('combobox', {
        name: 'Month filter',
      }),
      'May 2026',
    )
    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith(
        '/sales?pageSize=100&idProduct=42&idProject=501&month=2026-05',
      )
    })
  })

  it('shows total owner profit for the currently loaded sales rows', async () => {
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/sales?pageSize=100') {
        return Promise.resolve([
          {
            amount: 100,
            date: '2026-05-05',
            fee: 0,
            idProduct: 42,
            idProject: 501,
            idSale: 900,
            product: { id: 42, name: 'Walnut Desk', ownership: 25 },
            project: {
              idProject: 501,
              product: { id: 42, name: 'Walnut Desk' },
            },
            quantity: 1,
            source: 'store',
          },
          {
            amount: 50,
            date: '2026-05-06',
            fee: 10,
            idProduct: 43,
            idProject: 502,
            idSale: 901,
            product: { id: 43, name: 'Canvas Chair', ownership: 50 },
            project: {
              idProject: 502,
              product: { id: 43, name: 'Canvas Chair' },
            },
            quantity: 1,
            source: 'ecommerce',
          },
        ])
      }

      if (
        path === '/products?pageSize=100' ||
        path === '/projects?pageSize=100' ||
        path === '/reports/sales-summary/periods'
      ) {
        return Promise.resolve([])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderEntityList('/sales')

    expect(await screen.findAllByText('Canvas Chair')).not.toHaveLength(0)
    const salesTable = screen.getByRole('table')

    expect(within(salesTable).getByText('Total Owner Profit')).toBeVisible()
    expect(within(salesTable).getByText('$45.00')).toBeVisible()
  })

  it('does not configure the removed models entity page', async () => {
    renderEntityList('/models')

    expect(await screen.findByRole('heading', { name: 'Unknown Entity' })).toBeVisible()
    expect(getJson).not.toHaveBeenCalled()
  })

  it('shows project product and stakeholder names in the project stakeholder table', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        idProject: 501,
        idProjectStakeholder: 900,
        idStakeholder: 10,
        project: {
          idProject: 501,
          product: {
            id: 42,
            image: 'https://example.test/walnut-project.jpg',
            name: 'Walnut Desk Project',
          },
        },
        stakePercentage: 60,
        stakeholder: { idStakeholder: 10, name: 'Alicia' },
      },
    ])

    renderEntityList('/project-stakeholders')

    expect(await screen.findByText('Walnut Desk Project')).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Walnut Desk Project' }),
    ).toHaveAttribute('href', '/projects/501')
    expect(
      screen.getByRole('img', { name: 'Walnut Desk Project thumbnail' }),
    ).toHaveAttribute('src', 'https://example.test/walnut-project.jpg')
    expect(screen.getByText('Alicia')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Alicia' })).toHaveAttribute(
      'href',
      '/stakeholders/10',
    )
    expect(screen.queryByRole('columnheader', { name: 'Project ID' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Stakeholder ID' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Project' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Stakeholder' })).toBeVisible()
    expect(screen.queryByText('501')).not.toBeInTheDocument()
    expect(screen.queryByText('10')).not.toBeInTheDocument()
  })

  it('renders settings as a normal CRUD table with code, name, description, and value', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        id: 1,
        code: 'default_margin',
        name: 'Default Margin',
        description: 'Default margin used by future sale calculations',
        value: '16',
      },
    ])

    renderEntityList('/settings')

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeVisible()
    expect(await screen.findByText('default_margin')).toBeVisible()
    expect(screen.getByText('Default Margin')).toBeVisible()
    expect(screen.getByText('16')).toBeVisible()
  })
})
