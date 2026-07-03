import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AxiosError, type AxiosResponse } from 'axios'
import {
  cleanup,
  fireEvent,
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

vi.mock('../../api/client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../api/client')>()

  return {
    ...actual,
    deleteJson: vi.fn(),
    getJson: vi.fn(),
    patchJson: vi.fn(),
    postJson: vi.fn(),
    putJson: vi.fn(),
  }
})

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
    vi.mocked(getJson).mockResolvedValue([])
    vi.mocked(postJson).mockResolvedValue({ id: 102 })

    renderEntityEditPage('/products/new', '/:entityName/:id')

    expect(
      screen.getByRole('heading', { name: 'Create Product' }),
    ).toBeVisible()
    expect(screen.queryByText('Workspace')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /delete/i }),
    ).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Name'), 'Maple Shelf')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith(
        '/products',
        expect.objectContaining({ name: 'Maple Shelf' }),
      )
    })
    expect(patchJson).not.toHaveBeenCalled()
    expect(deleteJson).not.toHaveBeenCalled()
    expect(getJson).not.toHaveBeenCalledWith('/models')
  })

  it('shows backend validation details when a save request returns 400', async () => {
    const user = userEvent.setup()
    const response = {
      data: {
        errors: [
          { field: 'name', message: 'name must not be empty' },
          { field: 'ownership', message: 'ownership must be a number' },
        ],
        message: 'Validation failed',
      },
      status: 400,
      statusText: 'Bad Request',
    } as AxiosResponse
    const error = new AxiosError(
      'Request failed with status code 400',
      'ERR_BAD_REQUEST',
      undefined,
      undefined,
      response,
    )
    vi.mocked(postJson).mockRejectedValue(error)

    renderEntityEditPage('/products/new', '/:entityName/:id')

    await user.type(screen.getByLabelText('Name'), 'Maple Shelf')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    const alert = await screen.findByRole('alert')

    expect(alert).toHaveTextContent('Validation failed')
    expect(alert).toHaveTextContent('name: name must not be empty')
    expect(alert).toHaveTextContent('ownership: ownership must be a number')
    expect(alert).not.toHaveTextContent('Request failed with status code 400')
  })

  it('uses form Cancel to return to the list without saving', async () => {
    const user = userEvent.setup()

    renderEntityEditPage('/products/new', '/:entityName/:id')

    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(await screen.findByText('List page')).toBeVisible()
    expect(postJson).not.toHaveBeenCalled()
    expect(patchJson).not.toHaveBeenCalled()
    expect(deleteJson).not.toHaveBeenCalled()
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

  it('does not expose legacy product model selection', async () => {
    renderEntityEditPage('/products/new', '/:entityName/:id')

    expect(screen.queryByRole('combobox', { name: 'Model' })).not.toBeInTheDocument()
    expect(getJson).not.toHaveBeenCalledWith('/models')
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
        idStore: 'ST-101',
        idSurface: 'SF-101',
        image: 'desk.png',
        name: 'Walnut Desk',
        ownership: 50,
        tag: 'office',
      })
    })
  })

  it('saves cleared optional text fields as empty strings on update', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/models') {
        return [{ idModel: 7, name: 'Furniture' }]
      }

      if (path === '/products/101') {
        return {
          id: 101,
          description: 'Standing desk',
          idEcommerce: null,
          idEvent: null,
          idModel: 7,
          idStore: null,
          idSurface: null,
          image: 'desk.png',
          model: { idModel: 7, name: 'Furniture' },
          name: 'Walnut Desk',
          ownership: 50,
          tag: null,
        }
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(patchJson).mockResolvedValue({ id: 101 })

    renderEntityEditPage('/products/101', '/:entityName/:id')

    expect(await screen.findByDisplayValue('Standing desk')).toBeVisible()
    await user.clear(screen.getByLabelText('Description'))
    await user.clear(screen.getByLabelText('Image URL'))
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith(
        '/products/101',
        expect.objectContaining({
          description: '',
          image: '',
        }),
      )
    })
    const payload = vi.mocked(patchJson).mock.calls[0]?.[1]
    expect(payload).not.toHaveProperty('idEcommerce')
    expect(payload).not.toHaveProperty('idStore')
    expect(payload).not.toHaveProperty('idEvent')
    expect(payload).not.toHaveProperty('idSurface')
    expect(payload).not.toHaveProperty('tag')
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
        return [{ id: 101, name: 'Walnut Desk', ownership: 25 }]
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
    expect(screen.queryByLabelText('Tax')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Profit')).toHaveValue('122.00')
    expect(screen.getByLabelText('Profit')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Owner Profit')).toHaveValue('30.50')
    expect(screen.getByLabelText('Owner Profit')).toHaveAttribute('readonly')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith('/sales/20', {
        amount: 125.5,
        date: '2026-05-04',
        fee: 3.5,
        feeOverride: false,
        idProduct: 101,
        idProject: 501,
        ownerProfit: 30.5,
        profit: 122,
        quantity: 2,
        source: 'store',
      })
    })
  })

  it('auto assigns and disables the sale project when the selected product has one project', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [
          {
            id: 101,
            name: 'Walnut Desk',
            ownership: 25,
          },
          { id: 102, name: 'Maple Shelf', ownership: 50 },
        ]
      }

      if (path === '/projects') {
        return [
          {
            feeModel: 'fixed',
            feeValue: 625.25,
            idProject: 501,
            idProduct: 101,
            isActive: false,
            product: { id: 101, name: 'Walnut Desk' },
          },
          {
            feeModel: 'percentage',
            feeValue: 10,
            idProject: 503,
            idProduct: 102,
            isActive: false,
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
    expect(projectSelect.closest('.ant-select')).toHaveClass(
      'ant-select-disabled',
    )
    expect(projectSelect).toHaveAttribute('aria-required', 'true')
    expect(projectSelect.closest('.ant-select')).toHaveTextContent(
      'Project #501 - Walnut Desk',
    )

    await user.type(screen.getByLabelText('Date'), '2026-05-05')
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.type(screen.getByLabelText('Amount'), '1,000,000.00')
    expect(screen.getByLabelText('Override Fee')).not.toBeChecked()
    expect(screen.getByLabelText('Fee')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('Fee')).toHaveValue('1,250.50')
    expect(screen.queryByLabelText('Tax')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Profit')).toHaveValue('998,749.50')
    expect(screen.getByLabelText('Owner Profit')).toHaveValue('249,687.38')
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
        feeOverride: false,
        idProduct: 101,
        idProject: 501,
        ownerProfit: 249687.38,
        profit: 998749.5,
        quantity: 2,
        source: 'store',
      })
    })
    expect(getJson).toHaveBeenCalledWith('/products')
    expect(getJson).toHaveBeenCalledWith('/projects')
  })

  it('requires selecting a sale project when the selected product has multiple projects', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [
          {
            id: 101,
            name: 'Walnut Desk',
            ownership: 25,
          },
          { id: 102, name: 'Maple Shelf', ownership: 50 },
        ]
      }

      if (path === '/projects') {
        return [
          {
            feeModel: 'percentage',
            feeValue: 18,
            idProject: 501,
            idProduct: 101,
            product: { id: 101, name: 'Walnut Desk' },
          },
          {
            feeModel: 'percentage',
            feeValue: 10,
            idProject: 502,
            idProduct: 101,
            product: { id: 101, name: 'Walnut Desk' },
          },
          {
            feeModel: 'fixed',
            feeValue: 625.25,
            idProject: 503,
            idProduct: 102,
            product: { id: 102, name: 'Maple Shelf' },
          },
        ]
      }

      throw new Error(`Unexpected path: ${path}`)
    })

    renderEntityEditPage('/sales/new', '/:entityName/:id')

    await selectAntOption(
      user,
      await screen.findByRole('combobox', { name: 'Product' }),
      'Walnut Desk',
    )
    const projectSelect = screen.getByRole('combobox', { name: 'Project' })
    expect(projectSelect.closest('.ant-select')).not.toHaveClass(
      'ant-select-disabled',
    )

    await user.click(projectSelect)
    expect(await screen.findByTitle('Project #501 - Walnut Desk')).toBeInTheDocument()
    expect(screen.getByTitle('Project #502 - Walnut Desk')).toBeInTheDocument()
    expect(screen.queryByTitle('Project #503 - Maple Shelf')).not.toBeInTheDocument()

    await clickAntOptionByTitle(user, 'Project #502 - Walnut Desk')
  })

  it('allows a manual sale fee only when override fee is enabled', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [
          {
            id: 101,
            name: 'Internal Desk',
            ownership: 25,
          },
        ]
      }

      if (path === '/projects') {
        return [
          {
            feeModel: 'percentage',
            feeValue: 10,
            idProject: 501,
            idProduct: 101,
            isActive: true,
            product: { id: 101, name: 'Internal Desk' },
          },
        ]
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(postJson).mockResolvedValue({ idSale: 31 })

    renderEntityEditPage('/sales/new', '/:entityName/:id')

    await selectAntOption(
      user,
      await screen.findByRole('combobox', { name: 'Product' }),
      'Internal Desk',
    )
    await user.type(screen.getByLabelText('Date'), '2026-05-05')
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.type(screen.getByLabelText('Amount'), '100')

    const feeInput = screen.getByLabelText('Fee')
    expect(feeInput).toHaveAttribute('readonly')
    expect(feeInput).toHaveValue('10.00')

    await user.click(screen.getByLabelText('Override Fee'))
    expect(feeInput).not.toHaveAttribute('readonly')
    await user.click(feeInput)
    await user.keyboard('3.25')
    await user.clear(screen.getByLabelText('Amount'))
    await user.type(screen.getByLabelText('Amount'), '200')

    expect(feeInput).toHaveValue('3.25')
    expect(screen.getByLabelText('Profit')).toHaveValue('196.75')

    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Source' }),
      'Store',
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/sales', {
        amount: 200,
        date: '2026-05-05',
        fee: 3.25,
        feeOverride: true,
        idProduct: 101,
        idProject: 501,
        ownerProfit: 49.19,
        profit: 196.75,
        quantity: 2,
        source: 'store',
      })
    })
  })

  it('calculates configured sale percentage fees from the sale amount', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [
          {
            id: 101,
            name: 'Brick Shelf',
            ownership: 25,
          },
        ]
      }

      if (path === '/projects') {
        return [
          {
            feeModel: 'percentage',
            feeValue: 18,
            idProject: 501,
            idProduct: 101,
            isActive: true,
            product: { id: 101, name: 'Brick Shelf' },
            transactions: [
              { amount: 100 },
              { amount: 20 },
              { amount: -10 },
            ],
          },
        ]
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(postJson).mockResolvedValue({ idSale: 32 })

    renderEntityEditPage('/sales/new', '/:entityName/:id')

    await selectAntOption(
      user,
      await screen.findByRole('combobox', { name: 'Product' }),
      'Brick Shelf',
    )
    await user.type(screen.getByLabelText('Date'), '2026-05-05')
    await user.type(screen.getByLabelText('Quantity'), '2')
    await user.type(screen.getByLabelText('Amount'), '100')

    expect(screen.getByLabelText('Fee')).toHaveValue('18.00')
    expect(screen.getByLabelText('Profit')).toHaveValue('82.00')
    expect(screen.getByLabelText('Owner Profit')).toHaveValue('20.50')

    await selectAntOption(
      user,
      screen.getByRole('combobox', { name: 'Source' }),
      'Store',
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/sales', {
        amount: 100,
        date: '2026-05-05',
        fee: 18,
        feeOverride: false,
        idProduct: 101,
        idProject: 501,
        ownerProfit: 20.5,
        profit: 82,
        quantity: 2,
        source: 'store',
      })
    })
  })

  it('renders project product choices by product name and saves the selected product id', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [
          { id: 42, name: 'Maple Shelf' },
          { id: 43, name: 'Walnut Desk' },
        ]
      }

      if (path === '/stakeholders?pageSize=100') {
        return []
      }

      throw new Error(`Unexpected path: ${path}`)
    })
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
    expect(screen.getByLabelText('Name')).toBeVisible()
    await user.type(screen.getByLabelText('Name'), 'Wholesale launch')
    expect(screen.getByRole('combobox', { name: 'Fee Model' })).toHaveAttribute(
      'aria-required',
      'true',
    )
    await user.type(screen.getByLabelText('Percentage Fee'), '18')
    expect(screen.getByLabelText('Active')).toBeChecked()
    await user.type(screen.getByLabelText('Units'), '10')
    await user.type(screen.getByLabelText('Unit Cost'), '1,000,000.00')
    expect(screen.queryByLabelText('Production Cost')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Admin Cost')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Cost Adjustment')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/projects', {
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        isActive: true,
        name: 'Wholesale launch',
        unitCost: 1000000,
        units: 10,
      })
    })
  })

  it('renders project Fee Model controls when creating a project', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [{ id: 42, name: 'Maple Shelf' }]
      }

      if (path === '/stakeholders?pageSize=100') {
        return []
      }

      throw new Error(`Unexpected path: ${path}`)
    })

    renderEntityEditPage('/projects/new', '/:entityName/:id')

    const feeModelSelect = await screen.findByRole('combobox', { name: 'Fee Model' })
    expect(feeModelSelect).toHaveAttribute('aria-required', 'true')
    expect(feeModelSelect.closest('.ant-select')).toHaveTextContent('Percentage fee')
    expect(screen.getByLabelText('Percentage Fee')).toBeVisible()

    await user.click(feeModelSelect)
    expect(await screen.findByTitle('Fixed fee per unit')).toBeInTheDocument()
  })

  it('creates a project without requiring unit cost', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [{ id: 42, name: 'Maple Shelf' }]
      }

      if (path === '/stakeholders?pageSize=100') {
        return []
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(postJson).mockResolvedValue({ idProject: 501 })

    renderEntityEditPage('/projects/new', '/:entityName/:id')

    await selectAntOption(
      user,
      await screen.findByRole('combobox', { name: 'Product' }),
      'Maple Shelf',
    )
    await user.type(screen.getByLabelText('Percentage Fee'), '18')
    await user.type(screen.getByLabelText('Units'), '10')

    expect(screen.getByLabelText('Unit Cost')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/projects', {
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        isActive: true,
        units: 10,
      })
    })
  })

  it('saves project cost transactions after creating the project and sums them for total cost', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [{ id: 42, name: 'Maple Shelf' }]
      }

      if (path === '/stakeholders?pageSize=100') {
        return []
      }

      throw new Error(`Unexpected path: ${path}`)
    })
    vi.mocked(postJson).mockResolvedValue({ idProject: 501 })
    vi.mocked(putJson).mockResolvedValue([
      {
        amount: 7500.25,
        date: '2026-05-05',
        description: 'Production run',
        idProject: 501,
        idProjectTransaction: 10,
      },
      {
        amount: 2250.5,
        date: '2026-05-06',
        description: 'Administration',
        idProject: 501,
        idProjectTransaction: 11,
      },
      {
        amount: -250.75,
        date: '2026-05-07',
        description: 'Supplier credit',
        idProject: 501,
        idProjectTransaction: 12,
      },
    ])

    renderEntityEditPage('/projects/new', '/:entityName/:id')

    const productSelect = await screen.findByRole('combobox', {
      name: 'Product',
    })
    expect(productSelect.closest('.ant-select')).toBeInTheDocument()
    expect(screen.getByLabelText('Total Cost')).toBeVisible()
    expect(screen.queryByLabelText('Production Cost')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Admin Cost')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Cost Adjustment')).not.toBeInTheDocument()

    await selectAntOption(user, productSelect, 'Maple Shelf')
    await user.type(screen.getByLabelText('Percentage Fee'), '18')
    const totalCostInput = screen.getByLabelText('Total Cost')
    expect(totalCostInput).toHaveValue('0.00')
    expect(totalCostInput).toHaveAttribute('readonly')
    const costSection = screen.getByRole('group', {
      name: 'Project Cost Transactions',
    })
    await user.click(
      within(costSection).getByRole('button', { name: 'Add transaction' }),
    )
    fireEvent.change(within(costSection).getByLabelText('Date'), {
      target: { value: '2026-05-05' },
    })
    fireEvent.change(within(costSection).getByLabelText('Amount'), {
      target: { value: '7,500.25' },
    })
    fireEvent.change(within(costSection).getByLabelText('Description'), {
      target: { value: 'Production run' },
    })
    await user.click(
      within(costSection).getByRole('button', { name: 'Save row 1' }),
    )
    await user.click(
      within(costSection).getByRole('button', { name: 'Add transaction' }),
    )
    fireEvent.change(within(costSection).getByLabelText('Date'), {
      target: { value: '2026-05-06' },
    })
    fireEvent.change(within(costSection).getByLabelText('Amount'), {
      target: { value: '2,250.50' },
    })
    fireEvent.change(within(costSection).getByLabelText('Description'), {
      target: { value: 'Administration' },
    })
    await user.click(
      within(costSection).getByRole('button', { name: 'Save row 2' }),
    )
    await user.click(
      within(costSection).getByRole('button', { name: 'Add transaction' }),
    )
    fireEvent.change(within(costSection).getByLabelText('Date'), {
      target: { value: '2026-05-07' },
    })
    fireEvent.change(within(costSection).getByLabelText('Amount'), {
      target: { value: '-250.75' },
    })
    fireEvent.change(within(costSection).getByLabelText('Description'), {
      target: { value: 'Supplier credit' },
    })
    await user.click(
      within(costSection).getByRole('button', { name: 'Save row 3' }),
    )

    expect(totalCostInput).toHaveValue('9,500.00')

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/projects', {
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        isActive: true,
      })
      expect(putJson).toHaveBeenCalledWith(
        '/project-transactions/projects/501',
        [
          { amount: 7500.25, date: '2026-05-05', description: 'Production run' },
          { amount: 2250.5, date: '2026-05-06', description: 'Administration' },
          { amount: -250.75, date: '2026-05-07', description: 'Supplier credit' },
        ],
      )
    })
    expect(vi.mocked(postJson).mock.calls[0]?.[1]).not.toHaveProperty(
      'totalCost',
    )
  }, 15000)

  it('preloads project cost transactions and recalculates total cost while editing lines', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [{ id: 42, name: 'Maple Shelf' }]
      }

      if (path === '/stakeholders?pageSize=100') {
        return []
      }

      if (path === '/projects/77') {
        return {
          feeModel: 'percentage',
          feeValue: 18,
          idProduct: 42,
          idProject: 77,
          isActive: true,
          unitCost: 10,
          units: 100,
        }
      }

      if (path === '/project-transactions/projects/77') {
        return [
          {
            amount: 7500,
            date: '2026-05-05',
            description: 'Production run',
            idProject: 77,
            idProjectTransaction: 100,
          },
          {
            amount: 250,
            date: '2026-05-06',
            description: 'Administration',
            idProject: 77,
            idProjectTransaction: 101,
          },
          {
            amount: -500,
            date: '2026-05-07',
            description: 'Launch discount',
            idProject: 77,
            idProjectTransaction: 102,
          },
        ]
      }

      if (path === '/project-stakeholders/projects/77') {
        return []
      }

      throw new Error(`Unexpected path: ${path}`)
    })

    renderEntityEditPage('/projects/77', '/:entityName/:id')

    const totalCostInput = await screen.findByLabelText('Total Cost')
    const realUnitCostInput = await screen.findByLabelText('Real Unit Cost')
    await waitFor(() => {
      expect(totalCostInput).toHaveValue('7,250.00')
      expect(realUnitCostInput).toHaveValue('72.50')
    })
    expect(screen.queryByLabelText('Adjustment Description')).not.toBeInTheDocument()
    const costSection = await screen.findByRole('group', {
      name: 'Project Cost Transactions',
    })
    expect(within(costSection).getByText('Production run')).toBeVisible()
    expect(within(costSection).getByText('2026-05-05')).toBeVisible()
    expect(within(costSection).getByText('Launch discount')).toBeVisible()
    expect(within(costSection).queryByLabelText('Amount')).not.toBeInTheDocument()

    await user.click(
      within(costSection).getByRole('button', { name: 'Remove row 3' }),
    )

    expect(totalCostInput).toHaveValue('7,750.00')
    expect(realUnitCostInput).toHaveValue('77.50')
  })

  it('configures every money field and money table column for currency formatting', () => {
    const moneyFields: Array<[EntityName, string]> = [
      ['projects', 'unitCost'],
      ['projects', 'totalCost'],
      ['sales', 'amount'],
      ['sales', 'fee'],
      ['sales', 'profit'],
      ['sales', 'ownerProfit'],
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

    for (const deprecatedField of [
      'productionCost',
      'adminCost',
      'costAdjustment',
    ]) {
      expect(
        entityConfigs.projects.fields.find(
          (candidate) => candidate.name === deprecatedField,
        ),
      ).toBeUndefined()
      expect(
        entityConfigs.projects.columns.find(
          (candidate) => candidate.key === deprecatedField,
        ),
      ).toBeUndefined()
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
    expect(screen.getAllByText('$')).toHaveLength(4)
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

  it('creates settings with code, name, description, and value fields', async () => {
    const user = userEvent.setup()
    vi.mocked(postJson).mockResolvedValue({ id: 1 })

    renderEntityEditPage('/settings/new', '/:entityName/:id')

    expect(screen.getByRole('heading', { name: 'Create Setting' })).toBeVisible()
    await user.type(screen.getByLabelText('Code'), 'default_margin')
    await user.type(screen.getByLabelText('Name'), 'Default Margin')
    await user.type(
      screen.getByLabelText('Description'),
      'Default margin used by future sale calculations',
    )
    await user.type(screen.getByLabelText('Value'), '16')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/settings', {
        code: 'default_margin',
        name: 'Default Margin',
        description: 'Default margin used by future sale calculations',
        value: '16',
      })
    })
  })

  it('does not configure the removed models edit page', async () => {
    renderEntityEditPage('/models/new', '/:entityName/:id')

    expect(screen.getByRole('heading', { name: 'Unknown Entity' })).toBeVisible()
    expect(postJson).not.toHaveBeenCalled()
  })

  it('configures every foreign key form field as a select', () => {
    const foreignKeyFields: Array<[EntityName, string]> = [
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
          { id: 42, name: 'Maple Shelf' },
          { id: 43, name: 'Walnut Desk' },
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
    await user.type(screen.getByLabelText('Percentage Fee'), '18')
    await user.type(screen.getByLabelText('Units'), '10')
    await user.type(screen.getByLabelText('Unit Cost'), '1,000,000.00')

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
      within(splitSection).getByRole('button', { name: 'Save row 1' }),
    ).toBeVisible()
    expect(
      within(splitSection).getByRole('button', { name: 'Cancel row 1' }),
    ).toBeVisible()
    expect(
      within(splitSection).getByText(/total must equal 100%/i),
    ).toBeVisible()

    await selectAntOption(user, stakeholderSelect, 'Alicia')
    await user.type(
      within(splitSection).getAllByLabelText('Stake Percentage')[0],
      '60',
    )
    await user.click(
      within(splitSection).getByRole('button', { name: 'Save row 1' }),
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
      within(splitSection).getByRole('combobox', {
        name: 'Stakeholder',
      }),
      'Bruno',
    )
    await user.type(
      within(splitSection).getByLabelText('Stake Percentage'),
      '40',
    )
    await user.click(
      within(splitSection).getByRole('button', { name: 'Save row 2' }),
    )

    expect(
      within(splitSection).getByText('Total allocation: 100%'),
    ).toBeVisible()

    await user.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(postJson).toHaveBeenCalledWith('/projects', {
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        isActive: true,
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
  }, 15000)

  it('preloads an existing stakeholder split in the project edit form and saves all rows for that project', async () => {
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/products') {
        return [{ id: 42, name: 'Maple Shelf' }]
      }

      if (path === '/stakeholders?pageSize=100') {
        return [
          { idStakeholder: 10, name: 'Alicia' },
          { idStakeholder: 11, name: 'Bruno' },
        ]
      }

      if (path === '/projects/77') {
        return {
          feeModel: 'percentage',
          feeValue: 18,
          idProduct: 42,
          idProject: 77,
          isActive: true,
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

      if (path === '/project-transactions/projects/77') {
        return []
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
    expect(
      within(splitSection).getByRole('row', { name: /Alicia 60%/i }),
    ).toBeVisible()
    expect(
      within(splitSection).getByRole('row', { name: /Bruno 40%/i }),
    ).toBeVisible()
    expect(
      within(splitSection).queryByRole('combobox', { name: 'Stakeholder' }),
    ).not.toBeInTheDocument()
    expect(
      within(splitSection).getAllByRole('button', { name: /Edit row/i }),
    ).toHaveLength(2)
    expect(
      within(splitSection).getByText('Total allocation: 100%'),
    ).toBeVisible()
    expect(getJson).toHaveBeenCalledWith('/project-stakeholders/projects/77')

    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    await waitFor(() => {
      expect(patchJson).toHaveBeenCalledWith('/projects/77', {
        feeModel: 'percentage',
        feeValue: 18,
        idProduct: 42,
        isActive: true,
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
  }, 15000)

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
                product: {
                  id: 42,
                  image: 'https://example.test/maple-shelf.jpg',
                  name: 'Maple Shelf',
                },
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
      within(participationTable).getByRole('img', {
        name: 'Maple Shelf thumbnail',
      }),
    ).toHaveAttribute('src', 'https://example.test/maple-shelf.jpg')
    expect(
      within(participationTable).queryByText('Project #77 - Maple Shelf'),
    ).not.toBeInTheDocument()
    expect(within(participationTable).getByText('60%')).toBeVisible()
  })
})
