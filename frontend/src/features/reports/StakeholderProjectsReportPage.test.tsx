import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { getJson } from '../../api/client'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
}))

const stakeholderProjectsReport = {
  rows: [
    {
      calculatedCost: 33,
      ecommerce: { amount: 150, quantity: 1 },
      event: { amount: 0, quantity: 0 },
      netSalesTotal: 343,
      productImage: 'https://example.test/maple-shelf.jpg',
      productName: 'Maple Shelf',
      profit: 310,
      projectId: 501,
      projectProgress: 30,
      projectTotalCost: 110,
      stakeholders: [
        {
          balance: 139.8,
          income: 205.8,
          investment: 66,
          stakePercentage: 60,
          stakeholderId: 10,
          stakeholderName: 'Alicia',
        },
        {
          balance: 93.2,
          income: 137.2,
          investment: 44,
          stakePercentage: 40,
          stakeholderId: 11,
          stakeholderName: 'Bruno',
        },
      ],
      store: { amount: 200, quantity: 2 },
      surface: { amount: 0, quantity: 0 },
      totalFees: 7,
      totalSales: 350,
      totalUnits: 10,
      totalUnitsSold: 3,
      unitPrice: 11,
      unitsLeft: 7,
    },
  ],
  sources: ['store', 'ecommerce', 'event'],
}

function renderStakeholderProjectsReportRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/reports/stakeholder-projects']}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('StakeholderProjectsReportPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders all-time project totals and stakeholder balances', async () => {
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/reports/stakeholder-projects') {
        return Promise.resolve(stakeholderProjectsReport)
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderStakeholderProjectsReportRoute()

    expect(
      await screen.findByRole('heading', {
        name: 'Stakeholder Projects Report',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Stakeholder Projects' }),
    ).toHaveAttribute('href', '/reports/stakeholder-projects')

    const projectRegion = await screen.findByRole('region', {
      name: 'Maple Shelf project 501',
    })
    expect(
      within(projectRegion).getByRole('img', {
        name: 'Maple Shelf thumbnail',
      }),
    ).toHaveAttribute('src', 'https://example.test/maple-shelf.jpg')
    expect(within(projectRegion).getByText('Project #501')).toBeVisible()
    expect(within(projectRegion).getByText('30.00%')).toBeVisible()
    expect(within(projectRegion).getByText('3 / 10 units sold')).toBeVisible()

    const sourceTable = within(projectRegion).getByRole('table', {
      name: 'Maple Shelf source totals',
    })
    expect(within(sourceTable).getByRole('columnheader', { name: 'Store' })).toBeVisible()
    expect(
      within(sourceTable).getByRole('columnheader', { name: 'Ecommerce' }),
    ).toBeVisible()
    expect(within(sourceTable).getByRole('columnheader', { name: 'Event' })).toBeVisible()
    expect(
      within(sourceTable).queryByRole('columnheader', { name: 'Surface' }),
    ).not.toBeInTheDocument()
    expect(within(sourceTable).getByText('$200.00')).toBeVisible()
    expect(within(sourceTable).getByText('$150.00')).toBeVisible()

    expect(within(projectRegion).getByText('Units left')).toBeVisible()
    expect(within(projectRegion).getByText('7')).toBeVisible()
    expect(within(projectRegion).getByText('Total sales')).toBeVisible()
    expect(within(projectRegion).getByText('$350.00')).toBeVisible()
    expect(within(projectRegion).getByText('Total fees')).toBeVisible()
    expect(within(projectRegion).getByText('$7.00')).toBeVisible()
    expect(within(projectRegion).getByText('Net sales total')).toBeVisible()
    expect(within(projectRegion).getByText('$343.00')).toBeVisible()
    expect(within(projectRegion).getByText('Calculated cost')).toBeVisible()
    expect(within(projectRegion).getByText('$33.00')).toBeVisible()
    expect(within(projectRegion).getByText('Profit')).toBeVisible()
    expect(within(projectRegion).getByText('$310.00')).toBeVisible()

    const stakeholderTable = within(projectRegion).getByRole('table', {
      name: 'Maple Shelf stakeholder balances',
    })
    const aliciaRow = within(stakeholderTable).getByText('Alicia').closest('tr')!
    expect(within(aliciaRow).getByText('60.00%')).toBeVisible()
    expect(within(aliciaRow).getByText('$66.00')).toBeVisible()
    expect(within(aliciaRow).getByText('$205.80')).toBeVisible()
    expect(within(aliciaRow).getByText('$139.80')).toBeVisible()
  })

  it('renders report load failures as an Ant Design alert', async () => {
    vi.mocked(getJson).mockRejectedValue(new Error('Report failed'))

    renderStakeholderProjectsReportRoute()

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveClass('ant-alert-error')
    expect(alert).toHaveTextContent(
      'Unable to load the stakeholder projects report.',
    )
  })
})
