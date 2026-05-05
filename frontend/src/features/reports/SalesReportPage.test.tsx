import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { getJson } from '../../api/client'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
}))

const yearlyReport = {
  rows: [
    {
      ecommerce: { amount: 150, quantity: 1 },
      event: { amount: 0, quantity: 0 },
      fee: 7,
      income: 230,
      model: 'Furniture',
      ownerProfit: 55.75,
      productName: 'Maple Shelf',
      profit: 223,
      projectId: 501,
      store: { amount: 200, quantity: 2 },
      surface: { amount: 0, quantity: 0 },
      totalAmount: 350,
      totalCost: 120,
      totalQuantity: 3,
    },
  ],
  sources: ['store', 'ecommerce', 'event'],
}

const monthlyReport = {
  rows: [
    {
      ecommerce: { amount: 0, quantity: 0 },
      event: { amount: 0, quantity: 0 },
      fee: 0,
      income: 50,
      model: '',
      ownerProfit: 25,
      productName: 'Event Kit',
      profit: 50,
      projectId: 701,
      store: { amount: 0, quantity: 0 },
      surface: { amount: 80, quantity: 4 },
      totalAmount: 80,
      totalCost: 30,
      totalQuantity: 4,
    },
  ],
  sources: ['store', 'ecommerce', 'event', 'surface'],
}

function renderReportsRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reports/sales']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('SalesReportPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders the yearly sales report with grouped source columns and project id first', async () => {
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([{ year: 2026, months: [5, 4] }])
      }

      if (path === '/reports/sales-summary?year=2026') {
        return Promise.resolve(yearlyReport)
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderReportsRoute()

    expect(
      await screen.findByRole('heading', { name: 'Sales Report' }),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Sales Report' })).toHaveAttribute(
      'href',
      '/reports/sales',
    )
    await waitFor(() => {
      expect(screen.getByLabelText('Year')).toHaveValue('2026')
    })
    expect(screen.getByLabelText('Month')).toHaveValue('')

    const columnHeaders = await screen.findAllByRole('columnheader')
    expect(columnHeaders[0]).toHaveTextContent('Project ID')
    expect(columnHeaders[1]).toHaveTextContent('Product')
    expect(screen.getByRole('columnheader', { name: 'Store' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Ecommerce' })).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Event' })).toBeVisible()
    expect(
      screen.queryByRole('columnheader', { name: 'Surface' }),
    ).not.toBeInTheDocument()
    expect(screen.getAllByRole('columnheader', { name: 'Quantity' })).toHaveLength(
      3,
    )
    expect(screen.getAllByRole('columnheader', { name: 'Amount' })).toHaveLength(
      3,
    )

    const reportRow = screen.getByText('Maple Shelf').closest('tr')!
    expect(within(reportRow).getByText('501')).toBeVisible()
    expect(within(reportRow).getByText('Maple Shelf')).toBeVisible()
    expect(within(reportRow).queryByText('1,000,000.00')).not.toBeInTheDocument()
    expect(within(reportRow).getByText('350.00')).toBeVisible()
    expect(within(reportRow).getByText('55.75')).toBeVisible()
  })

  it('loads a selected month and adds the surface group only when the report includes surface sales', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([{ year: 2026, months: [5, 4] }])
      }

      if (path === '/reports/sales-summary?year=2026') {
        return Promise.resolve(yearlyReport)
      }

      if (path === '/reports/sales-summary?year=2026&month=5') {
        return Promise.resolve(monthlyReport)
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderReportsRoute()

    await screen.findByText('Maple Shelf')
    await user.selectOptions(screen.getByLabelText('Month'), '5')

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith(
        '/reports/sales-summary?year=2026&month=5',
      )
    })
    expect(
      await screen.findByRole('columnheader', { name: 'Surface' }),
    ).toBeVisible()
    expect(screen.getByText('Event Kit')).toBeVisible()
  })
})
