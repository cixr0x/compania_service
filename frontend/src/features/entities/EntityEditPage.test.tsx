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
import { entityConfigs, type EntityName } from './entityConfigs'

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
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [{ id: 101, name: 'Walnut Desk' }]
      }

      if (path === '/projects') {
        return [
          {
            idProject: 501,
            idProduct: 101,
            product: { id: 101, name: 'Walnut Desk' },
          },
        ]
      }

      if (path === '/sales/20') {
        return {
          idSale: 20,
          amount: 125.5,
          date: '2026-05-04T14:30:00.000Z',
          fee: 3.5,
          idProduct: 101,
          idProject: 501,
          product: { id: 101, name: 'Walnut Desk' },
          project: { idProject: 501 },
          quantity: 2,
          source: 'store',
        }
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(patchJson).mockResolvedValue({ idSale: 20 })

    renderEntityEditPage('/sales/20', '/:entityName/:id')

    expect(await screen.findByLabelText('Date')).toHaveValue('2026-05-04')
    expect(screen.getByLabelText('Amount')).toHaveValue('125.50')
    expect(screen.getByLabelText('Fee')).toHaveValue('3.50')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith('/sales/20', {
        amount: 125.5,
        date: '2026-05-04',
        fee: 3.5,
        idProduct: 101,
        idProject: 501,
        quantity: 2,
        source: 'store',
      })
    })
  })

  it('requires product and project selectors when creating a sale and saves their ids', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [
          { id: 101, name: 'Walnut Desk' },
          { id: 102, name: 'Maple Shelf' },
        ]
      }

      if (path === '/projects') {
        return [
          {
            idProject: 501,
            idProduct: 101,
            product: { id: 101, name: 'Walnut Desk' },
          },
          {
            idProject: 502,
            idProduct: 102,
            product: { id: 102, name: 'Maple Shelf' },
          },
        ]
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(postJson).mockResolvedValue({ idSale: 30 })

    renderEntityEditPage('/sales/new', '/:entityName/:id')

    const productSelect = await screen.findByLabelText('Product')
    expect(productSelect.tagName).toBe('SELECT')
    expect(productSelect).toBeRequired()
    expect(
      await screen.findByRole('option', { name: 'Walnut Desk' }),
    ).toHaveValue('101')
    expect(screen.getByRole('option', { name: 'Maple Shelf' })).toHaveValue(
      '102',
    )

    const projectSelect = await screen.findByLabelText('Project')
    expect(projectSelect.tagName).toBe('SELECT')
    expect(projectSelect).toBeRequired()
    expect(
      await screen.findByRole('option', { name: 'Project #501 - Walnut Desk' }),
    ).toHaveValue('501')
    expect(
      screen.getByRole('option', { name: 'Project #502 - Maple Shelf' }),
    ).toHaveValue('502')

    await user.type(screen.getByLabelText('Date'), '2026-05-05')
    await user.selectOptions(productSelect, '101')
    await user.selectOptions(projectSelect, '501')
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.type(screen.getByLabelText('Amount'), '1,000,000.00')
    await user.type(screen.getByLabelText('Fee'), '1,250.50')
    await user.selectOptions(screen.getByLabelText('Source'), 'store')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/sales', {
        amount: 1000000,
        date: '2026-05-05',
        fee: 1250.5,
        idProduct: 101,
        idProject: 501,
        quantity: 2,
        source: 'store',
      })
    })
    expect(getJson).toHaveBeenCalledWith('/products')
    expect(getJson).toHaveBeenCalledWith('/projects')
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
    await user.click(screen.getByLabelText('Active'))
    await user.type(screen.getByLabelText('Units'), '10')
    await user.type(screen.getByLabelText('Unit Cost'), '1,000,000.00')
    await user.type(screen.getByLabelText('Production Cost'), '7,500.25')
    await user.type(screen.getByLabelText('Admin Cost'), '2,250.50')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/projects', {
        adminCost: 2250.5,
        idProduct: 42,
        isActive: true,
        productionCost: 7500.25,
        unitCost: 1000000,
        units: 10,
      })
    })
  })

  it('shows a read-only project total cost and excludes it from create payloads', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      { id: 42, name: 'Maple Shelf', idModel: 7 },
    ])
    vi.mocked(postJson).mockResolvedValue({ idProject: 501 })

    renderEntityEditPage('/projects/new', '/:entityName/:id')

    const productSelect = await screen.findByLabelText('Product')
    expect(
      await screen.findByRole('option', { name: 'Maple Shelf' }),
    ).toHaveValue('42')
    const totalCostInput = screen.getByLabelText('Total Cost')
    expect(totalCostInput).toHaveValue('0.00')
    expect(totalCostInput).toHaveAttribute('readonly')

    await user.selectOptions(productSelect, '42')
    await user.type(screen.getByLabelText('Production Cost'), '7,500.25')
    await user.type(screen.getByLabelText('Admin Cost'), '2,250.50')

    expect(totalCostInput).toHaveValue('9,750.75')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith(
        '/projects',
        expect.objectContaining({
          adminCost: 2250.5,
          idProduct: 42,
          isActive: false,
          productionCost: 7500.25,
        }),
      )
    })
    expect(vi.mocked(postJson).mock.calls[0]?.[1]).not.toHaveProperty(
      'totalCost',
    )
  })

  it('recalculates project total cost while replacing existing cost values', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [{ id: 42, name: 'Maple Shelf', idModel: 7 }]
      }

      if (path === '/stakeholders?pageSize=100') {
        return []
      }

      if (path === '/projects/77') {
        return {
          adminCost: 250,
          idProduct: 42,
          idProject: 77,
          isActive: true,
          productionCost: 7500,
          unitCost: 10,
          units: 100,
        }
      }

      if (path === '/project-stakeholders/projects/77') {
        return []
      }

      throw new Error(`Unexpected path: ${path}`)
    })

    renderEntityEditPage('/projects/77', '/:entityName/:id')

    const totalCostInput = await screen.findByLabelText('Total Cost')
    expect(totalCostInput).toHaveValue('7,750.00')

    await user.click(screen.getByLabelText('Production Cost'))
    await user.keyboard('1000')
    expect(totalCostInput).toHaveValue('1,250.00')

    await user.click(screen.getByLabelText('Admin Cost'))
    await user.keyboard('500')
    expect(totalCostInput).toHaveValue('1,500.00')
  })

  it('configures every money field and money table column for currency formatting', () => {
    const moneyFields: Array<[EntityName, string]> = [
      ['projects', 'unitCost'],
      ['projects', 'productionCost'],
      ['projects', 'adminCost'],
      ['projects', 'totalCost'],
      ['sales', 'amount'],
      ['sales', 'fee'],
    ]

    for (const [entityName, fieldName] of moneyFields) {
      const field = entityConfigs[entityName].fields.find(
        (candidate) => candidate.name === fieldName,
      )
      const column = entityConfigs[entityName].columns.find(
        (candidate) => candidate.key === fieldName,
      )

      expect(field, `${entityName}.${fieldName}`).toMatchObject({
        prefix: '$',
        valueFormat: 'money',
      })
      expect(column, `${entityName}.${fieldName}`).toMatchObject({
        valueFormat: 'money',
      })
    }
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

  it('configures every foreign key form field as a select', () => {
    const foreignKeyFields: Array<[EntityName, string]> = [
      ['products', 'idModel'],
      ['projects', 'idProduct'],
      ['project-stakeholders', 'idProject'],
      ['project-stakeholders', 'idStakeholder'],
      ['sales', 'idProduct'],
      ['sales', 'idProject'],
    ]

    for (const [entityName, fieldName] of foreignKeyFields) {
      const field = entityConfigs[entityName].fields.find(
        (candidate) => candidate.name === fieldName,
      )

      expect(field, `${entityName}.${fieldName}`).toMatchObject({
        type: 'select',
        valueType: 'number',
      })
      expect(field?.optionSource, `${entityName}.${fieldName}`).toBeDefined()
    }
  })

  it('saves stakeholder split rows from the project create form after creating the project', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [
          { id: 42, name: 'Maple Shelf', idModel: 7 },
          { id: 43, name: 'Walnut Desk', idModel: 7 },
        ]
      }

      if (path === '/stakeholders?pageSize=100') {
        return [
          { idStakeholder: 10, name: 'Alicia' },
          { idStakeholder: 11, name: 'Bruno' },
        ]
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(postJson).mockResolvedValue({ idProject: 77 })
    vi.mocked(putJson).mockResolvedValue([
      { idProject: 77, idStakeholder: 10, stakePercentage: 60 },
      { idProject: 77, idStakeholder: 11, stakePercentage: 40 },
    ])

    renderEntityEditPage('/projects/new', '/:entityName/:id')

    const productSelect = await screen.findByLabelText('Product')
    expect(
      await screen.findByRole('option', { name: 'Maple Shelf' }),
    ).toHaveValue('42')
    await user.selectOptions(productSelect, '42')
    await user.click(screen.getByLabelText('Active'))
    await user.type(screen.getByLabelText('Units'), '10')
    await user.type(screen.getByLabelText('Unit Cost'), '1,000,000.00')
    await user.type(screen.getByLabelText('Production Cost'), '7,500.25')
    await user.type(screen.getByLabelText('Admin Cost'), '2,250.50')

    const splitSection = await screen.findByRole('group', {
      name: 'Stakeholder Split',
    })
    expect(
      within(splitSection).getByText(/No stakeholders have been added/i),
    ).toBeVisible()

    await user.click(
      within(splitSection).getByRole('button', { name: 'Add stakeholder' }),
    )
    const stakeholderSelect = within(splitSection).getByLabelText('Stakeholder')
    expect(stakeholderSelect.tagName).toBe('SELECT')
    expect(screen.getByRole('option', { name: 'Alicia' })).toHaveValue('10')
    expect(screen.getByRole('option', { name: 'Bruno' })).toHaveValue('11')
    expect(stakeholderSelect).toHaveAccessibleDescription(
      /stakeholder receiving/i,
    )
    expect(
      within(splitSection).queryByRole('button', { name: /remove row/i }),
    ).not.toBeInTheDocument()
    expect(
      within(splitSection).getByText(/total must equal 100%/i),
    ).toBeVisible()

    await user.selectOptions(stakeholderSelect, '10')
    await user.type(
      within(splitSection).getAllByLabelText('Stake Percentage')[0],
      '60',
    )
    await user.click(
      within(splitSection).getByRole('button', { name: 'Add stakeholder' }),
    )
    await user.selectOptions(
      within(splitSection).getAllByLabelText('Stakeholder')[1],
      '11',
    )
    await user.type(
      within(splitSection).getAllByLabelText('Stake Percentage')[1],
      '40',
    )

    expect(
      within(splitSection).getByText('Total allocation: 100%'),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/projects', {
        adminCost: 2250.5,
        idProduct: 42,
        isActive: true,
        productionCost: 7500.25,
        unitCost: 1000000,
        units: 10,
      })
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

  it('preloads an existing stakeholder split in the project edit form and saves all rows for that project', async () => {
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [{ id: 42, name: 'Maple Shelf', idModel: 7 }]
      }

      if (path === '/stakeholders?pageSize=100') {
        return [
          { idStakeholder: 10, name: 'Alicia' },
          { idStakeholder: 11, name: 'Bruno' },
        ]
      }

      if (path === '/projects/77') {
        return {
          adminCost: 2250.5,
          idProduct: 42,
          idProject: 77,
          isActive: true,
          productionCost: 7500.25,
          unitCost: 1000000,
          units: 10,
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
    vi.mocked(patchJson).mockResolvedValue({ idProject: 77 })
    vi.mocked(putJson).mockResolvedValue([
      { idProject: 77, idStakeholder: 10, stakePercentage: 60 },
      { idProject: 77, idStakeholder: 11, stakePercentage: 40 },
    ])

    renderEntityEditPage('/projects/77', '/:entityName/:id')

    expect(await screen.findByLabelText('Product')).toHaveValue('42')
    const splitSection = await screen.findByRole('group', {
      name: 'Stakeholder Split',
    })
    expect(within(splitSection).getAllByLabelText('Stakeholder')[0]).toHaveValue(
      '10',
    )
    expect(within(splitSection).getAllByLabelText('Stakeholder')[1]).toHaveValue(
      '11',
    )
    expect(
      within(splitSection).getByText('Total allocation: 100%'),
    ).toBeVisible()
    expect(getJson).toHaveBeenCalledWith('/project-stakeholders/projects/77')

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith('/projects/77', {
        adminCost: 2250.5,
        idProduct: 42,
        isActive: true,
        productionCost: 7500.25,
        unitCost: 1000000,
        units: 10,
      })
      expect(putJson).toHaveBeenCalledWith(
        '/project-stakeholders/projects/77',
        [
          { idStakeholder: 10, stakePercentage: 60 },
          { idStakeholder: 11, stakePercentage: 40 },
        ],
      )
    })
    expect(postJson).not.toHaveBeenCalled()
  })

  it('shows the projects a stakeholder is involved in on the stakeholder edit form', async () => {
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/stakeholders/10') {
        return {
          idStakeholder: 10,
          name: 'Alicia',
          projects: [
            {
              idProject: 77,
              project: {
                idProject: 77,
                product: { id: 42, name: 'Maple Shelf' },
              },
              stakePercentage: 60,
            },
          ],
        }
      }

      throw new Error(`Unexpected path: ${path}`)
    })

    renderEntityEditPage('/stakeholders/10', '/:entityName/:id')

    expect(await screen.findByDisplayValue('Alicia')).toBeVisible()
    const participationSection = screen.getByRole('region', {
      name: 'Project Participation',
    })
    expect(
      within(participationSection).getByText('Project #77 - Maple Shelf'),
    ).toBeVisible()
    expect(within(participationSection).getByText('60%')).toBeVisible()
  })
})
