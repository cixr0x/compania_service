import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJson } from '../../api/client'
import { EntityListPage } from './EntityListPage'

vi.mock('../../api/client', () => ({
  getJson: vi.fn(),
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderProductsList() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/products']}>
        <Routes>
          <Route path="/:entityName" element={<EntityListPage />} />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('EntityListPage', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('links Products create action to the new product route', async () => {
    vi.mocked(getJson).mockResolvedValue([
      { id: 101, name: 'Walnut Desk', tag: 'office' },
    ])

    renderProductsList()

    expect(await screen.findByRole('heading', { name: 'Products' })).toBeVisible()
    expect(screen.getByRole('link', { name: /create/i })).toHaveAttribute(
      'href',
      '/products/new',
    )
  })

  it('navigates to a product edit route when a row is double-clicked', async () => {
    const user = userEvent.setup()
    vi.mocked(getJson).mockResolvedValue([
      { id: 101, name: 'Walnut Desk', tag: 'office' },
    ])

    renderProductsList()

    await user.dblClick(
      (await screen.findByText('Walnut Desk')).closest('tr')!,
    )

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('/products/101')
    })
  })
})
