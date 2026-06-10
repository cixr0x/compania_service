import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJson } from '../../api/client'
import { DashboardPage } from './DashboardPage'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
}))

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('DashboardPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('summarizes operating metrics from the live API endpoints', async () => {
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/products?pageSize=100') {
        return Promise.resolve([
          { id: 1, image: 'https://example.test/panda.jpg', name: 'Party Panda Pirates' },
          { id: 2, image: 'https://example.test/pigs.jpg', name: 'Happy Pigs' },
        ])
      }

      if (path === '/projects?pageSize=100') {
        return Promise.resolve([
          {
            idProject: 10,
            isActive: true,
            product: { id: 1, name: 'Party Panda Pirates' },
            units: 200,
          },
          {
            idProject: 11,
            isActive: false,
            product: { id: 2, name: 'Happy Pigs' },
            units: 100,
          },
        ])
      }

      if (path === '/stakeholders?pageSize=100') {
        return Promise.resolve([
          { idStakeholder: 1, name: 'Compania' },
          { idStakeholder: 2, name: 'Dracostable' },
        ])
      }

      if (path === '/sales?pageSize=100') {
        return Promise.resolve([
          {
            amount: 100,
            date: '2026-06-10T00:00:00.000Z',
            fee: 10,
            idSale: 1,
            ownerProfit: 36,
            product: { id: 1, name: 'Party Panda Pirates' },
            project: { idProject: 10, product: { id: 1, name: 'Party Panda Pirates' } },
            quantity: 4,
            source: 'store',
          },
          {
            amount: 50,
            date: '2026-06-11T00:00:00.000Z',
            fee: 5,
            idSale: 2,
            ownerProfit: 12,
            product: { id: 2, name: 'Happy Pigs' },
            project: { idProject: 11, product: { id: 2, name: 'Happy Pigs' } },
            quantity: 1,
            source: 'ecommerce',
          },
        ])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderDashboard()

    expect(
      await screen.findByRole('heading', { name: 'Compania Service' }),
    ).toBeVisible()
    expect(
      screen.getByText('Boardgame operations & investment management'),
    ).toBeVisible()

    const overview = screen.getByRole('region', {
      name: 'Operations overview',
    })

    expect(within(overview).getByText('Total Products')).toBeVisible()
    expect(within(overview).getByText('Active Projects')).toBeVisible()
    expect(within(overview).getByText('Stakeholders')).toBeVisible()
    expect(within(overview).getByText('Total Sales')).toBeVisible()
    expect(within(overview).getByText('Net Profit')).toBeVisible()
    expect(await within(overview).findByText('$135.00')).toBeVisible()
    expect(within(overview).getByText('Owner Profit')).toBeVisible()
    expect(within(overview).getByText('$48.00')).toBeVisible()

    const recentSales = screen.getByRole('region', { name: 'Recent sales' })

    expect(within(recentSales).getByText('Happy Pigs')).toBeVisible()
    expect(within(recentSales).getByText('$50.00')).toBeVisible()
    expect(
      within(screen.getByRole('region', { name: 'Quick links' })).getByRole(
        'link',
        { name: /Sales Report/i },
      ),
    ).toHaveAttribute('href', '/reports/sales')

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/products?pageSize=100')
      expect(getJson).toHaveBeenCalledWith('/projects?pageSize=100')
      expect(getJson).toHaveBeenCalledWith('/stakeholders?pageSize=100')
      expect(getJson).toHaveBeenCalledWith('/sales?pageSize=100')
    })
  })
})
