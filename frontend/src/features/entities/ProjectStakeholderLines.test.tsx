import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getJson } from '../../api/client'
import { ProjectStakeholderLines } from './ProjectStakeholderLines'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
}))

function renderProjectStakeholderLines(
  props: Partial<Parameters<typeof ProjectStakeholderLines>[0]> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  const onDraftChange = vi.fn()

  render(
    <QueryClientProvider client={queryClient}>
      <ProjectStakeholderLines
        isCreate
        onDraftChange={onDraftChange}
        projectId={null}
        {...props}
      />
    </QueryClientProvider>,
  )

  return { onDraftChange }
}

async function addStakeholderRow() {
  await userEvent.click(
    await screen.findByRole('button', { name: 'Add stakeholder' }),
  )
}

async function selectStakeholder(name: string, index = 0) {
  const user = userEvent.setup()
  const stakeholderSelects = screen.getAllByRole('combobox', {
    name: 'Stakeholder',
  })

  await user.click(stakeholderSelects[index])
  const options = await screen.findAllByTitle(name)
  await user.click(options[options.length - 1])
}

describe('ProjectStakeholderLines', () => {
  beforeEach(() => {
    vi.mocked(getJson).mockResolvedValue([
      { idStakeholder: 10, name: 'Alicia' },
      { idStakeholder: 11, name: 'Bruno' },
    ])
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('calls onDraftChange with a valid empty state initially', async () => {
    const { onDraftChange } = renderProjectStakeholderLines()

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenCalledWith({
        errorMessage: null,
        hasRows: false,
        isValid: true,
        rows: [],
      })
    })
  })

  it('renders Ant Design Select and InputNumber controls after adding a stakeholder row', async () => {
    renderProjectStakeholderLines()

    await addStakeholderRow()

    const stakeholderSelect = screen.getByRole('combobox', {
      name: 'Stakeholder',
    })
    const percentageInput = screen.getByRole('spinbutton', {
      name: 'Stake Percentage',
    })

    expect(stakeholderSelect.closest('.ant-select')).toBeInTheDocument()
    expect(percentageInput.closest('.ant-input-number')).toBeInTheDocument()
  })

  it('reports an invalid draft state when the total is not 100', async () => {
    const user = userEvent.setup()
    const { onDraftChange } = renderProjectStakeholderLines()

    await addStakeholderRow()
    await selectStakeholder('Alicia')
    await user.type(
      screen.getByRole('spinbutton', { name: 'Stake Percentage' }),
      '60',
    )

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenLastCalledWith({
        errorMessage: 'Total stake percentage must equal 100%.',
        hasRows: true,
        isValid: false,
        rows: [{ idStakeholder: 10, stakePercentage: 60 }],
      })
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Total stake percentage must equal 100%.',
    )
  })

  it('reports a valid payload when the total equals 100', async () => {
    const user = userEvent.setup()
    const { onDraftChange } = renderProjectStakeholderLines()

    await addStakeholderRow()
    await selectStakeholder('Alicia')
    await user.type(
      screen.getByRole('spinbutton', { name: 'Stake Percentage' }),
      '60',
    )
    await addStakeholderRow()
    await selectStakeholder('Bruno', 1)
    await user.type(
      screen.getAllByRole('spinbutton', { name: 'Stake Percentage' })[1],
      '40',
    )

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenLastCalledWith({
        errorMessage: null,
        hasRows: true,
        isValid: true,
        rows: [
          { idStakeholder: 10, stakePercentage: 60 },
          { idStakeholder: 11, stakePercentage: 40 },
        ],
      })
    })
    expect(screen.getByText('Total allocation: 100%')).toBeVisible()
  })

  it('removes rows but does not offer removal for the final remaining row', async () => {
    renderProjectStakeholderLines()

    await addStakeholderRow()
    await addStakeholderRow()

    const splitSection = screen.getByRole('group', {
      name: 'Stakeholder Split',
    })
    expect(
      within(splitSection).getAllByRole('button', { name: /remove row/i }),
    ).toHaveLength(2)

    await userEvent.click(
      within(splitSection).getByRole('button', { name: 'Remove row 1' }),
    )

    expect(
      within(splitSection).getAllByRole('combobox', { name: 'Stakeholder' }),
    ).toHaveLength(1)
    expect(
      within(splitSection).queryByRole('button', { name: /remove row/i }),
    ).not.toBeInTheDocument()
  })
})
