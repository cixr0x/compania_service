import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getJson } from '../../api/client'
import { ProjectTransactionLines } from './ProjectTransactionLines'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
}))

function renderProjectTransactionLines(
  props: Partial<Parameters<typeof ProjectTransactionLines>[0]> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const onDraftChange = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <ProjectTransactionLines
        isCreate
        onDraftChange={onDraftChange}
        projectId={null}
        {...props}
      />
    </QueryClientProvider>,
  )

  return { onDraftChange }
}

describe('ProjectTransactionLines', () => {
  beforeEach(() => {
    vi.mocked(getJson).mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders loaded rows as a compact static table until a row is edited', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        amount: 7500,
        date: '2026-05-05T00:00:00.000Z',
        description: 'Production run',
        idProject: 77,
        idProjectTransaction: 100,
      },
    ])

    renderProjectTransactionLines({ isCreate: false, projectId: 77 })

    const section = await screen.findByRole('group', {
      name: 'Project Cost Transactions',
    })
    await within(section).findByText('Production run')
    expect(within(section).getByText('2026-05-05')).toBeVisible()
    expect(within(section).getByText('$7,500.00')).toBeVisible()
    expect(within(section).getByText('Production run')).toBeVisible()
    expect(within(section).queryByLabelText('Date')).not.toBeInTheDocument()
    expect(within(section).queryByLabelText('Amount')).not.toBeInTheDocument()
    expect(within(section).queryByLabelText('Description')).not.toBeInTheDocument()
    expect(
      within(section).getByRole('button', { name: 'Edit row 1' }),
    ).toBeVisible()
  })

  it('orders project cost transaction columns as date, description, amount, and actions', async () => {
    renderProjectTransactionLines()

    const section = await screen.findByRole('group', {
      name: 'Project Cost Transactions',
    })

    expect(
      within(section)
        .getAllByRole('columnheader')
        .map((header) => header.textContent?.trim()),
    ).toEqual(['Date', 'Description', 'Amount', 'Actions'])
  })

  it('adds a transaction in edit mode and commits it to the draft after saving the row', async () => {
    const user = userEvent.setup()
    const { onDraftChange } = renderProjectTransactionLines()

    const section = await screen.findByRole('group', {
      name: 'Project Cost Transactions',
    })

    await user.click(
      within(section).getByRole('button', { name: 'Add transaction' }),
    )
    expect(within(section).getByLabelText('Amount')).toHaveValue('')
    expect(within(section).getByLabelText('Date')).toHaveAttribute(
      'type',
      'date',
    )
    expect(
      within(section).getByRole('button', { name: 'Save row 1' }),
    ).toBeVisible()

    fireEvent.change(within(section).getByLabelText('Date'), {
      target: { value: '2026-05-05' },
    })
    fireEvent.change(within(section).getByLabelText('Amount'), {
      target: { value: '7,500.25' },
    })
    fireEvent.change(within(section).getByLabelText('Description'), {
      target: { value: 'Production run' },
    })
    await user.click(within(section).getByRole('button', { name: 'Save row 1' }))

    expect(within(section).queryByLabelText('Amount')).not.toBeInTheDocument()
    expect(within(section).getByText('2026-05-05')).toBeVisible()
    expect(within(section).getByText('$7,500.25')).toBeVisible()
    expect(within(section).getByText('Production run')).toBeVisible()

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenLastCalledWith({
        errorMessage: null,
        isDirty: true,
        isValid: true,
        rows: [
          { amount: 7500.25, date: '2026-05-05', description: 'Production run' },
        ],
        totalCost: 7500.25,
      })
    })
  })

  it('cancels row edits without changing the saved transaction draft', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      {
        amount: 7500,
        date: '2026-05-05',
        description: 'Production run',
        idProject: 77,
        idProjectTransaction: 100,
      },
    ])

    renderProjectTransactionLines({ isCreate: false, projectId: 77 })

    const section = await screen.findByRole('group', {
      name: 'Project Cost Transactions',
    })
    await within(section).findByText('Production run')
    await user.click(within(section).getByRole('button', { name: 'Edit row 1' }))
    fireEvent.change(within(section).getByLabelText('Date'), {
      target: { value: '2026-05-07' },
    })
    fireEvent.change(within(section).getByLabelText('Amount'), {
      target: { value: '9,000.00' },
    })
    fireEvent.change(within(section).getByLabelText('Description'), {
      target: { value: 'Updated run' },
    })
    await user.click(
      within(section).getByRole('button', { name: 'Cancel row 1' }),
    )

    expect(within(section).getByText('2026-05-05')).toBeVisible()
    expect(within(section).getByText('$7,500.00')).toBeVisible()
    expect(within(section).getByText('Production run')).toBeVisible()
    expect(within(section).queryByText('2026-05-07')).not.toBeInTheDocument()
    expect(within(section).queryByText('$9,000.00')).not.toBeInTheDocument()
    expect(within(section).queryByText('Updated run')).not.toBeInTheDocument()
  })
})
