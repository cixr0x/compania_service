import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { AppLayout } from './AppLayout'

describe('AppLayout', () => {
  afterEach(() => {
    cleanup()
  })

  it('renders primary navigation with Ant Design menu semantics', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="projects" element={<div>Projects page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(
      screen.getByRole('menu', { name: 'Primary navigation' }),
    ).toBeVisible()
  })

  it('does not render the old admin console commercial operations header', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="projects" element={<div>Projects page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.queryByText('Admin Console')).not.toBeInTheDocument()
    expect(screen.queryByText('Commercial Operations')).not.toBeInTheDocument()
  })

  it('groups primary navigation into admin, catalog, and reports sections', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="projects" element={<div>Projects page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    const menu = screen.getByRole('menu', { name: 'Primary navigation' })
    expect(within(menu).getByText('Admin')).toBeVisible()
    expect(within(menu).getByText('Catalog')).toBeVisible()
    expect(within(menu).getByText('Reports')).toBeVisible()
    expect(
      within(menu).getAllByRole('link').map((link) => link.textContent),
    ).toEqual([
      'Models',
      'Settings',
      'Products',
      'Projects',
      'Stakeholders',
      'Sales',
      'Sales Imports',
      'Sales Report',
      'Stakeholder Projects',
    ])
  })

  it('keeps project stakeholder splits out of the primary navigation', () => {
    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="projects" element={<div>Projects page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'href',
      '/projects',
    )
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings',
    )
    expect(
      screen.queryByRole('link', { name: 'Project Stakeholders' }),
    ).not.toBeInTheDocument()
  })

  it('opens primary navigation in a controlled drawer from the mobile menu trigger', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/" element={<AppLayout />}>
            <Route path="projects" element={<div>Projects page</div>} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    const mobileMenuButton = screen.getByRole('button', {
      name: 'Open navigation',
    })

    expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'false')
    expect(mobileMenuButton).toHaveAttribute(
      'aria-controls',
      'mobile-primary-navigation',
    )

    await user.click(mobileMenuButton)

    const drawer = screen.getByRole('dialog', { name: 'Primary navigation' })
    expect(drawer).toBeVisible()
    expect(mobileMenuButton).toHaveAttribute('aria-expanded', 'true')
    expect(
      within(drawer).getByRole('link', { name: 'Sales Report' }),
    ).toHaveAttribute('href', '/reports/sales')
    expect(
      within(drawer).getByRole('link', { name: 'Stakeholder Projects' }),
    ).toHaveAttribute('href', '/reports/stakeholder-projects')
  })
})
