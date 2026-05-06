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

async function selectAntOption(
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
  optionName: string,
) {
  await user.click(combobox)
  const options = await screen.findAllByTitle(optionName)
  await user.click(options[options.length - 1])
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
    const yearSelect = screen.getByRole('combobox', { name: 'Year' })
    const monthSelect = screen.getByRole('combobox', { name: 'Month' })

    await waitFor(() => {
      expect(yearSelect.closest('.ant-select')).toHaveTextContent('2026')
    })
    expect(monthSelect.closest('.ant-select')).toHaveTextContent('Full year')

    const columnHeaders = await screen.findAllByRole('columnheader')
    const table = columnHeaders[0].closest('table')!

    expect(table.closest('.ant-table-wrapper')).toBeInTheDocument()
    expect(table.closest('.ant-table')).toHaveClass('ant-table-small')
    expect(table).toHaveStyle({ width: '1560px' })
    expect(columnHeaders[0]).toHaveTextContent('Project ID')
    expect(columnHeaders[1]).toHaveTextContent('Product')
    expect(within(table).getByRole('columnheader', { name: 'Store' })).toHaveAttribute(
      'colspan',
      '2',
    )
    expect(
      within(table).getByRole('columnheader', { name: 'Ecommerce' }),
    ).toHaveAttribute('colspan', '2')
    expect(within(table).getByRole('columnheader', { name: 'Event' })).toHaveAttribute(
      'colspan',
      '2',
    )
    expect(
      within(table).queryByRole('columnheader', { name: 'Surface' }),
    ).not.toBeInTheDocument()
    expect(within(table).getAllByRole('columnheader', { name: 'Quantity' })).toHaveLength(3)
    expect(within(table).getAllByRole('columnheader', { name: 'Amount' })).toHaveLength(3)

    const reportRow = screen.getByText('Maple Shelf').closest('tr')!
    expect(within(reportRow).getByText('501')).toBeVisible()
    expect(within(reportRow).getByText('Maple Shelf')).toBeVisible()
    expect(within(reportRow).queryByText('1,000,000.00')).not.toBeInTheDocument()
    expect(within(reportRow).getAllByText('$0.00')).toHaveLength(1)
    expect(within(reportRow).getByText('$150.00')).toBeVisible()
    expect(within(reportRow).getByText('$200.00')).toBeVisible()
    expect(within(reportRow).getByText('$350.00')).toBeVisible()
    expect(within(reportRow).getByText('$7.00')).toBeVisible()
    expect(within(reportRow).getByText('$120.00')).toBeVisible()
    expect(within(reportRow).getByText('$230.00')).toBeVisible()
    expect(within(reportRow).getByText('$223.00')).toBeVisible()
    expect(within(reportRow).getByText('$55.75')).toBeVisible()
  })

  it('uses Ant Select controls to load a selected month and adds surface only when returned', async () => {
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
    const yearSelect = screen.getByRole('combobox', { name: 'Year' })
    const monthSelect = screen.getByRole('combobox', { name: 'Month' })

    expect(yearSelect.closest('.ant-select')).toBeInTheDocument()
    expect(monthSelect.closest('.ant-select')).toBeInTheDocument()

    await selectAntOption(user, monthSelect, 'May')

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

  it('resets the month Ant Select when the selected year changes', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([
          { year: 2026, months: [5] },
          { year: 2025, months: [12] },
        ])
      }

      if (path === '/reports/sales-summary?year=2026') {
        return Promise.resolve(yearlyReport)
      }

      if (path === '/reports/sales-summary?year=2026&month=5') {
        return Promise.resolve(monthlyReport)
      }

      if (path === '/reports/sales-summary?year=2025') {
        return Promise.resolve({ rows: [], sources: ['store', 'ecommerce', 'event'] })
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderReportsRoute()

    await screen.findByText('Maple Shelf')
    await selectAntOption(user, screen.getByRole('combobox', { name: 'Month' }), 'May')
    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith(
        '/reports/sales-summary?year=2026&month=5',
      )
    })

    await selectAntOption(user, screen.getByRole('combobox', { name: 'Year' }), '2025')

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith('/reports/sales-summary?year=2025')
    })
    expect(
      screen.getByRole('combobox', { name: 'Month' }).closest('.ant-select'),
    ).toHaveTextContent('Full year')
  })

  it('renders report load failures as an Ant Design alert', async () => {
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([{ year: 2026, months: [5] }])
      }

      if (path === '/reports/sales-summary?year=2026') {
        return Promise.reject(new Error('Report failed'))
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderReportsRoute()

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveClass('ant-alert-error')
    expect(alert).toHaveTextContent('Unable to load the sales report.')
  })
})
