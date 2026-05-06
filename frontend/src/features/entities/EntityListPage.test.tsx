import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
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
    expect(screen.getByRole('link', { name: /create/i })).toHaveAttribute(
      'href',
      '/products/new',
    )
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
        name: 'Walnut Desk',
      },
    ])

    renderProductsList()

    expect(await screen.findAllByText('Ecommerce ID')).not.toHaveLength(0)
    expect(screen.getAllByText('Store ID')).not.toHaveLength(0)
    expect(screen.getAllByText('Event ID')).not.toHaveLength(0)
    expect(screen.getAllByText('Surface ID')).not.toHaveLength(0)
    expect(await screen.findByText('EC-101')).toBeVisible()
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
        idProduct: 42,
        idProject: 501,
        isActive: true,
        productionCost: 7500.25,
        unitCost: 1000000,
        units: 10,
      },
    ])

    renderEntityList('/projects')

    expect(await screen.findByRole('heading', { name: 'Projects' })).toBeVisible()
    expect(screen.getAllByText('Total Cost')).not.toHaveLength(0)
    expect(await screen.findByText('$9,750.75')).toBeVisible()
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
        product: { id: 42, name: 'Walnut Desk' },
        productionCost: 0,
      },
    ])

    renderEntityList('/projects')

    expect(await screen.findByText('Walnut Desk')).toBeVisible()
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
        product: { id: 42, name: 'Walnut Desk' },
        project: {
          idProject: 501,
          product: { id: 42, name: 'Walnut Desk Project' },
        },
        quantity: 1,
        source: 'store',
        tax: 12.34,
      },
    ])

    renderEntityList('/sales')

    expect(await screen.findByText('Walnut Desk')).toBeVisible()
    expect(screen.getByText('Walnut Desk Project')).toBeVisible()
    expect(screen.queryByRole('columnheader', { name: 'Product ID' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Project ID' })).not.toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Product' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Project' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Tax' })).toBeVisible()
    expect(screen.getByText('$100.00')).toBeVisible()
    expect(screen.getByText('$0.00')).toBeVisible()
    expect(screen.getByText('$12.34')).toBeVisible()
    expect(screen.queryByText('42')).not.toBeInTheDocument()
    expect(screen.queryByText('501')).not.toBeInTheDocument()
  })

  it('shows project product and stakeholder names in the project stakeholder table', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        idProject: 501,
        idProjectStakeholder: 900,
        idStakeholder: 10,
        project: {
          idProject: 501,
          product: { id: 42, name: 'Walnut Desk Project' },
        },
        stakePercentage: 60,
        stakeholder: { idStakeholder: 10, name: 'Alicia' },
      },
    ])

    renderEntityList('/project-stakeholders')

    expect(await screen.findByText('Walnut Desk Project')).toBeVisible()
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
        code: 'sales_tax_rate',
        name: 'Sales Tax Rate',
        description: 'Tax percentage used by future sale calculations',
        value: '16',
      },
    ])

    renderEntityList('/settings')

    expect(await screen.findByRole('heading', { name: 'Settings' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Code' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Description' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Value' })).toBeVisible()
    expect(await screen.findByText('sales_tax_rate')).toBeVisible()
    expect(screen.getByText('Sales Tax Rate')).toBeVisible()
    expect(screen.getByText('16')).toBeVisible()
  })
})
