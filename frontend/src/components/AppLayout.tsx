import {
  AppstoreOutlined,
  BarChartOutlined,
  BellOutlined,
  DashboardOutlined,
  DownOutlined,
  DollarOutlined,
  ImportOutlined,
  MenuOutlined,
  ProjectOutlined,
  SettingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { Avatar, Button, Drawer, Dropdown, Layout, Menu, Space, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

type NavigationItem = {
  label: string
  path: string
  icon: ReactNode
}

type NavigationSection = {
  label: string
  items: NavigationItem[]
}

const navigationSections: NavigationSection[] = [
  {
    label: 'Catalog',
    items: [
      { label: 'Products', path: '/products', icon: <AppstoreOutlined /> },
      { label: 'Projects', path: '/projects', icon: <ProjectOutlined /> },
      { label: 'Stakeholders', path: '/stakeholders', icon: <TeamOutlined /> },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Sales', path: '/sales', icon: <DollarOutlined /> },
      { label: 'Sales Imports', path: '/imports', icon: <ImportOutlined /> },
    ],
  },
  {
    label: 'Reports',
    items: [
      {
        label: 'Sales Report',
        path: '/reports/sales',
        icon: <BarChartOutlined />,
      },
      {
        label: 'Stakeholder Projects',
        path: '/reports/stakeholder-projects',
        icon: <ProjectOutlined />,
      },
    ],
  },
  {
    label: 'Admin',
    items: [
      { label: 'Settings', path: '/settings', icon: <SettingOutlined /> },
    ],
  },
]
const navigationItems = navigationSections.flatMap((section) => section.items)
const mobileNavigationId = 'mobile-primary-navigation'
const groupIcons: Record<string, ReactNode> = {
  Admin: <SettingOutlined />,
  Catalog: <AppstoreOutlined />,
  Reports: <BarChartOutlined />,
  Sales: <ShoppingCartOutlined />,
}

export function AppLayout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const selectedPath =
    navigationItems.find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`),
    )?.path ?? ''
  const activeSection = navigationSections.find((section) =>
    section.items.some((item) => item.path === selectedPath),
  )
  const menuItems: MenuProps['items'] = navigationSections.map((section) => ({
    children: section.items.map((item) => ({
      icon: item.icon,
      key: item.path,
      label: (
        <NavLink onClick={() => setIsMobileMenuOpen(false)} to={item.path}>
          {item.label}
        </NavLink>
      ),
    })),
    key: section.label,
    label: section.label,
    type: 'group',
  }))
  const renderNavigationMenu = () => (
    <Menu
      aria-label="Primary navigation"
      items={menuItems}
      mode="inline"
      selectedKeys={[selectedPath]}
      theme="dark"
    />
  )
  const renderDesktopNavigation = () => (
    <nav aria-label="Primary navigation" className="top-nav-groups">
      {navigationSections.map((section) => {
        const isActive = activeSection?.label === section.label
        const dropdownItems: MenuProps['items'] = section.items.map((item) => ({
          icon: item.icon,
          key: item.path,
          label: <NavLink to={item.path}>{item.label}</NavLink>,
        }))

        return (
          <Dropdown
            key={section.label}
            menu={{
              items: dropdownItems,
              selectedKeys: [selectedPath],
            }}
            placement="bottomLeft"
            trigger={['click']}
          >
            <Button
              className={`top-nav-trigger${isActive ? ' top-nav-trigger-active' : ''}`}
              icon={groupIcons[section.label]}
              type="text"
            >
              <span>{section.label}</span>
              <DownOutlined className="top-nav-chevron" />
            </Button>
          </Dropdown>
        )
      })}
    </nav>
  )

  return (
    <Layout className="app-shell top-app-shell">
      <Layout.Header className="top-app-header">
        <NavLink className="top-brand" to="/">
          <div className="brand-mark" aria-hidden="true">
            <DashboardOutlined />
          </div>
          <div className="top-brand-copy">
            <Typography.Text className="brand-name">Compania Service</Typography.Text>
            <Typography.Text className="brand-context">Operations Admin</Typography.Text>
          </div>
        </NavLink>

        <div className="top-nav-divider" aria-hidden="true" />

        {renderDesktopNavigation()}

        <Space className="top-nav-actions" size={8}>
          <Button
            aria-label="Notifications"
            className="top-icon-button"
            icon={<BellOutlined />}
            type="text"
          />
          <Avatar className="top-user-avatar" icon={<UserOutlined />} />
        </Space>

        <Button
          aria-controls={mobileNavigationId}
          aria-expanded={isMobileMenuOpen}
          aria-label="Open navigation"
          className="top-nav-mobile-button"
          icon={<MenuOutlined />}
          onClick={() => setIsMobileMenuOpen(true)}
          type="text"
        />
      </Layout.Header>

      <Layout.Content className="page-content top-page-content">
        <Outlet />
      </Layout.Content>

      <Drawer
        className="mobile-navigation-drawer"
        id={mobileNavigationId}
        onClose={() => setIsMobileMenuOpen(false)}
        open={isMobileMenuOpen}
        placement="left"
        size={280}
        title="Primary navigation"
      >
        <div className="drawer-brand-block" aria-label="Compania Service">
          <div className="brand-mark" aria-hidden="true">CS</div>
          <div>
            <Typography.Text className="brand-name">Compania Service</Typography.Text>
            <Typography.Text className="brand-context">Operations Admin</Typography.Text>
          </div>
        </div>
        {renderNavigationMenu()}
      </Drawer>
    </Layout>
  )
}
