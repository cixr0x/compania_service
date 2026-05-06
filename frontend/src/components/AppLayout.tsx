import {
  AppstoreOutlined,
  BarChartOutlined,
  DollarOutlined,
  ImportOutlined,
  MenuOutlined,
  ProjectOutlined,
  TagsOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { Button, Drawer, Layout, Menu, Tag, Typography } from 'antd'
import type { MenuProps } from 'antd'
import { useState } from 'react'
import type { ReactNode } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'

type NavigationItem = {
  label: string
  path: string
  icon: ReactNode
}

const navigationItems: NavigationItem[] = [
  { label: 'Products', path: '/products', icon: <AppstoreOutlined /> },
  { label: 'Models', path: '/models', icon: <TagsOutlined /> },
  { label: 'Projects', path: '/projects', icon: <ProjectOutlined /> },
  { label: 'Stakeholders', path: '/stakeholders', icon: <TeamOutlined /> },
  { label: 'Sales', path: '/sales', icon: <DollarOutlined /> },
  { label: 'Sales Imports', path: '/imports', icon: <ImportOutlined /> },
  {
    label: 'Sales Report',
    path: '/reports/sales',
    icon: <BarChartOutlined />,
  },
]

export function AppLayout() {
  const location = useLocation()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const selectedPath =
    navigationItems.find(
      (item) =>
        location.pathname === item.path ||
        location.pathname.startsWith(`${item.path}/`),
    )?.path ?? '/products'
  const menuItems: MenuProps['items'] = navigationItems.map((item) => ({
    icon: item.icon,
    key: item.path,
    label: (
      <NavLink onClick={() => setIsMobileMenuOpen(false)} to={item.path}>
        {item.label}
      </NavLink>
    ),
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

  return (
    <Layout className="app-shell">
      <Layout.Sider className="app-sider" theme="dark" width={256}>
        <div className="brand-block" aria-label="Compania Service">
          <div className="brand-mark" aria-hidden="true">CS</div>
          <div>
            <Typography.Text className="brand-name">Compania Service</Typography.Text>
            <Typography.Text className="brand-context">Operations Admin</Typography.Text>
          </div>
        </div>

        {renderNavigationMenu()}
      </Layout.Sider>

      <Layout className="content-frame">
        <Layout.Header className="topbar">
          <div className="topbar-title-group">
            <Button
              aria-label="Open navigation"
              className="mobile-menu-button"
              icon={<MenuOutlined />}
              onClick={() => setIsMobileMenuOpen(true)}
              type="text"
            />
            <div className="topbar-title-copy">
              <Typography.Text className="eyebrow">Admin Console</Typography.Text>
              <Typography.Title level={1}>Commercial Operations</Typography.Title>
            </div>
          </div>
          <Tag color="blue">MVP</Tag>
        </Layout.Header>

        <Layout.Content className="page-content">
          <Outlet />
        </Layout.Content>
      </Layout>

      <Drawer
        className="mobile-navigation-drawer"
        onClose={() => setIsMobileMenuOpen(false)}
        open={isMobileMenuOpen}
        placement="left"
        title="Primary navigation"
        width={280}
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
