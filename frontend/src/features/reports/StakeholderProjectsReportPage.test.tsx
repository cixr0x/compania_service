import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../App'
import { getJson, putJson } from '../../api/client'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
  putJson: vi.fn(),
}))

const stakeholderProjectsReport = {
  row: {
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
    stakeholder: {
      balance: 139.8,
      income: 205.8,
      investment: 66,
      stakePercentage: 60,
      stakeholderId: 10,
      stakeholderName: 'Alicia',
    },
    store: { amount: 200, quantity: 2 },
    surface: { amount: 0, quantity: 0 },
    totalFees: 7,
    totalSales: 350,
    totalUnits: 10,
    totalUnitsSold: 3,
    transactions: [],
    unitPrice: 11,
    unitsLeft: 7,
  },
  sources: ['store', 'ecommerce', 'event'],
}

const projects = [
  {
    idProject: 501,
    idProduct: 42,
    product: {
      id: 42,
      image: 'https://example.test/maple-shelf.jpg',
      name: 'Maple Shelf',
    },
    stakeholders: [
      {
        idProjectStakeholder: 900,
        idProject: 501,
        idStakeholder: 10,
        stakePercentage: '60.00',
        stakeholder: { idStakeholder: 10, name: 'Alicia' },
      },
      {
        idProjectStakeholder: 901,
        idProject: 501,
        idStakeholder: 11,
        stakePercentage: '40.00',
        stakeholder: { idStakeholder: 11, name: 'Bruno' },
      },
    ],
  },
]

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

async function selectAntOption(
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
  optionName: string,
) {
  await user.click(combobox)
  const options = await screen.findAllByTitle(optionName)
  await user.click(options[options.length - 1])
}

describe('StakeholderProjectsReportPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads a selected project and stakeholder as a header/detail report without other stakeholder data', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/projects?pageSize=100') {
        return Promise.resolve(projects)
      }

      if (
        path === '/reports/stakeholder-projects?projectId=501&stakeholderId=10'
      ) {
        return Promise.resolve(stakeholderProjectsReport)
      }

      if (
        path ===
        '/stakeholder-project-transactions/projects/501/stakeholders/10'
      ) {
        return Promise.resolve([
          {
            amount: 125.5,
            date: '2026-05-05',
            description: 'Distribution',
            idProject: 501,
            idStakeholder: 10,
            idStakeholderProjectTransaction: 99,
          },
        ])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })
    vi.mocked(putJson).mockImplementation(async (_path, body) => body)

    renderStakeholderProjectsReportRoute()

    expect(
      await screen.findByRole('heading', {
        name: 'Stakeholder Projects Report',
      }),
    ).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Stakeholder Projects' }),
    ).toHaveAttribute('href', '/reports/stakeholder-projects')

    const projectSelect = await screen.findByRole('combobox', {
      name: 'Project',
    })
    const stakeholderSelect = screen.getByRole('combobox', {
      name: 'Stakeholder',
    })
    expect(stakeholderSelect.closest('.ant-select')).toHaveClass(
      'ant-select-disabled',
    )
    expect(
      screen.getByText('Select a project and stakeholder to load the report.'),
    ).toBeVisible()

    await selectAntOption(user, projectSelect, 'Project #501 - Maple Shelf')
    await selectAntOption(user, stakeholderSelect, 'Alicia')

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith(
        '/reports/stakeholder-projects?projectId=501&stakeholderId=10',
      )
    })

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

    const stakeholderRegion = within(projectRegion).getByRole('region', {
      name: 'Alicia stakeholder detail',
    })
    expect(within(stakeholderRegion).getByText('Alicia')).toBeVisible()
    expect(within(stakeholderRegion).getByText('60.00%')).toBeVisible()
    expect(within(stakeholderRegion).getByText('$66.00')).toBeVisible()
    expect(within(stakeholderRegion).getByText('$205.80')).toBeVisible()
    expect(within(stakeholderRegion).getByText('$139.80')).toBeVisible()
    expect(
      within(stakeholderRegion).getByRole('table', {
        name: 'Alicia transaction details',
      }),
    ).toBeVisible()
    expect(within(stakeholderRegion).getByText('Distribution')).toBeVisible()
    expect(within(stakeholderRegion).getByText('$125.50')).toBeVisible()
    expect(
      within(stakeholderRegion).getByRole('button', {
        name: 'Add transaction',
      }),
    ).toBeVisible()
    expect(within(projectRegion).queryByText('Bruno')).not.toBeInTheDocument()
  })

  it('renders report load failures as an Ant Design alert', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/projects?pageSize=100') {
        return Promise.resolve(projects)
      }

      if (
        path ===
        '/stakeholder-project-transactions/projects/501/stakeholders/10'
      ) {
        return Promise.resolve([])
      }

      return Promise.reject(new Error('Report failed'))
    })

    renderStakeholderProjectsReportRoute()

    await selectAntOption(
      user,
      await screen.findByRole('combobox', { name: 'Project' }),
      'Project #501 - Maple Shelf',
    )
    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Stakeholder' }),
      'Alicia',
    )

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveClass('ant-alert-error')
    expect(alert).toHaveTextContent(
      'Unable to load the stakeholder projects report.',
    )
  })
})
