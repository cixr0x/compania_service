import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
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
      within(toolbar as HTMLElement).getByRole('searchbox', { name: /search/i }),
    ).toBeVisible()
  })

  it('requests an explicit MVP page size for Products', async () => {
    vi.mocked(getJson).mockResolvedValue([])

    renderProductsList()

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/products?pageSize=100')
    })
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

  it('shows related entity names instead of foreign key IDs in entity tables', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        id: 101,
        idModel: 7,
        model: { idModel: 7, name: 'Furniture' },
        name: 'Walnut Desk',
      },
    ])

    renderProductsList()

    expect(await screen.findByText('Furniture')).toBeVisible()
    expect(screen.queryByRole('columnheader', { name: 'Model ID' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Model' })).toBeVisible()
    expect(screen.queryByText('7')).not.toBeInTheDocument()
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
    expect(screen.getByText('$25.00')).toBeVisible()
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

  it('shows model code in the models table', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        code: 'retail',
        description: 'Retail pricing',
        idModel: 7,
        name: 'Retail',
      },
    ])

    renderEntityList('/models')

    expect(await screen.findByRole('heading', { name: 'Models' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeVisible()
    expect(await screen.findByText('retail')).toBeVisible()
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
      screen.getByRole('img', { name: 'Walnut Desk Project thumbnail' }),
    ).toHaveAttribute('src', 'https://example.test/walnut-project.jpg')
    expect(screen.getByText('Alicia')).toBeVisible()
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
