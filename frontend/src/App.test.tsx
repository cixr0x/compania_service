import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getJson } from './api/client'
import App from './App'

vi.mock('./api/client', () => ({
  getJson: vi.fn(),
}))

function LocationProbe() {
  const location = useLocation()
  return <div data-testid="location">{location.pathname}</div>
}

function renderApp(initialEntry = '/') {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })

  vi.mocked(getJson).mockImplementation((path: string) => {
    if (
      path === '/products?pageSize=100' ||
      path === '/projects?pageSize=100' ||
      path === '/stakeholders?pageSize=100' ||
      path === '/sales?pageSize=100'
    ) {
      return Promise.resolve([])
    }

    return Promise.reject(new Error(`Unexpected GET ${path}`))
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('App', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('uses the dashboard as the index route instead of redirecting to products', async () => {
    renderApp('/')

    expect(
      await screen.findByText('Boardgame operations & investment management'),
    ).toBeVisible()
    expect(screen.getByTestId('location')).toHaveTextContent('/')
  })
})
