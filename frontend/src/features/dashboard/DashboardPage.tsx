import {
  AppstoreOutlined,
  ArrowRightOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DollarOutlined,
  ImportOutlined,
  ProjectOutlined,
  RiseOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Alert, Avatar, Card, Col, Empty, Progress, Row, Skeleton, Space, Tag, Typography } from 'antd'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { getJson } from '../../api/client'
import type { Product, Project, Sale, Stakeholder } from '../../api/types'
import { formatCurrency, parseMoneyNumber } from '../../utils/money'

const DASHBOARD_PAGE_SIZE = 100
const dashboardDateFormatter = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
  year: 'numeric',
})

function getNumber(value: unknown) {
  return parseMoneyNumber(value) ?? 0
}

function getProductName(product?: Product | null) {
  return product?.name?.trim() || '-'
}

function getSaleProductName(sale: Sale) {
  return getProductName(sale.product ?? sale.project?.product)
}

function getSaleDateValue(sale: Sale) {
  const value = new Date(sale.date).getTime()
  return Number.isFinite(value) ? value : 0
}

function formatSaleDate(sale: Sale) {
  return dashboardDateFormatter.format(new Date(sale.date))
}

function sourceColor(source: string) {
  if (source === 'ecommerce') {
    return 'blue'
  }

  if (source === 'event') {
    return 'gold'
  }

  if (source === 'store') {
    return 'purple'
  }

  return 'default'
}

function buildProductProgress(products: Product[], projects: Project[], sales: Sale[]) {
  return products.slice(0, 4).map((product) => {
    const productProjects = projects.filter((project) => project.idProduct === product.id)
    const totalUnits = productProjects.reduce(
      (total, project) => total + getNumber(project.units),
      0,
    )
    const soldUnits = sales
      .filter((sale) => sale.idProduct === product.id)
      .reduce((total, sale) => total + getNumber(sale.quantity), 0)
    const progress = totalUnits > 0 ? Math.min((soldUnits / totalUnits) * 100, 100) : 0

    return {
      image: product.image,
      name: product.name,
      progress,
      soldUnits,
      totalUnits,
    }
  })
}

function MetricCard({
  icon,
  label,
  tone,
  value,
}: {
  icon: ReactNode
  label: string
  tone: string
  value: string
}) {
  return (
    <Card className="dashboard-metric-card" size="small">
      <div className={`dashboard-metric-icon dashboard-metric-icon-${tone}`}>
        {icon}
      </div>
      <Typography.Text className="dashboard-metric-label">{label}</Typography.Text>
      <Typography.Text className="dashboard-metric-value">{value}</Typography.Text>
    </Card>
  )
}

function QuickLink({
  description,
  icon,
  label,
  path,
}: {
  description: string
  icon: ReactNode
  label: string
  path: string
}) {
  return (
    <Link className="dashboard-quick-link" to={path}>
      <span className="dashboard-quick-link-icon">{icon}</span>
      <span>
        <Typography.Text className="dashboard-quick-link-title">{label}</Typography.Text>
        <Typography.Text className="dashboard-quick-link-description">
          {description}
        </Typography.Text>
      </span>
      <ArrowRightOutlined className="dashboard-quick-link-arrow" />
    </Link>
  )
}

export function DashboardPage() {
  const productsQuery = useQuery({
    queryKey: ['dashboard', 'products'],
    queryFn: () => getJson<Product[]>(`/products?pageSize=${DASHBOARD_PAGE_SIZE}`),
  })
  const projectsQuery = useQuery({
    queryKey: ['dashboard', 'projects'],
    queryFn: () => getJson<Project[]>(`/projects?pageSize=${DASHBOARD_PAGE_SIZE}`),
  })
  const stakeholdersQuery = useQuery({
    queryKey: ['dashboard', 'stakeholders'],
    queryFn: () =>
      getJson<Stakeholder[]>(`/stakeholders?pageSize=${DASHBOARD_PAGE_SIZE}`),
  })
  const salesQuery = useQuery({
    queryKey: ['dashboard', 'sales'],
    queryFn: () => getJson<Sale[]>(`/sales?pageSize=${DASHBOARD_PAGE_SIZE}`),
  })

  const products = productsQuery.data ?? []
  const projects = projectsQuery.data ?? []
  const stakeholders = stakeholdersQuery.data ?? []
  const sales = salesQuery.data ?? []
  const isLoading =
    productsQuery.isLoading ||
    projectsQuery.isLoading ||
    stakeholdersQuery.isLoading ||
    salesQuery.isLoading
  const hasError =
    productsQuery.isError ||
    projectsQuery.isError ||
    stakeholdersQuery.isError ||
    salesQuery.isError
  const totalRevenue = sales.reduce((total, sale) => total + getNumber(sale.amount), 0)
  const netProfit = sales.reduce((total, sale) => {
    const explicitProfit = parseMoneyNumber(sale.profit)
    return total + (explicitProfit ?? getNumber(sale.amount) - getNumber(sale.fee))
  }, 0)
  const ownerProfit = sales.reduce((total, sale) => total + getNumber(sale.ownerProfit), 0)
  const unitsSold = sales.reduce((total, sale) => total + getNumber(sale.quantity), 0)
  const recentSales = [...sales]
    .sort((left, right) => getSaleDateValue(right) - getSaleDateValue(left))
    .slice(0, 5)
  const productProgress = buildProductProgress(products, projects, sales)

  return (
    <section className="dashboard-page" aria-labelledby="dashboard-heading">
      <div className="dashboard-hero">
        <div className="dashboard-hero-mark" aria-hidden="true">
          <DashboardOutlined />
        </div>
        <div>
          <Typography.Title id="dashboard-heading" level={1}>
            Compania Service
          </Typography.Title>
          <Typography.Text className="dashboard-subtitle">
            Boardgame operations & investment management
          </Typography.Text>
        </div>
      </div>

      {hasError ? (
        <Alert
          className="dashboard-alert"
          message="Some dashboard data could not be loaded."
          showIcon
          type="warning"
        />
      ) : null}

      <section aria-label="Operations overview" className="dashboard-overview">
        <Row gutter={[16, 16]}>
          <Col xs={12} lg={6}>
            <MetricCard
              icon={<AppstoreOutlined />}
              label="Total Products"
              tone="indigo"
              value={String(products.length)}
            />
          </Col>
          <Col xs={12} lg={6}>
            <MetricCard
              icon={<ProjectOutlined />}
              label="Active Projects"
              tone="violet"
              value={String(projects.filter((project) => project.isActive).length)}
            />
          </Col>
          <Col xs={12} lg={6}>
            <MetricCard
              icon={<TeamOutlined />}
              label="Stakeholders"
              tone="rose"
              value={String(stakeholders.length)}
            />
          </Col>
          <Col xs={12} lg={6}>
            <MetricCard
              icon={<ShoppingCartOutlined />}
              label="Total Sales"
              tone="blue"
              value={String(sales.length)}
            />
          </Col>
          <Col xs={12} lg={6}>
            <MetricCard
              icon={<DollarOutlined />}
              label="Total Revenue"
              tone="slate"
              value={formatCurrency(totalRevenue)}
            />
          </Col>
          <Col xs={12} lg={6}>
            <MetricCard
              icon={<RiseOutlined />}
              label="Net Profit"
              tone="green"
              value={formatCurrency(netProfit)}
            />
          </Col>
          <Col xs={12} lg={6}>
            <MetricCard
              icon={<RiseOutlined />}
              label="Owner Profit"
              tone="amber"
              value={formatCurrency(ownerProfit)}
            />
          </Col>
          <Col xs={12} lg={6}>
            <MetricCard
              icon={<ShoppingCartOutlined />}
              label="Units Sold"
              tone="teal"
              value={unitsSold.toLocaleString()}
            />
          </Col>
        </Row>
      </section>

      {isLoading ? <Skeleton active paragraph={{ rows: 8 }} /> : null}

      {!isLoading ? (
        <Row gutter={[18, 18]}>
          <Col xs={24} lg={8}>
            <Space className="dashboard-stack" orientation="vertical" size={16}>
              <Card
                className="dashboard-section-card"
                size="small"
                title="Products"
                extra={<Link to="/products">View all</Link>}
              >
                {productProgress.length > 0 ? (
                  <div className="dashboard-list" role="list">
                    {productProgress.map((product) => (
                      <div className="dashboard-list-item" key={product.name} role="listitem">
                        <Avatar shape="square" src={product.image ?? undefined}>
                          {product.name.charAt(0) || '?'}
                        </Avatar>
                        <div className="dashboard-list-item-body">
                          <Typography.Text strong>{product.name}</Typography.Text>
                          <Space
                            className="dashboard-product-progress"
                            orientation="vertical"
                            size={4}
                          >
                            <Progress
                              percent={Math.round(product.progress)}
                              showInfo={false}
                              size="small"
                            />
                            <Typography.Text type="secondary">
                              {`${product.soldUnits.toLocaleString()} / ${product.totalUnits.toLocaleString()} units`}
                            </Typography.Text>
                          </Space>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="No products found." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>

              <Card
                className="dashboard-section-card"
                size="small"
                title="Stakeholders"
                extra={<Link to="/stakeholders">View all</Link>}
              >
                {stakeholders.length > 0 ? (
                  <div className="dashboard-list" role="list">
                    {stakeholders.slice(0, 5).map((stakeholder, index) => (
                      <div
                        className="dashboard-list-item"
                        key={stakeholder.idStakeholder}
                        role="listitem"
                      >
                        <Avatar className={`dashboard-avatar-${index % 4}`}>
                          {stakeholder.name.charAt(0) || '?'}
                        </Avatar>
                        <Typography.Text strong>{stakeholder.name}</Typography.Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty
                    description="No stakeholders found."
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                )}
              </Card>
            </Space>
          </Col>

          <Col xs={24} lg={16}>
            <section aria-label="Recent sales">
              <Card
                className="dashboard-section-card dashboard-recent-sales"
                size="small"
                title="Recent Sales"
                extra={<Link to="/sales">View all</Link>}
              >
                {recentSales.length > 0 ? (
                  <div className="dashboard-list" role="list">
                    {recentSales.map((sale) => (
                      <div
                        className="dashboard-list-item dashboard-recent-sale-item"
                        key={sale.idSale}
                        role="listitem"
                      >
                        <div className="dashboard-list-item-body">
                          <Typography.Text strong>{getSaleProductName(sale)}</Typography.Text>
                          <Space size={8} wrap>
                            <Typography.Text type="secondary">
                              {formatSaleDate(sale)}
                            </Typography.Text>
                            <Tag color={sourceColor(sale.source)}>{sale.source}</Tag>
                            <Typography.Text type="secondary">
                              {`${sale.quantity} units`}
                            </Typography.Text>
                          </Space>
                        </div>
                        <Typography.Text className="dashboard-sale-amount" strong>
                          {formatCurrency(sale.amount)}
                        </Typography.Text>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Empty description="No sales found." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                )}
              </Card>
            </section>
          </Col>
        </Row>
      ) : null}

      <section aria-label="Quick links" className="dashboard-quick-links">
        <QuickLink
          description="View revenue by channel"
          icon={<BarChartOutlined />}
          label="Sales Report"
          path="/reports/sales"
        />
        <QuickLink
          description="Investment performance"
          icon={<ProjectOutlined />}
          label="Stakeholder Projects"
          path="/reports/stakeholder-projects"
        />
        <QuickLink
          description="Batch import from CSV/XLSX"
          icon={<ImportOutlined />}
          label="Sales Imports"
          path="/imports"
        />
      </section>
    </section>
  )
}
