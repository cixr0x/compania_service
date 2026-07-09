import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getJson } from '../../api/client'
import { ProjectStakeholderLines } from './ProjectStakeholderLines'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
}))

const stakeholderRows = [
  { idStakeholder: 10, name: 'Alicia' },
  { idStakeholder: 11, name: 'Bruno' },
]

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
      <MemoryRouter>
        <ProjectStakeholderLines
          isCreate
          onDraftChange={onDraftChange}
          projectId={null}
          totalProjectCost={0}
          {...props}
        />
      </MemoryRouter>
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
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/stakeholders?pageSize=100') {
        return stakeholderRows
      }

      return []
    })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('calls onDraftChange with a valid clean empty state initially', async () => {
    const { onDraftChange } = renderProjectStakeholderLines()

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenCalledWith({
        errorMessage: null,
        hasRows: false,
        isDirty: false,
        isValid: true,
        rows: [],
      })
    })
  })

  it('adds a stakeholder row in edit mode and blocks project save until row edits are saved or canceled', async () => {
    const { onDraftChange } = renderProjectStakeholderLines()

    await addStakeholderRow()

    const stakeholderSelect = screen.getByRole('combobox', {
      name: 'Stakeholder',
    })
    const percentageInput = screen.getByRole('spinbutton', {
      name: 'Stake Percentage',
    })

    expect(stakeholderSelect.closest('.ant-select')).toBeInTheDocument()
    expect(percentageInput.closest('.ant-input-number')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Save row 1' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Cancel row 1' })).toBeVisible()

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenLastCalledWith({
        errorMessage: 'Save or cancel stakeholder row edits before saving the project.',
        hasRows: true,
        isDirty: false,
        isValid: false,
        rows: [],
      })
    })
  })

  it('saves a complete row into static display and reports a valid payload when the total equals 100', async () => {
    const user = userEvent.setup()
    const { onDraftChange } = renderProjectStakeholderLines()

    await addStakeholderRow()
    await selectStakeholder('Alicia')
    await user.type(
      screen.getByRole('spinbutton', { name: 'Stake Percentage' }),
      '100',
    )
    await user.click(screen.getByRole('button', { name: 'Save row 1' }))

    expect(screen.getByText('Alicia')).toBeVisible()
    expect(screen.getByText('100%')).toBeVisible()
    expect(
      screen.queryByRole('combobox', { name: 'Stakeholder' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit row 1' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Remove row 1' })).toBeVisible()

    await waitFor(() => {
      expect(onDraftChange).toHaveBeenLastCalledWith({
        errorMessage: null,
        hasRows: true,
        isDirty: true,
        isValid: true,
        rows: [{ idStakeholder: 10, stakePercentage: 100 }],
      })
    })
    expect(screen.getByText('Total allocation: 100%')).toBeVisible()
  })

  it('shows the proportional stake amount as a read-only calculated column', async () => {
    const user = userEvent.setup()

    renderProjectStakeholderLines({ totalProjectCost: 1000 })

    await addStakeholderRow()
    await selectStakeholder('Alicia')
    await user.type(
      screen.getByRole('spinbutton', { name: 'Stake Percentage' }),
      '60',
    )

    expect(
      screen.getByRole('columnheader', { name: 'Stake Amount' }),
    ).toBeVisible()
    expect(screen.getByLabelText('Stake Amount')).toHaveTextContent('$600.00')
    expect(
      screen.queryByRole('spinbutton', { name: 'Stake Amount' }),
    ).not.toBeInTheDocument()
  })

  it('keeps existing rows static until edit and cancel reverts row changes', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockImplementation(async (path) => {
      if (path === '/stakeholders?pageSize=100') {
        return stakeholderRows
      }

      if (path === '/project-stakeholders/projects/77') {
        return [
          {
            idProjectStakeholder: 501,
            idStakeholder: 10,
            stakePercentage: 60,
          },
        ]
      }

      return []
    })

    renderProjectStakeholderLines({
      isCreate: false,
      projectId: 77,
      totalProjectCost: 7250,
    })

    const splitSection = await screen.findByRole('group', {
      name: 'Stakeholder Split',
    })
    const dataRow = await within(splitSection).findByRole('row', {
      name: /Alicia 60%/i,
    })

    expect(within(dataRow).getByText('Alicia')).toBeVisible()
    expect(within(dataRow).getByText('60%')).toBeVisible()
    expect(within(dataRow).getByText('$4,350.00')).toBeVisible()
    expect(
      within(splitSection).queryByRole('combobox', { name: 'Stakeholder' }),
    ).not.toBeInTheDocument()

    await user.click(within(splitSection).getByRole('button', { name: 'Edit row 1' }))
    await selectStakeholder('Bruno')
    await user.clear(
      within(splitSection).getByRole('spinbutton', {
        name: 'Stake Percentage',
      }),
    )
    await user.type(
      within(splitSection).getByRole('spinbutton', {
        name: 'Stake Percentage',
      }),
      '40',
    )
    await user.click(
      within(splitSection).getByRole('button', { name: 'Cancel row 1' }),
    )

    const revertedRow = within(splitSection).getByRole('row', {
      name: /Alicia 60%/i,
    })
    expect(within(revertedRow).getByText('Alicia')).toBeVisible()
    expect(within(revertedRow).getByText('60%')).toBeVisible()
    expect(
      within(splitSection).queryByRole('combobox', { name: 'Stakeholder' }),
    ).not.toBeInTheDocument()
  })

  it('removes the final saved row and reports a dirty empty split', async () => {
    const user = userEvent.setup()
    const { onDraftChange } = renderProjectStakeholderLines()

    await addStakeholderRow()
    await selectStakeholder('Alicia')
    await user.type(
      screen.getByRole('spinbutton', { name: 'Stake Percentage' }),
      '100',
    )
    await user.click(screen.getByRole('button', { name: 'Save row 1' }))
    await user.click(screen.getByRole('button', { name: 'Remove row 1' }))

    expect(
      screen.getByText('No stakeholders have been added to this project.'),
    ).toBeVisible()
    await waitFor(() => {
      expect(onDraftChange).toHaveBeenLastCalledWith({
        errorMessage: null,
        hasRows: false,
        isDirty: true,
        isValid: true,
        rows: [],
      })
    })
  })
})
