import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
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
      ecommerce: { amount: 150, averagePrice: 150, quantity: 1 },
      event: { amount: 0, averagePrice: 0, quantity: 0 },
      fee: 7,
      ownerProfit: 85.75,
      productId: 42,
      productImage: 'https://example.test/maple-shelf.jpg',
      productName: 'Maple Shelf',
      profit: 343,
      projectId: 501,
      projectName: 'Maple Shelf Launch',
      stakeholderIncome: null,
      stakePercentage: null,
      store: { amount: 200, averagePrice: 100, quantity: 2 },
      surface: { amount: 0, averagePrice: 0, quantity: 0 },
      totalAmount: 350,
      totalAveragePrice: 116.67,
      totalQuantity: 3,
    },
    {
      ecommerce: { amount: 50, averagePrice: 25, quantity: 2 },
      event: { amount: 300, averagePrice: 100, quantity: 3 },
      fee: 30,
      ownerProfit: 210,
      productId: 43,
      productImage: null,
      productName: 'Walnut Table',
      profit: 420,
      projectId: 502,
      projectName: 'Walnut Table Holiday Run',
      stakeholderIncome: null,
      stakePercentage: null,
      store: { amount: 100, averagePrice: 100, quantity: 1 },
      surface: { amount: 0, averagePrice: 0, quantity: 0 },
      totalAmount: 450,
      totalAveragePrice: 75,
      totalQuantity: 6,
    },
  ],
  sources: ['store', 'ecommerce', 'event'],
}

const monthlyReport = {
  rows: [
    {
      ecommerce: { amount: 0, averagePrice: 0, quantity: 0 },
      event: { amount: 0, averagePrice: 0, quantity: 0 },
      fee: 0,
      ownerProfit: 40,
      productId: 88,
      productImage: null,
      productName: 'Event Kit',
      profit: 80,
      projectId: 701,
      projectName: 'Event Kit Surface Run',
      stakeholderIncome: null,
      stakePercentage: null,
      store: { amount: 0, averagePrice: 0, quantity: 0 },
      surface: { amount: 80, averagePrice: 20, quantity: 4 },
      totalAmount: 80,
      totalAveragePrice: 20,
      totalQuantity: 4,
    },
  ],
  sources: ['store', 'ecommerce', 'event', 'surface'],
}

const stakeholders = [
  { idStakeholder: 10, name: 'Alicia' },
  { idStakeholder: 11, name: 'Bruno' },
]

const aliciaReport = {
  rows: [
    {
      ecommerce: { amount: 150, averagePrice: 150, quantity: 1 },
      event: { amount: 0, averagePrice: 0, quantity: 0 },
      fee: 7,
      ownerProfit: 85.75,
      productId: 42,
      productImage: 'https://example.test/maple-shelf.jpg',
      productName: 'Maple Shelf',
      profit: 343,
      projectId: 501,
      projectName: 'Maple Shelf Launch',
      stakeholderIncome: 205.8,
      stakePercentage: 60,
      store: { amount: 200, averagePrice: 100, quantity: 2 },
      surface: { amount: 0, averagePrice: 0, quantity: 0 },
      totalAmount: 350,
      totalAveragePrice: 116.67,
      totalQuantity: 3,
    },
    {
      ecommerce: { amount: 0, averagePrice: 0, quantity: 0 },
      event: { amount: 0, averagePrice: 0, quantity: 0 },
      fee: 0,
      ownerProfit: 0,
      productId: 44,
      productImage: null,
      productName: 'Oak Desk',
      profit: 0,
      projectId: 503,
      projectName: 'Oak Desk Reserve',
      stakeholderIncome: 0,
      stakePercentage: 25,
      store: { amount: 0, averagePrice: 0, quantity: 0 },
      surface: { amount: 0, averagePrice: 0, quantity: 0 },
      totalAmount: 0,
      totalAveragePrice: 0,
      totalQuantity: 0,
    },
  ],
  sources: ['store', 'ecommerce', 'event'],
}

const mapleProjectLabel = 'Maple Shelf (Project #501)'
const walnutProjectLabel = 'Walnut Table (Project #502)'
const eventKitProjectLabel = 'Event Kit (Project #701)'
const oakDeskProjectLabel = 'Oak Desk (Project #503)'

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

  it('renders the yearly sales report grouped and filtered by project', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([{ year: 2026, months: [5, 4] }])
      }

      if (path === '/stakeholders?pageSize=100') {
        return Promise.resolve(stakeholders)
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
    const reportRegion = screen.getByRole('region', { name: 'Sales Report' })
    expect(within(reportRegion).queryByText('Reports')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /Reports/i }))
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Sales Report' }),
      ).toHaveAttribute('href', '/reports/sales')
    })
    const yearSelect = screen.getByRole('combobox', { name: 'Year' })
    const monthSelect = screen.getByRole('combobox', { name: 'Month' })
    const stakeholderSelect = screen.getByRole('combobox', {
      name: 'Stakeholder',
    })
    const projectSelect = screen.getByRole('combobox', { name: 'Project' })
    const controlsRow = reportRegion.querySelector('.report-controls')

    expect(controlsRow).toBeInTheDocument()
    expect(controlsRow).toContainElement(yearSelect)
    expect(controlsRow).toContainElement(monthSelect)
    expect(controlsRow).toContainElement(stakeholderSelect)
    expect(controlsRow).toContainElement(projectSelect)
    expect(yearSelect.closest('.ant-space-item')?.parentElement).toBe(
      monthSelect.closest('.ant-space-item')?.parentElement,
    )
    expect(yearSelect.closest('.ant-space-item')?.parentElement).toBe(
      stakeholderSelect.closest('.ant-space-item')?.parentElement,
    )
    expect(yearSelect.closest('.ant-space-item')?.parentElement).toBe(
      projectSelect.closest('.ant-space-item')?.parentElement,
    )

    await waitFor(() => {
      expect(yearSelect.closest('.ant-select')).toHaveTextContent('2026')
    })
    expect(monthSelect.closest('.ant-select')).toHaveTextContent('Full year')
    expect(stakeholderSelect.closest('.ant-select')).toHaveTextContent(
      'All stakeholders',
    )
    expect(projectSelect.closest('.ant-select')).toHaveTextContent(
      'All projects',
    )

    const columnHeaders = await screen.findAllByRole('columnheader')
    const table = columnHeaders[0].closest('table')!

    expect(table.closest('.ant-table-wrapper')).toBeInTheDocument()
    expect(table.closest('.sales-report-table')).toBeInTheDocument()
    expect(table.closest('.ant-table')).toHaveClass('ant-table-small')
    expect(table).toHaveStyle({ width: '1498px' })
    expect(
      within(table).queryByRole('columnheader', { name: 'Project ID' }),
    ).not.toBeInTheDocument()
    expect(columnHeaders[0]).toHaveTextContent('Product / Project')
    const storeHeader = within(table).getByRole('columnheader', {
      name: 'Store',
    })
    const ecommerceHeader = within(table).getByRole('columnheader', {
      name: 'Ecommerce',
    })
    const eventHeader = within(table).getByRole('columnheader', {
      name: 'Event',
    })

    expect(storeHeader).toHaveAttribute('colspan', '3')
    expect(storeHeader).toHaveClass('channel-header-store')
    expect(ecommerceHeader).toHaveAttribute('colspan', '3')
    expect(ecommerceHeader).toHaveClass('channel-header-ecommerce')
    expect(eventHeader).toHaveAttribute('colspan', '3')
    expect(eventHeader).toHaveClass('channel-header-event')
    expect(
      within(table).queryByRole('columnheader', { name: 'Surface' }),
    ).not.toBeInTheDocument()
    expect(
      within(table).queryByRole('columnheader', { name: 'Total Cost' }),
    ).not.toBeInTheDocument()
    expect(
      within(table).queryByRole('columnheader', { name: 'Income' }),
    ).not.toBeInTheDocument()
    expect(
      within(table).getAllByRole('columnheader', { name: 'Quantity' }),
    ).toHaveLength(3)
    expect(
      within(table).getAllByRole('columnheader', { name: 'Amount' }),
    ).toHaveLength(3)
    expect(
      within(table).getAllByRole('columnheader', { name: 'Avg Price' }),
    ).toHaveLength(4)

    const reportRow = screen.getByText(mapleProjectLabel).closest('tr')!
    expect(
      within(reportRow).queryByText('Maple Shelf Launch'),
    ).not.toBeInTheDocument()
    expect(within(reportRow).getByText(mapleProjectLabel)).toBeVisible()
    expect(
      within(reportRow).getByRole('link', { name: mapleProjectLabel }),
    ).toHaveAttribute('href', '/projects/501')
    expect(
      within(reportRow).getByRole('img', {
        name: 'Maple Shelf thumbnail',
      }),
    ).toHaveAttribute('src', 'https://example.test/maple-shelf.jpg')
    expect(
      within(reportRow).queryByText('1,000,000.00'),
    ).not.toBeInTheDocument()
    expect(within(reportRow).getAllByText('$0.00')).toHaveLength(2)
    expect(within(reportRow).getAllByText('$150.00')).toHaveLength(2)
    expect(within(reportRow).getByText('$200.00')).toBeVisible()
    expect(within(reportRow).getByText('$116.67')).toBeVisible()
    expect(within(reportRow).getByText('$350.00')).toBeVisible()
    expect(within(reportRow).getByText('$7.00')).toBeVisible()
    expect(within(reportRow).getByText('$343.00')).toBeVisible()
    expect(within(reportRow).queryByText('$85.75')).not.toBeInTheDocument()
    expect(
      within(table).queryByRole('columnheader', { name: 'Owner Profit' }),
    ).not.toBeInTheDocument()
    expect(
      within(table).queryByRole('columnheader', {
        name: 'Stakeholder Income',
      }),
    ).not.toBeInTheDocument()

    const totalsRow = screen.getByText('Totals').closest('tr')!
    expect(within(totalsRow).getByText('$800.00')).toBeVisible()
    expect(within(totalsRow).getByText('$88.89')).toBeVisible()
    expect(within(totalsRow).getByText('$37.00')).toBeVisible()
    expect(within(totalsRow).getByText('$763.00')).toBeVisible()

    await selectAntOption(user, projectSelect, mapleProjectLabel)

    await waitFor(() => {
      expect(
        screen.queryByRole('row', { name: walnutProjectLabel }),
      ).not.toBeInTheDocument()
    })
    const filteredTotalsRow = screen.getByText('Totals').closest('tr')!
    expect(filteredTotalsRow).toHaveTextContent('$350.00')
    expect(filteredTotalsRow).toHaveTextContent('$116.67')
  })

  it('uses Ant Select controls to load a selected month and adds surface only when returned', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([{ year: 2026, months: [5, 4] }])
      }

      if (path === '/stakeholders?pageSize=100') {
        return Promise.resolve(stakeholders)
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

    await screen.findByText(mapleProjectLabel)
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
    expect(
      screen.getByRole('columnheader', { name: 'Surface' }).closest('table'),
    ).toHaveStyle({ width: '1770px' })
    expect(screen.getByText(eventKitProjectLabel)).toBeVisible()

    const projectSelect = screen.getByRole('combobox', { name: 'Project' })
    expect(projectSelect.closest('.ant-select')).toHaveTextContent(
      'All projects',
    )
    await user.click(projectSelect)
    expect(
      await screen.findByTitle(eventKitProjectLabel),
    ).toBeInTheDocument()
    expect(screen.queryByTitle(mapleProjectLabel)).not.toBeInTheDocument()
  })

  it('shows assigned zero-sales projects and stakeholder income when a stakeholder is selected', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([{ year: 2026, months: [5, 4] }])
      }

      if (path === '/stakeholders?pageSize=100') {
        return Promise.resolve(stakeholders)
      }

      if (path === '/reports/sales-summary?year=2026') {
        return Promise.resolve(yearlyReport)
      }

      if (
        path === '/reports/sales-summary?year=2026&stakeholderId=10'
      ) {
        return Promise.resolve(aliciaReport)
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderReportsRoute()

    await screen.findByText(mapleProjectLabel)
    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Stakeholder' }),
      'Alicia',
    )

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith(
        '/reports/sales-summary?year=2026&stakeholderId=10',
      )
    })
    expect(await screen.findByText(oakDeskProjectLabel)).toBeVisible()

    const stakeholderIncomeHeader = screen.getByRole('columnheader', {
      name: 'Stakeholder Income',
    })
    const table = stakeholderIncomeHeader.closest('table')!
    expect(table).toHaveStyle({ width: '1718px' })
    expect(
      within(table).getByRole('columnheader', { name: 'Stake %' }),
    ).toBeVisible()
    expect(
      within(table).queryByRole('columnheader', { name: 'Owner Profit' }),
    ).not.toBeInTheDocument()

    const salesRow = screen.getByText(mapleProjectLabel).closest('tr')!
    expect(within(salesRow).getByText('60%')).toBeVisible()
    expect(within(salesRow).getByText('$205.80')).toBeVisible()

    const zeroSalesRow = screen.getByText(oakDeskProjectLabel).closest('tr')!
    expect(within(zeroSalesRow).getByText('25%')).toBeVisible()
    expect(within(zeroSalesRow).getAllByText('$0.00').length).toBeGreaterThan(0)

    const totalsRow = screen.getByText('Totals').closest('tr')!
    expect(within(totalsRow).getByText('-')).toBeVisible()
    expect(within(totalsRow).getByText('$205.80')).toBeVisible()
    expect(
      screen.queryByRole('row', { name: walnutProjectLabel }),
    ).not.toBeInTheDocument()
  })

  it('exports the visible report rows to Excel with the current filters', async () => {
    const user = userEvent.setup()
    const createObjectUrl = vi.fn(() => 'blob:sales-report')
    const revokeObjectUrl = vi.fn()
    const originalCreateObjectUrl = URL.createObjectURL
    const originalRevokeObjectUrl = URL.revokeObjectURL
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectUrl,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectUrl,
    })
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/sales-summary/periods') {
        return Promise.resolve([{ year: 2026, months: [5, 4] }])
      }

      if (path === '/stakeholders?pageSize=100') {
        return Promise.resolve(stakeholders)
      }

      if (path === '/reports/sales-summary?year=2026') {
        return Promise.resolve(yearlyReport)
      }

      if (
        path === '/reports/sales-summary?year=2026&stakeholderId=10'
      ) {
        return Promise.resolve(aliciaReport)
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    try {
      renderReportsRoute()

      await screen.findByText(mapleProjectLabel)
      await selectAntOption(
        user,
        screen.getByRole('combobox', { name: 'Stakeholder' }),
        'Alicia',
      )
      await screen.findByText(oakDeskProjectLabel)
      await selectAntOption(
        user,
        screen.getByRole('combobox', { name: 'Project' }),
        mapleProjectLabel,
      )
      await user.click(
        screen.getByRole('button', {
          name: 'Export sales report to Excel',
        }),
      )

      expect(clickSpy).toHaveBeenCalled()
      expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
      expect(revokeObjectUrl).toHaveBeenCalledWith('blob:sales-report')

      const [blob] = createObjectUrl.mock.calls[0] as unknown as [Blob]
      const exportedContent = await blob.text()

      expect(exportedContent).toContain('Sales Report')
      expect(exportedContent).toContain('2026')
      expect(exportedContent).toContain('Alicia')
      expect(exportedContent).toContain(mapleProjectLabel)
      expect(exportedContent).toContain('Maple Shelf Launch')
      expect(exportedContent).toContain('Stake %')
      expect(exportedContent).toContain('Stakeholder Income')
      expect(exportedContent).toContain('$205.80')
      expect(exportedContent).toContain('Totals')
      expect(exportedContent).not.toContain('Owner Profit')
      expect(exportedContent).not.toContain('Oak Desk Reserve')
    } finally {
      clickSpy.mockRestore()
      if (originalCreateObjectUrl) {
        Object.defineProperty(URL, 'createObjectURL', {
          configurable: true,
          value: originalCreateObjectUrl,
        })
      } else {
        delete (URL as Partial<typeof URL>).createObjectURL
      }
      if (originalRevokeObjectUrl) {
        Object.defineProperty(URL, 'revokeObjectURL', {
          configurable: true,
          value: originalRevokeObjectUrl,
        })
      } else {
        delete (URL as Partial<typeof URL>).revokeObjectURL
      }
    }
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

      if (path === '/stakeholders?pageSize=100') {
        return Promise.resolve(stakeholders)
      }

      if (path === '/reports/sales-summary?year=2026') {
        return Promise.resolve(yearlyReport)
      }

      if (path === '/reports/sales-summary?year=2026&month=5') {
        return Promise.resolve(monthlyReport)
      }

      if (path === '/reports/sales-summary?year=2025') {
        return Promise.resolve({
          rows: [],
          sources: ['store', 'ecommerce', 'event'],
        })
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderReportsRoute()

    await screen.findByText(mapleProjectLabel)
    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Month' }),
      'May',
    )
    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith(
        '/reports/sales-summary?year=2026&month=5',
      )
    })

    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Year' }),
      '2025',
    )

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

      if (path === '/stakeholders?pageSize=100') {
        return Promise.resolve(stakeholders)
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
