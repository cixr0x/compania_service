import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { EntityForm } from './EntityForm'
import type { EntityConfig } from '../features/entities/entityConfigs'

const baseConfig: EntityConfig = {
  columns: [],
  fields: [
    {
      label: 'Status',
      name: 'status',
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
      ],
      requiredOnCreate: true,
      type: 'select',
    },
    {
      label: 'Quantity',
      min: 1,
      name: 'quantity',
      step: 1,
      type: 'number',
    },
    {
      label: 'Amount',
      name: 'amount',
      prefix: '$',
      type: 'number',
      valueFormat: 'money',
    },
    {
      label: 'Image preview',
      name: 'imagePreview',
      previewAltField: 'name',
      previewSourceField: 'image',
      type: 'imagePreview',
    },
  ],
  idField: 'id',
  path: 'products',
  singularTitle: 'Product',
  title: 'Products',
}

function renderEntityForm(
  props: Partial<Parameters<typeof EntityForm>[0]> = {},
) {
  return render(
    <EntityForm
      config={baseConfig}
      isCreate
      onChange={vi.fn()}
      onSubmit={vi.fn()}
      values={{
        amount: 1000000,
        image: 'https://example.test/one.jpg',
        name: 'Catalog item',
        quantity: 3,
        status: '',
      }}
      {...props}
    />,
  )
}

describe('EntityForm', () => {
  afterEach(() => {
    cleanup()
  })

  it('shows a loading and disabled save button while saving', () => {
    renderEntityForm({ isSaving: true })

    const saveButton = screen.getByRole('button', { name: /saving/i })

    expect(saveButton).toBeDisabled()
    expect(saveButton).toHaveClass('ant-btn-loading')
  })

  it('renders an error message as an Ant Design alert', () => {
    renderEntityForm({ errorMessage: 'Unable to save this product.' })

    const alert = screen.getByRole('alert')

    expect(alert).toHaveTextContent('Unable to save this product.')
    expect(alert).toHaveClass('ant-alert-error')
  })

  it('renders a required Ant Design select field and sends selected string values', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderEntityForm({ onChange })

    expect(screen.getByText('Status')).toBeVisible()
    expect(screen.queryByText('Required')).not.toBeInTheDocument()

    const statusSelect = screen.getByRole('combobox', { name: 'Status' })

    expect(statusSelect.closest('.ant-select')).toBeInTheDocument()
    expect(screen.getByText('Status').closest('label')).toHaveClass(
      'ant-form-item-required',
    )
    expect(statusSelect).toHaveAttribute('aria-required', 'true')
    expect(screen.getAllByRole('combobox', { name: 'Status' })).toHaveLength(1)

    await user.click(statusSelect)
    await user.click(screen.getByTitle('Draft'))

    expect(onChange).toHaveBeenCalledWith('status', 'draft')
  })

  it('blocks submit and marks a required Ant Design select when empty', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    renderEntityForm({ onSubmit })

    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(onSubmit).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveAttribute(
      'aria-required',
      'true',
    )
    expect(screen.getByText('Status is required.')).toBeVisible()
  })

  it('renders non-money number fields with Ant Design InputNumber', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    renderEntityForm({ onChange })

    const quantityInput = screen.getByRole('spinbutton', { name: 'Quantity' })

    expect(quantityInput.closest('.ant-input-number')).toBeInTheDocument()
    expect(quantityInput).toHaveAttribute('aria-valuemin', '1')

    await user.clear(quantityInput)
    await user.type(quantityInput, '12')

    expect(onChange).toHaveBeenLastCalledWith('quantity', '12')
  })

  it('keeps money fields as text inputs with comma formatting when blurred', async () => {
    const user = userEvent.setup()
    renderEntityForm()

    const amountInput = screen.getByLabelText('Amount')

    expect(amountInput).toHaveAttribute('type', 'text')
    expect(amountInput).toHaveValue('1,000,000.00')
    await user.click(amountInput)
    expect(amountInput).toHaveValue('1000000')
    await user.tab()
    expect(amountInput).toHaveValue('1,000,000.00')
  })

  it('updates the image preview when the image value changes through rerender', () => {
    const { rerender } = renderEntityForm()

    expect(
      screen.getByRole('img', { name: 'Catalog item image preview' }),
    ).toHaveAttribute('src', 'https://example.test/one.jpg')

    rerender(
      <EntityForm
        config={baseConfig}
        isCreate
        onChange={vi.fn()}
        onSubmit={vi.fn()}
        values={{
          amount: 1000000,
          image: 'https://example.test/two.jpg',
          name: 'Catalog item',
          quantity: 3,
          status: '',
        }}
      />,
    )

    expect(
      screen.getByRole('img', { name: 'Catalog item image preview' }),
    ).toHaveAttribute('src', 'https://example.test/two.jpg')
  })
})
