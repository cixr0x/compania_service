import {
  Boxes,
  BriefcaseBusiness,
  CircleDollarSign,
  DatabaseZap,
  Handshake,
  Layers3,
  UsersRound,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink, Outlet } from 'react-router-dom'

type NavigationItem = {
  label: string
  path: string
  icon: LucideIcon
}

const navigationItems: NavigationItem[] = [
  { label: 'Products', path: '/products', icon: Boxes },
  { label: 'Models', path: '/models', icon: Layers3 },
  { label: 'Projects', path: '/projects', icon: BriefcaseBusiness },
  { label: 'Stakeholders', path: '/stakeholders', icon: UsersRound },
  {
    label: 'Project Stakeholders',
    path: '/project-stakeholders',
    icon: Handshake,
  },
  { label: 'Sales', path: '/sales', icon: CircleDollarSign },
  { label: 'Sales Imports', path: '/imports', icon: DatabaseZap },
]

export function AppLayout() {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <div className="brand-mark" aria-hidden="true">
            CS
          </div>
          <div>
            <p className="brand-name">Compania Service</p>
            <p className="brand-context">Operations Admin</p>
          </div>
        </div>

        <nav className="nav-list">
          {navigationItems.map((item) => {
            const Icon = item.icon

            return (
              <NavLink
                className={({ isActive }) =>
                  isActive ? 'nav-link is-active' : 'nav-link'
                }
                key={item.path}
                to={item.path}
              >
                <Icon aria-hidden="true" size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>

      <div className="content-frame">
        <header className="topbar">
          <div>
            <p className="eyebrow">Admin Console</p>
            <h1>Commercial Operations</h1>
          </div>
          <div className="environment-pill">MVP</div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
