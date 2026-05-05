import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteJson,
  getJson,
  patchJson,
  postJson,
  putJson,
} from '../../api/client'
import { EntityEditPage } from './EntityEditPage'

vi.mock('../../api/client', () => ({
  deleteJson: vi.fn(),
  getJson: vi.fn(),
  patchJson: vi.fn(),
  postJson: vi.fn(),
  putJson: vi.fn(),
}))

function renderEntityEditPage(initialEntry: string, editPath: string) {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/:entityName/new" element={<EntityEditPage />} />
          <Route path={editPath} element={<EntityEditPage />} />
          <Route path="/:entityName" element={<div>List page</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EntityEditPage', () => {
  beforeEach(() => {
    vi.mocked(getJson).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('treats the new route as create mode and saves with POST', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      { idModel: 7, name: 'Furniture', description: 'Furniture model' },
    ])
    vi.mocked(postJson).mockResolvedValue({ id: 102 })

    renderEntityEditPage('/products/new', '/:entityName/:id')

    expect(
      screen.getByRole('heading', { name: 'Create Product' }),
    ).toBeVisible()
    expect(
      screen.queryByRole('button', { name: /delete/i }),
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Maple Shelf')
    await user.selectOptions(await screen.findByLabelText('Model'), '7')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith(
        '/products',
        expect.objectContaining({ idModel: 7, name: 'Maple Shelf' }),
      )
    })
    expect(patchJson).not.toHaveBeenCalled()
    expect(deleteJson).not.toHaveBeenCalled()
    expect(getJson).toHaveBeenCalledWith('/models')
  })

  it('renders create product form metadata in grouped sections', () => {
    renderEntityEditPage('/products/new', '/:entityName/:id')

    expect(
      screen.getByRole('heading', { name: 'Create Product' }),
    ).toBeVisible()
    expect(screen.getByRole('group', { name: 'Product details' })).toBeVisible()
    expect(screen.getByRole('group', { name: 'Channel mapping' })).toBeVisible()
    expect(
      screen.getByRole('group', { name: 'Commercial attributes' }),
    ).toBeVisible()

    const nameInput = screen.getByLabelText(/name/i)
    const imageInput = screen.getByLabelText(/image url/i)
    const ownershipInput = screen.getByLabelText(/owner-retained profit/i)

    expect(nameInput).toBeRequired()
    expect(nameInput).toHaveAccessibleDescription(/public product name/i)
    expect(imageInput).toHaveAccessibleDescription(/catalog previews/i)
    expect(ownershipInput).toHaveAccessibleDescription(/percentage of profit/i)
    expect(screen.getByText('%')).toBeVisible()
  })

  it('renders product model choices by model name and saves the selected model id', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      { idModel: 7, name: 'Furniture', description: 'Furniture model' },
      { idModel: 9, name: 'Lighting', description: 'Lighting model' },
    ])
    vi.mocked(postJson).mockResolvedValue({ id: 102 })

    renderEntityEditPage('/products/new', '/:entityName/:id')

    const modelSelect = await screen.findByLabelText('Model')
    expect(modelSelect.tagName).toBe('SELECT')
    expect(
      await screen.findByRole('option', { name: 'Furniture' }),
    ).toHaveValue('7')
    expect(screen.getByRole('option', { name: 'Lighting' })).toHaveValue('9')
    expect(screen.queryByRole('option', { name: '7' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Maple Shelf')
    await user.selectOptions(modelSelect, '7')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith(
        '/products',
        expect.objectContaining({ idModel: 7, name: 'Maple Shelf' }),
      )
    })
  })

  it('requires a model when creating a product', async () => {
    vi.mocked(getJson).mockResolvedValue([
      { idModel: 7, name: 'Furniture', description: 'Furniture model' },
    ])

    renderEntityEditPage('/products/new', '/:entityName/:id')

    const modelSelect = await screen.findByLabelText('Model')
    expect(modelSelect).toBeRequired()
    expect(
      within(
        screen.getByRole('group', { name: 'Commercial attributes' }),
      ).getByText('Required'),
    ).toBeVisible()
  })

  it('updates the product image preview when the image URL changes', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([])

    renderEntityEditPage('/products/new', '/:entityName/:id')

    const productDetails = screen.getByRole('group', {
      name: 'Product details',
    })
    expect(
      within(productDetails).getByText('Add an image URL to preview it here.'),
    ).toBeVisible()

    await user.type(screen.getByLabelText('Name'), 'Maple Shelf')
    await user.type(
      screen.getByLabelText('Image URL'),
      'https://example.test/maple-shelf.jpg',
    )

    const preview = within(productDetails).getByRole('img', {
      name: 'Maple Shelf image preview',
    })
    expect(preview).toHaveAttribute(
      'src',
      'https://example.test/maple-shelf.jpg',
    )
  })

  it('patches an existing product with only configured fields', async () => {
    vi.mocked(getJson).mockResolvedValue({
      id: 101,
      description: 'Standing desk',
      idEcommerce: 'EC-101',
      idEvent: 'EV-101',
      idModel: 7,
      idStore: 'ST-101',
      idSurface: 'SF-101',
      image: 'desk.png',
      model: { idModel: 7, name: 'Furniture' },
      name: 'Walnut Desk',
      ownership: 50,
      tag: 'office',
    })
    vi.mocked(patchJson).mockResolvedValue({ id: 101 })

    renderEntityEditPage('/products/101', '/:entityName/:id')

    expect(await screen.findByDisplayValue('Walnut Desk')).toBeVisible()
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith('/products/101', {
        description: 'Standing desk',
        idEcommerce: 'EC-101',
        idEvent: 'EV-101',
        idModel: 7,
        idStore: 'ST-101',
        idSurface: 'SF-101',
        image: 'desk.png',
        name: 'Walnut Desk',
        ownership: 50,
        tag: 'office',
      })
    })
  })

  it('normalizes existing sale ISO date values for display and update payloads', async () => {
    vi.mocked(getJson).mockResolvedValue({
      idSale: 20,
      amount: 125.5,
      date: '2026-05-04T14:30:00.000Z',
      fee: 3.5,
      idProduct: 101,
      product: { id: 101, name: 'Walnut Desk' },
      quantity: 2,
      source: 'store',
    })
    vi.mocked(patchJson).mockResolvedValue({ idSale: 20 })

    renderEntityEditPage('/sales/20', '/:entityName/:id')

    expect(await screen.findByLabelText('Date')).toHaveValue('2026-05-04')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith('/sales/20', {
        amount: 125.5,
        date: '2026-05-04',
        fee: 3.5,
        idProduct: 101,
        quantity: 2,
        source: 'store',
      })
    })
  })

  it('renders project product choices by product name and saves the selected product id', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      { id: 42, name: 'Maple Shelf', idModel: 7 },
      { id: 43, name: 'Walnut Desk', idModel: 7 },
    ])
    vi.mocked(postJson).mockResolvedValue({ idProject: 501 })

    renderEntityEditPage('/projects/new', '/:entityName/:id')

    const productSelect = await screen.findByLabelText('Product')
    expect(productSelect.tagName).toBe('SELECT')
    expect(
      await screen.findByRole('option', { name: 'Maple Shelf' }),
    ).toHaveValue('42')
    expect(screen.getByRole('option', { name: 'Walnut Desk' })).toHaveValue(
      '43',
    )
    expect(screen.queryByRole('option', { name: '42' })).not.toBeInTheDocument()

    await user.selectOptions(productSelect, '42')
    await user.type(screen.getByLabelText('Units'), '10')
    await user.type(screen.getByLabelText('Unit Cost'), '4.50')
    await user.type(screen.getByLabelText('Production Cost'), '7.75')
    await user.type(screen.getByLabelText('Admin Cost'), '2.25')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/projects', {
        adminCost: 2.25,
        idProduct: 42,
        productionCost: 7.75,
        unitCost: 4.5,
        units: 10,
      })
    })
  })

  it('renders sales source as the import-source select with numeric guidance', () => {
    renderEntityEditPage('/sales/new', '/:entityName/:id')

    expect(screen.getByRole('heading', { name: 'Create Sale' })).toBeVisible()

    const sourceSelect = screen.getByLabelText('Source')
    expect(sourceSelect.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'Ecommerce' })).toHaveValue(
      'ecommerce',
    )
    expect(screen.getByRole('option', { name: 'Store' })).toHaveValue('store')
    expect(screen.getByRole('option', { name: 'Event' })).toHaveValue('event')
    expect(screen.getByRole('option', { name: 'Surface' })).toHaveValue(
      'surface',
    )
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('step', '1')
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('min', '1')
    expect(screen.getByLabelText('Amount')).toHaveAccessibleDescription(
      /currency/i,
    )
    expect(screen.getAllByText('$')).toHaveLength(2)
  })

  it('saves a new project stakeholder split with PUT for the full project total', async () => {
    const user = userEvent.setup()
    vi.mocked(putJson).mockResolvedValue([
      { idProject: 77, idStakeholder: 10, stakePercentage: 60 },
      { idProject: 77, idStakeholder: 11, stakePercentage: 40 },
    ])

    renderEntityEditPage('/project-stakeholders/new', '/:entityName/:id')

    expect(
      screen.getByRole('heading', {
        name: 'Create Project Stakeholders/Split',
      }),
    ).toBeVisible()

    expect(screen.getByLabelText('Project ID')).toHaveAccessibleDescription(
      /all stakeholder rows/i,
    )
    expect(screen.getByLabelText('Stakeholder ID')).toHaveAccessibleDescription(
      /stakeholder receiving/i,
    )
    expect(
      screen.queryByRole('button', { name: /remove row/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/total must equal 100%/i)).toBeVisible()

    await user.type(screen.getByLabelText('Project ID'), '77')
    await user.type(screen.getAllByLabelText('Stakeholder ID')[0], '10')
    await user.type(screen.getAllByLabelText('Stake Percentage')[0], '60')
    await user.click(screen.getByRole('button', { name: 'Add row' }))
    await user.type(screen.getAllByLabelText('Stakeholder ID')[1], '11')
    await user.type(screen.getAllByLabelText('Stake Percentage')[1], '40')

    expect(screen.getByText('Total allocation: 100%')).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(putJson).toHaveBeenCalledWith(
        '/project-stakeholders/projects/77',
        [
          { idStakeholder: 10, stakePercentage: 60 },
          { idStakeholder: 11, stakePercentage: 40 },
        ],
      )
    })
    expect(postJson).not.toHaveBeenCalled()
    expect(patchJson).not.toHaveBeenCalled()
  })

  it('preloads an existing project stakeholder split and saves all rows for that project', async () => {
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/project-stakeholders/501') {
        return {
          idProjectStakeholder: 501,
          idProject: 77,
          idStakeholder: 10,
          stakePercentage: 60,
        }
      }

      if (path === '/project-stakeholders/projects/77') {
        return [
          {
            idProjectStakeholder: 501,
            idProject: 77,
            idStakeholder: 10,
            stakePercentage: 60,
          },
          {
            idProjectStakeholder: 502,
            idProject: 77,
            idStakeholder: 11,
            stakePercentage: 40,
          },
        ]
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(putJson).mockResolvedValue([
      { idProject: 77, idStakeholder: 10, stakePercentage: 60 },
      { idProject: 77, idStakeholder: 11, stakePercentage: 40 },
    ])

    renderEntityEditPage('/project-stakeholders/501', '/:entityName/:id')

    expect(await screen.findByDisplayValue('77')).toBeVisible()
    expect(screen.getByDisplayValue('10')).toBeVisible()
    expect(screen.getByDisplayValue('11')).toBeVisible()
    expect(screen.getByText('Total allocation: 100%')).toBeVisible()
    expect(getJson).toHaveBeenCalledWith('/project-stakeholders/projects/77')

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(putJson).toHaveBeenCalledWith(
        '/project-stakeholders/projects/77',
        [
          { idStakeholder: 10, stakePercentage: 60 },
          { idStakeholder: 11, stakePercentage: 40 },
        ],
      )
    })
    expect(patchJson).not.toHaveBeenCalled()
  })
})
