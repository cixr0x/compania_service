import { cleanup, render, screen } from '@testing-library/react'
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
    expect(
      screen.queryByRole('link', { name: 'Project Stakeholders' }),
    ).not.toBeInTheDocument()
  })
})
