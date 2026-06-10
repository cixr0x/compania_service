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
import { getJson, putJson } from '../../api/client'
import { StakeholderProjectTransactionLines } from './StakeholderProjectTransactionLines'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
  putJson: vi.fn(),
}))

function renderStakeholderProjectTransactionLines() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  render(
    <QueryClientProvider client={queryClient}>
      <StakeholderProjectTransactionLines
        projectId={501}
        stakeholderId={10}
        stakeholderName="Alicia"
      />
    </QueryClientProvider>,
  )
}

function getTableBodyDescriptions(table: HTMLElement) {
  return within(table)
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[1].textContent)
}

describe('StakeholderProjectTransactionLines', () => {
  beforeEach(() => {
    vi.mocked(getJson).mockResolvedValue([])
    vi.mocked(putJson).mockImplementation(async (_path, body) => body)
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('loads stakeholder project transactions as a static row table', async () => {
    vi.mocked(getJson).mockResolvedValue([
      {
        amount: 125.5,
        date: '2026-05-05T00:00:00.000Z',
        description: 'Distribution',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 99,
      },
    ])

    renderStakeholderProjectTransactionLines()

    const section = await screen.findByRole('region', {
      name: 'Stakeholder Transactions',
    })
    expect(section).toHaveClass('stakeholder-transactions-card')
    expect(getJson).toHaveBeenCalledWith(
      '/stakeholder-project-transactions/projects/501/stakeholders/10',
    )
    expect(
      await within(section).findByRole('table', {
        name: 'Alicia transaction details',
      }),
    ).toBeVisible()
    expect(within(section).getByText('2026-05-05')).toBeVisible()
    expect(within(section).getByText('$125.50')).toBeVisible()
    expect(within(section).getByText('Distribution')).toBeVisible()
    expect(within(section).queryByLabelText('Date')).not.toBeInTheDocument()
    expect(
      within(section).getByRole('button', { name: 'Edit row 1' }),
    ).toBeVisible()
  })

  it('adds a transaction in edit mode and persists it on row save', async () => {
    const user = userEvent.setup()
    vi.mocked(putJson).mockResolvedValue([
      {
        amount: 250,
        date: '2026-05-06',
        description: 'Capital return',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 100,
      },
    ])

    renderStakeholderProjectTransactionLines()

    const section = await screen.findByRole('region', {
      name: 'Stakeholder Transactions',
    })
    await within(section).findByRole('button', { name: 'Add transaction' })
    await user.click(
      within(section).getByRole('button', { name: 'Add transaction' }),
    )
    fireEvent.change(within(section).getByLabelText('Date'), {
      target: { value: '2026-05-06' },
    })
    fireEvent.change(within(section).getByLabelText('Amount'), {
      target: { value: '250.00' },
    })
    fireEvent.change(within(section).getByLabelText('Description'), {
      target: { value: 'Capital return' },
    })
    await user.click(within(section).getByRole('button', { name: 'Save row 1' }))

    await waitFor(() => {
      expect(putJson).toHaveBeenCalledWith(
        '/stakeholder-project-transactions/projects/501/stakeholders/10',
        [{ amount: 250, date: '2026-05-06', description: 'Capital return' }],
      )
    })
    expect(within(section).queryByLabelText('Amount')).not.toBeInTheDocument()
    expect(await within(section).findByText('Capital return')).toBeVisible()
    expect(within(section).getByText('$250.00')).toBeVisible()
  })

  it('keeps transactions ordered by date ascending after a row is saved', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      {
        amount: 125.5,
        date: '2026-05-10',
        description: 'Later transaction',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 99,
      },
    ])

    renderStakeholderProjectTransactionLines()

    const section = await screen.findByRole('region', {
      name: 'Stakeholder Transactions',
    })
    const table = await within(section).findByRole('table', {
      name: 'Alicia transaction details',
    })
    await within(section).findByText('Later transaction')
    await user.click(
      within(section).getByRole('button', { name: 'Add transaction' }),
    )
    fireEvent.change(within(section).getByLabelText('Date'), {
      target: { value: '2026-05-01' },
    })
    fireEvent.change(within(section).getByLabelText('Amount'), {
      target: { value: '50.00' },
    })
    fireEvent.change(within(section).getByLabelText('Description'), {
      target: { value: 'Earlier transaction' },
    })
    await user.click(within(section).getByRole('button', { name: 'Save row 2' }))

    await waitFor(() => {
      expect(getTableBodyDescriptions(table)).toEqual([
        'Earlier transaction',
        'Later transaction',
      ])
    })
  })

  it('keeps focus in the edited row input while typing', async () => {
    const user = userEvent.setup()

    renderStakeholderProjectTransactionLines()

    const section = await screen.findByRole('region', {
      name: 'Stakeholder Transactions',
    })
    await within(section).findByRole('button', { name: 'Add transaction' })
    await user.click(
      within(section).getByRole('button', { name: 'Add transaction' }),
    )

    const descriptionInput = within(section).getByLabelText('Description')
    await user.click(descriptionInput)
    await user.keyboard('Capital return')

    expect(within(section).getByLabelText('Description')).toHaveFocus()
    expect(within(section).getByLabelText('Description')).toHaveValue(
      'Capital return',
    )
  })

  it('cancels row edits without persisting changes', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      {
        amount: 125.5,
        date: '2026-05-05',
        description: 'Distribution',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 99,
      },
    ])

    renderStakeholderProjectTransactionLines()

    const section = await screen.findByRole('region', {
      name: 'Stakeholder Transactions',
    })
    await within(section).findByText('Distribution')
    await user.click(within(section).getByRole('button', { name: 'Edit row 1' }))
    fireEvent.change(within(section).getByLabelText('Date'), {
      target: { value: '2026-05-07' },
    })
    fireEvent.change(within(section).getByLabelText('Amount'), {
      target: { value: '500.00' },
    })
    fireEvent.change(within(section).getByLabelText('Description'), {
      target: { value: 'Updated distribution' },
    })
    await user.click(
      within(section).getByRole('button', { name: 'Cancel row 1' }),
    )

    expect(putJson).not.toHaveBeenCalled()
    expect(within(section).getByText('2026-05-05')).toBeVisible()
    expect(within(section).getByText('$125.50')).toBeVisible()
    expect(within(section).getByText('Distribution')).toBeVisible()
    expect(within(section).queryByText('Updated distribution')).not.toBeInTheDocument()
  })

  it('persists row removal immediately', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      {
        amount: 125.5,
        date: '2026-05-05',
        description: 'Distribution',
        idProject: 501,
        idStakeholder: 10,
        idStakeholderProjectTransaction: 99,
      },
    ])
    vi.mocked(putJson).mockResolvedValue([])

    renderStakeholderProjectTransactionLines()

    const section = await screen.findByRole('region', {
      name: 'Stakeholder Transactions',
    })
    await within(section).findByText('Distribution')
    await user.click(
      within(section).getByRole('button', { name: 'Remove row 1' }),
    )

    await waitFor(() => {
      expect(putJson).toHaveBeenCalledWith(
        '/stakeholder-project-transactions/projects/501/stakeholders/10',
        [],
      )
    })
    expect(
      within(section).getByText('No stakeholder transactions have been recorded yet.'),
    ).toBeVisible()
  })
})
