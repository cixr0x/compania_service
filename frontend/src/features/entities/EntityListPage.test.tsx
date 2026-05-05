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

    expect(await screen.findByText('Ecommerce ID')).toBeVisible()
    expect(screen.getByText('Store ID')).toBeVisible()
    expect(screen.getByText('Event ID')).toBeVisible()
    expect(screen.getByText('Surface ID')).toBeVisible()
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
    expect(screen.getByText('Total Cost')).toBeVisible()
    expect(await screen.findByText('9,750.75')).toBeVisible()
  })
})
