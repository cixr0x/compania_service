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

async function selectAntOption(
  user: ReturnType<typeof userEvent.setup>,
  combobox: HTMLElement,
  optionName: string,
) {
  await user.click(combobox)
  await clickAntOptionByTitle(user, optionName)
}

async function clickAntOptionByTitle(
  user: ReturnType<typeof userEvent.setup>,
  optionName: string,
) {
  const options = await screen.findAllByTitle(optionName)
  await user.click(options[options.length - 1])
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
    await selectAntOption(
      user,
      await screen.findByRole('combobox', { name: 'Model' }),
      'Furniture',
    )
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

    expect(nameInput).toBeRequired()
    expect(nameInput).not.toHaveAccessibleDescription()
    expect(screen.getByLabelText(/image url/i)).not.toHaveAccessibleDescription()
    expect(
      screen.getByLabelText(/owner-retained profit/i),
    ).not.toHaveAccessibleDescription()
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

    const modelSelect = await screen.findByRole('combobox', { name: 'Model' })
    expect(modelSelect.closest('.ant-select')).toBeInTheDocument()

    await user.click(modelSelect)
    expect(await screen.findByTitle('Furniture')).toBeInTheDocument()
    expect(screen.getByTitle('Lighting')).toBeInTheDocument()
    expect(screen.queryByTitle('7')).not.toBeInTheDocument()

    await clickAntOptionByTitle(user, 'Furniture')
    await user.type(screen.getByLabelText('Name'), 'Maple Shelf')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith(
        '/products',
        expect.objectContaining({ idModel: 7, name: 'Maple Shelf' }),
      )
    })
  })

  it('requires a model when creating a product', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      { idModel: 7, name: 'Furniture', description: 'Furniture model' },
    ])

    renderEntityEditPage('/products/new', '/:entityName/:id')

    const modelSelect = await screen.findByRole('combobox', { name: 'Model' })
    expect(modelSelect).toHaveAttribute('aria-required', 'true')
    expect(
      within(
        screen.getByRole('group', { name: 'Commercial attributes' }),
      ).queryByText('Required'),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Model').closest('label')).toHaveClass(
      'ant-form-item-required',
    )

    await user.type(screen.getByLabelText('Name'), 'Maple Shelf')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(postJson).not.toHaveBeenCalled()
    expect(screen.getByText('Model is required.')).toBeVisible()
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

  it('requires confirmation before deleting an existing product', async () => {
    const user = userEvent.setup()
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
    vi.mocked(deleteJson).mockResolvedValue({})

    renderEntityEditPage('/products/101', '/:entityName/:id')

    expect(await screen.findByDisplayValue('Walnut Desk')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(deleteJson).not.toHaveBeenCalled()
    expect(screen.queryByText('List page')).not.toBeInTheDocument()
    expect(
      screen.getByText('Delete this record? This action cannot be undone.'),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm delete' }))

    await waitFor(() => {
      expect(deleteJson).toHaveBeenCalledWith('/products/101')
      expect(screen.getByText('List page')).toBeVisible()
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
          tax: 9.75,
        }
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(patchJson).mockResolvedValue({ idSale: 20 })

    renderEntityEditPage('/sales/20', '/:entityName/:id')

    expect(await screen.findByLabelText('Date')).toHaveValue('2026-05-04')
    expect(screen.getByLabelText('Amount')).toHaveValue('125.50')
    expect(screen.getByLabelText('Fee')).toHaveValue('3.50')
    expect(screen.getByLabelText('Tax')).toHaveValue('9.75')
    expect(screen.getByLabelText('Tax')).toHaveAttribute('readonly')
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
    expect(vi.mocked(patchJson).mock.calls[0]?.[1]).not.toHaveProperty('tax')
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

    const productSelect = await screen.findByRole('combobox', {
      name: 'Product',
    })
    expect(productSelect.closest('.ant-select')).toBeInTheDocument()
    expect(productSelect).toHaveAttribute('aria-required', 'true')

    await user.click(productSelect)
    expect(await screen.findByTitle('Walnut Desk')).toBeInTheDocument()
    expect(screen.getByTitle('Maple Shelf')).toBeInTheDocument()
    await clickAntOptionByTitle(user, 'Walnut Desk')

    const projectSelect = await screen.findByRole('combobox', {
      name: 'Project',
    })
    expect(projectSelect.closest('.ant-select')).toBeInTheDocument()
    expect(projectSelect).toHaveAttribute('aria-required', 'true')

    await user.click(projectSelect)
    expect(await screen.findByTitle('Project #501 - Walnut Desk')).toBeInTheDocument()
    expect(screen.getByTitle('Project #502 - Maple Shelf')).toBeInTheDocument()
    await clickAntOptionByTitle(user, 'Project #501 - Walnut Desk')

    await user.type(screen.getByLabelText('Date'), '2026-05-05')
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.type(screen.getByLabelText('Amount'), '1,000,000.00')
    await user.type(screen.getByLabelText('Fee'), '1,250.50')
    expect(screen.getByLabelText('Tax')).toHaveValue('0.00')
    expect(screen.getByLabelText('Tax')).toHaveAttribute('readonly')
    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Source' }),
      'Store',
    )
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
    expect(vi.mocked(postJson).mock.calls[0]?.[1]).not.toHaveProperty('tax')
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

    const productSelect = await screen.findByRole('combobox', {
      name: 'Product',
    })
    expect(productSelect.closest('.ant-select')).toBeInTheDocument()

    await user.click(productSelect)
    expect(await screen.findByTitle('Maple Shelf')).toBeInTheDocument()
    expect(screen.getByTitle('Walnut Desk')).toBeInTheDocument()
    expect(screen.queryByTitle('42')).not.toBeInTheDocument()
    await clickAntOptionByTitle(user, 'Maple Shelf')
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

    const productSelect = await screen.findByRole('combobox', {
      name: 'Product',
    })
    expect(productSelect.closest('.ant-select')).toBeInTheDocument()
    const totalCostInput = screen.getByLabelText('Total Cost')
    expect(totalCostInput).toHaveValue('0.00')
    expect(totalCostInput).toHaveAttribute('readonly')

    await selectAntOption(user, productSelect, 'Maple Shelf')
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
      ['sales', 'tax'],
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

  it('renders sales source as the import-source select with numeric constraints', async () => {
    const user = userEvent.setup()

    renderEntityEditPage('/sales/new', '/:entityName/:id')

    expect(screen.getByRole('heading', { name: 'Create Sale' })).toBeVisible()

    const sourceSelect = screen.getByRole('combobox', { name: 'Source' })
    expect(sourceSelect.closest('.ant-select')).toBeInTheDocument()
    await user.click(sourceSelect)
    expect(await screen.findByTitle('Ecommerce')).toBeInTheDocument()
    expect(screen.getByTitle('Store')).toBeInTheDocument()
    expect(screen.getByTitle('Event')).toBeInTheDocument()
    expect(screen.getByTitle('Surface')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('step', '1')
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('min', '1')
    expect(screen.getByLabelText('Amount')).not.toHaveAccessibleDescription()
    expect(screen.getAllByText('$')).toHaveLength(3)
  })

  it('does not configure field helper descriptions for entity forms', () => {
    for (const [entityName, config] of Object.entries(entityConfigs)) {
      for (const field of config.fields) {
        expect(
          field,
          `${entityName}.${field.name} should not render helper text`,
        ).not.toHaveProperty('helperText')
      }
    }
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

    const productSelect = await screen.findByRole('combobox', {
      name: 'Product',
    })
    await selectAntOption(user, productSelect, 'Maple Shelf')
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
    const stakeholderSelect = within(splitSection).getByRole('combobox', {
      name: 'Stakeholder',
    })
    expect(stakeholderSelect.closest('.ant-select')).toBeInTheDocument()
    expect(stakeholderSelect).not.toHaveAccessibleDescription()
    expect(
      within(splitSection).queryByRole('button', { name: /remove row/i }),
    ).not.toBeInTheDocument()
    expect(
      within(splitSection).getByText(/total must equal 100%/i),
    ).toBeVisible()

    await selectAntOption(user, stakeholderSelect, 'Alicia')
    await user.type(
      within(splitSection).getAllByLabelText('Stake Percentage')[0],
      '60',
    )

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(postJson).not.toHaveBeenCalled()
    expect(putJson).not.toHaveBeenCalled()
    expect(
      within(splitSection).getByText('Total stake percentage must equal 100%.'),
    ).toBeVisible()

    await user.click(
      within(splitSection).getByRole('button', { name: 'Add stakeholder' }),
    )
    await selectAntOption(
      user,
      within(splitSection).getAllByRole('combobox', {
        name: 'Stakeholder',
      })[1],
      'Bruno',
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

    expect(
      (await screen.findByRole('combobox', { name: 'Product' })).closest(
        '.ant-select',
      ),
    ).toHaveTextContent('Maple Shelf')
    const splitSection = await screen.findByRole('group', {
      name: 'Stakeholder Split',
    })
    const stakeholderSelects = within(splitSection).getAllByRole('combobox', {
      name: 'Stakeholder',
    })
    expect(stakeholderSelects[0].closest('.ant-select')).toHaveTextContent(
      'Alicia',
    )
    expect(stakeholderSelects[1].closest('.ant-select')).toHaveTextContent(
      'Bruno',
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
    const participationTable = within(participationSection).getByRole('table')
    expect(
      within(participationTable).getByRole('columnheader', { name: 'Project' }),
    ).toBeVisible()
    expect(
      within(participationTable).getByRole('columnheader', {
        name: 'Stake %',
      }),
    ).toBeVisible()
    expect(within(participationTable).getByText('Maple Shelf')).toBeVisible()
    expect(
      within(participationTable).queryByText('Project #77 - Maple Shelf'),
    ).not.toBeInTheDocument()
    expect(within(participationTable).getByText('60%')).toBeVisible()
  })
})
