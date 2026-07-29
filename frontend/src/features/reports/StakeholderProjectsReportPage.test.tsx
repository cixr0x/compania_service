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
    fixedRoi: false,
    fixedRoiPercentage: null,
    fixedRoiProfit: null,
    netSalesTotal: 343,
    productImage: 'https://example.test/maple-shelf.jpg',
    productName: 'Maple Shelf',
    profit: 310,
    profitDifference: null,
    projectId: 501,
    projectProgress: 30,
    projectTotalCost: 110,
    stakeholder: {
      adjustmentCount: 1,
      adjustments: 10.25,
      balance: 90.55,
      income: 205.8,
      investment: 25.5,
      payments: 125.5,
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

const fixedRoiStakeholderProjectsReport = {
  ...stakeholderProjectsReport,
  row: {
    ...stakeholderProjectsReport.row,
    fixedRoi: true,
    fixedRoiPercentage: 20,
    fixedRoiProfit: 6.6,
    profitDifference: 303.4,
    stakeholder: {
      ...stakeholderProjectsReport.row.stakeholder,
      balance: -111.29,
      income: 3.96,
    },
  },
}

const projects = [
  {
    fixedRoi: false,
    fixedRoiPercentage: null,
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

function renderStakeholderProjectsReportRoute(
  initialEntry = '/reports/stakeholder-projects',
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
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
            transactionType: 'payment',
          },
        ])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })
    vi.mocked(putJson).mockImplementation(async (_path, body) => body)

    renderStakeholderProjectsReportRoute()

    expect(
      await screen.findByRole('heading', {
        name: 'Proyectos por socio',
      }),
    ).toBeVisible()
    expect(
      screen.getByText(
        'Rendimiento de la inversión e historial de transacciones',
      ),
    ).toBeVisible()
    await user.click(screen.getByRole('button', { name: /Reports/i }))
    await waitFor(() => {
      expect(
        screen.getByRole('link', { name: 'Proyectos por socio' }),
      ).toHaveAttribute('href', '/reports/stakeholder-projects')
    })

    const projectSelect = await screen.findByRole('combobox', {
      name: 'Proyecto',
    })
    const stakeholderSelect = screen.getByRole('combobox', {
      name: 'Socio',
    })
    expect(stakeholderSelect.closest('.ant-select')).toHaveClass(
      'ant-select-disabled',
    )
    expect(
      screen.getByText(
        'Selecciona un proyecto y un socio para cargar el reporte.',
      ),
    ).toBeVisible()

    await selectAntOption(user, projectSelect, 'Proyecto #501 - Maple Shelf')
    await selectAntOption(user, stakeholderSelect, 'Alicia')

    await waitFor(() => {
      expect(getJson).toHaveBeenCalledWith(
        '/reports/stakeholder-projects?projectId=501&stakeholderId=10',
      )
    })

    const projectRegion = await screen.findByRole('region', {
      name: 'Maple Shelf, proyecto 501',
    })
    expect(
      within(projectRegion).getByRole('img', {
        name: 'Miniatura de Maple Shelf',
      }),
    ).toHaveAttribute('src', 'https://example.test/maple-shelf.jpg')
    expect(within(projectRegion).getByText('Proyecto #501')).toBeVisible()
    expect(
      within(projectRegion).getByRole('link', { name: 'Maple Shelf' }),
    ).toHaveAttribute('href', '/products/42')
    expect(
      within(projectRegion).getByRole('link', { name: 'Proyecto #501' }),
    ).toHaveAttribute('href', '/projects/501')
    expect(within(projectRegion).getByText('30%')).toBeVisible()
    expect(
      within(projectRegion).getByText('3 / 10 unidades vendidas'),
    ).toBeVisible()

    const sourceTiles = within(projectRegion).getByRole('list', {
      name: 'Maple Shelf, totales por origen',
    })
    expect(sourceTiles).toHaveClass('stakeholder-source-grid')
    expect(within(sourceTiles).getByText('Tienda')).toBeVisible()
    expect(within(sourceTiles).getByText('2 unidades')).toBeVisible()
    expect(within(sourceTiles).getByText('$200.00')).toBeVisible()
    expect(within(sourceTiles).getByText('Comercio electrónico')).toBeVisible()
    expect(within(sourceTiles).getByText('1 unidad')).toBeVisible()
    expect(within(sourceTiles).getByText('$150.00')).toBeVisible()
    expect(within(sourceTiles).getByText('Evento')).toBeVisible()
    expect(within(sourceTiles).getByText('0 unidades')).toBeVisible()
    expect(within(sourceTiles).queryByText('Surface')).not.toBeInTheDocument()

    expect(within(projectRegion).getByText('Unidades restantes')).toBeVisible()
    expect(within(projectRegion).getByText('7')).toBeVisible()
    expect(within(projectRegion).getByText('Ventas totales')).toBeVisible()
    expect(within(projectRegion).getByText('$350.00')).toBeVisible()
    expect(within(projectRegion).getByText('Comisiones totales')).toBeVisible()
    expect(within(projectRegion).getByText('$7.00')).toBeVisible()
    expect(
      within(projectRegion).getByText('Ventas netas totales'),
    ).toBeVisible()
    expect(within(projectRegion).getByText('$343.00')).toBeVisible()
    expect(within(projectRegion).getByText('Costo calculado')).toBeVisible()
    expect(within(projectRegion).getByText('$33.00')).toBeVisible()
    expect(within(projectRegion).getByText('Utilidad')).toBeVisible()
    expect(within(projectRegion).getByText('$310.00')).toBeVisible()
    expect(within(projectRegion).getByText('ROI del proyecto')).toBeVisible()
    expect(within(projectRegion).getByText('939.39%')).toBeVisible()

    const stakeholderRegion = screen.getByRole('region', {
      name: 'Alicia, detalle del socio',
    })
    expect(stakeholderRegion).toHaveClass('stakeholder-detail-card')
    expect(within(stakeholderRegion).getByText('Alicia')).toBeVisible()
    expect(
      within(stakeholderRegion).getByRole('link', { name: 'Alicia' }),
    ).toHaveAttribute('href', '/stakeholders/10')
    expect(
      within(stakeholderRegion).getByText('Participación %'),
    ).toBeVisible()
    expect(within(stakeholderRegion).getByText('60%')).toBeVisible()
    expect(
      within(stakeholderRegion).getByText('Saldo de inversión'),
    ).toBeVisible()
    expect(within(stakeholderRegion).getByText('$25.50')).toBeVisible()
    expect(within(stakeholderRegion).getByText('Pagos')).toBeVisible()
    expect(
      within(stakeholderRegion).getAllByText('$125.50').length,
    ).toBeGreaterThan(0)
    expect(
      within(stakeholderRegion).getByText('Ingreso correspondiente'),
    ).toBeVisible()
    expect(within(stakeholderRegion).getByText('$205.80')).toBeVisible()
    expect(within(stakeholderRegion).getByText('Ajustes')).toBeVisible()
    expect(within(stakeholderRegion).getByText('Saldo')).toBeVisible()
    expect(within(stakeholderRegion).getByText('$10.25')).toBeVisible()
    expect(within(stakeholderRegion).getByText('$90.55')).toBeVisible()
    expect(
      screen.getByRole('link', { name: 'Imprimir reporte' }),
    ).toHaveAttribute(
      'href',
      '/reports/stakeholder-projects/print?projectId=501&stakeholderId=10',
    )
    expect(
      screen.getByRole('table', {
        name: 'Alicia, detalle de transacciones',
      }),
    ).toBeVisible()
    expect(screen.getByText('Distribution')).toBeVisible()
    expect(screen.getAllByText('$125.50').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('button', {
        name: 'Agregar transacción',
      }),
    ).toBeVisible()
    expect(within(projectRegion).queryByText('Bruno')).not.toBeInTheDocument()
  })

  it('shows fixed ROI project metrics, hides channel amounts, and uses fixed stakeholder income', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/projects?pageSize=100') {
        return Promise.resolve(projects)
      }

      if (
        path === '/reports/stakeholder-projects?projectId=501&stakeholderId=10'
      ) {
        return Promise.resolve(fixedRoiStakeholderProjectsReport)
      }

      if (
        path ===
        '/stakeholder-project-transactions/projects/501/stakeholders/10'
      ) {
        return Promise.resolve([])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderStakeholderProjectsReportRoute()

    await selectAntOption(
      user,
      await screen.findByRole('combobox', { name: 'Proyecto' }),
      'Proyecto #501 - Maple Shelf',
    )
    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Socio' }),
      'Alicia',
    )

    const projectRegion = await screen.findByRole('region', {
      name: 'Maple Shelf, proyecto 501',
    })
    const sourceTiles = within(projectRegion).getByRole('list', {
      name: 'Maple Shelf, totales por origen',
    })

    expect(within(sourceTiles).getByText('2 unidades')).toBeVisible()
    expect(within(sourceTiles).getByText('1 unidad')).toBeVisible()
    expect(within(sourceTiles).queryByText('$200.00')).not.toBeInTheDocument()
    expect(within(sourceTiles).queryByText('$150.00')).not.toBeInTheDocument()
    expect(within(projectRegion).getByText('ROI fijo')).toBeVisible()
    expect(within(projectRegion).getByText('20%')).toBeVisible()
    expect(within(projectRegion).getByText('Utilidad otorgada')).toBeVisible()
    expect(within(projectRegion).getByText('$6.60')).toBeVisible()
    expect(
      within(projectRegion).getByText('Diferencia de utilidad'),
    ).toBeVisible()
    expect(within(projectRegion).getByText('$303.40')).toBeVisible()
    expect(within(projectRegion).getByText('Ventas totales')).toBeVisible()

    const stakeholderRegion = screen.getByRole('region', {
      name: 'Alicia, detalle del socio',
    })
    expect(within(stakeholderRegion).getByText('$3.96')).toBeVisible()
    expect(within(stakeholderRegion).getByText('$-111.29')).toBeVisible()
  })

  it('renders a printable stakeholder projects report without selectors or transaction controls', async () => {
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (
        path === '/reports/stakeholder-projects?projectId=501&stakeholderId=10'
      ) {
        return Promise.resolve(stakeholderProjectsReport)
      }

      if (path === '/projects/501') {
        return Promise.resolve(projects[0])
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
            transactionType: 'payment',
          },
        ])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderStakeholderProjectsReportRoute(
      '/reports/stakeholder-projects/print?projectId=501&stakeholderId=10',
    )

    expect(
      await screen.findByRole('heading', {
        name: 'Proyectos por socio',
      }),
    ).toBeVisible()
    expect(screen.getByText('Reporte para imprimir')).toBeVisible()
    expect(
      screen.queryByRole('combobox', { name: 'Proyecto' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('combobox', { name: 'Socio' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Imprimir reporte' }),
    ).not.toBeInTheDocument()

    const projectRegion = await screen.findByRole('region', {
      name: 'Maple Shelf, proyecto 501',
    })
    expect(
      await within(projectRegion).findByRole('link', {
        name: 'Maple Shelf',
      }),
    ).toHaveAttribute('href', '/products/42')
    expect(within(projectRegion).getByText('Proyecto #501')).toBeVisible()
    expect(within(projectRegion).getByText('$310.00')).toBeVisible()
    expect(within(projectRegion).getByText('ROI del proyecto')).toBeVisible()
    expect(within(projectRegion).getByText('939.39%')).toBeVisible()

    const stakeholderRegion = screen.getByRole('region', {
      name: 'Alicia, detalle del socio',
    })
    expect(within(stakeholderRegion).getByText('$90.55')).toBeVisible()

    const transactionTable = await screen.findByRole('table', {
      name: 'Alicia, detalle de transacciones',
    })
    expect(within(transactionTable).getByText('Distribution')).toBeVisible()
    expect(within(transactionTable).getByText('Pago')).toBeVisible()
    expect(
      within(transactionTable).getByRole('columnheader', { name: 'Fecha' }),
    ).toBeVisible()
    expect(
      within(transactionTable).getByRole('columnheader', { name: 'Tipo' }),
    ).toBeVisible()
    expect(
      within(transactionTable).getByRole('columnheader', {
        name: 'Descripción',
      }),
    ).toBeVisible()
    expect(
      within(transactionTable).getByRole('columnheader', { name: 'Monto' }),
    ).toBeVisible()
    expect(within(transactionTable).getByText('$125.50')).toBeVisible()
    expect(
      screen.queryByRole('button', { name: 'Agregar transacción' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Editar fila/i }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Eliminar fila/i }),
    ).not.toBeInTheDocument()
  })

  it('prints only the approved fixed ROI project metrics', async () => {
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (
        path === '/reports/stakeholder-projects?projectId=501&stakeholderId=10'
      ) {
        return Promise.resolve(fixedRoiStakeholderProjectsReport)
      }

      if (path === '/projects/501') {
        return Promise.resolve({
          ...projects[0],
          fixedRoi: true,
          fixedRoiPercentage: 20,
        })
      }

      if (
        path ===
        '/stakeholder-project-transactions/projects/501/stakeholders/10'
      ) {
        return Promise.resolve([])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderStakeholderProjectsReportRoute(
      '/reports/stakeholder-projects/print?projectId=501&stakeholderId=10',
    )

    const projectRegion = await screen.findByRole('region', {
      name: 'Maple Shelf, proyecto 501',
    })

    expect(within(projectRegion).getByText('Unidades vendidas')).toBeVisible()
    expect(within(projectRegion).getByText('3')).toBeVisible()
    expect(within(projectRegion).getByText('Costo calculado')).toBeVisible()
    expect(within(projectRegion).getByText('$33.00')).toBeVisible()
    expect(within(projectRegion).getByText('ROI fijo')).toBeVisible()
    expect(within(projectRegion).getByText('20%')).toBeVisible()
    expect(within(projectRegion).getByText('Utilidad otorgada')).toBeVisible()
    expect(within(projectRegion).getByText('$6.60')).toBeVisible()
    expect(
      within(projectRegion).queryByRole('list', {
        name: 'Maple Shelf, totales por origen',
      }),
    ).not.toBeInTheDocument()
    expect(
      within(projectRegion).queryByText('3 / 10 unidades vendidas'),
    ).not.toBeInTheDocument()
    expect(
      within(projectRegion).queryByText('Unidades restantes'),
    ).not.toBeInTheDocument()
    expect(
      within(projectRegion).queryByText('Ventas totales'),
    ).not.toBeInTheDocument()
    expect(
      within(projectRegion).queryByText('Comisiones totales'),
    ).not.toBeInTheDocument()
    expect(
      within(projectRegion).queryByText('Ventas netas totales'),
    ).not.toBeInTheDocument()
    expect(within(projectRegion).queryByText('Utilidad')).not.toBeInTheDocument()
    expect(
      within(projectRegion).queryByText('ROI del proyecto'),
    ).not.toBeInTheDocument()
    expect(
      within(projectRegion).queryByText('Diferencia de utilidad'),
    ).not.toBeInTheDocument()

    const stakeholderRegion = screen.getByRole('region', {
      name: 'Alicia, detalle del socio',
    })
    expect(within(stakeholderRegion).getByText('$3.96')).toBeVisible()
  })

  it('shows an unavailable project ROI when calculated cost is zero', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation((path: string) => {
      if (path === '/projects?pageSize=100') {
        return Promise.resolve(projects)
      }

      if (
        path === '/reports/stakeholder-projects?projectId=501&stakeholderId=10'
      ) {
        return Promise.resolve({
          ...stakeholderProjectsReport,
          row: {
            ...stakeholderProjectsReport.row,
            calculatedCost: 0,
          },
        })
      }

      if (
        path ===
        '/stakeholder-project-transactions/projects/501/stakeholders/10'
      ) {
        return Promise.resolve([])
      }

      return Promise.reject(new Error(`Unexpected GET ${path}`))
    })

    renderStakeholderProjectsReportRoute()

    await selectAntOption(
      user,
      await screen.findByRole('combobox', { name: 'Proyecto' }),
      'Proyecto #501 - Maple Shelf',
    )
    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Socio' }),
      'Alicia',
    )

    const projectRegion = await screen.findByRole('region', {
      name: 'Maple Shelf, proyecto 501',
    })
    const roiMetric = within(projectRegion)
      .getByText('ROI del proyecto')
      .closest<HTMLElement>('.stakeholder-project-metric')

    expect(roiMetric).not.toBeNull()
    expect(within(roiMetric!).getByText('-')).toBeVisible()
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
      await screen.findByRole('combobox', { name: 'Proyecto' }),
      'Proyecto #501 - Maple Shelf',
    )
    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Socio' }),
      'Alicia',
    )

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveClass('ant-alert-error')
    expect(alert).toHaveTextContent(
      'No se pudo cargar el reporte de proyectos por socio.',
    )
  })
})
