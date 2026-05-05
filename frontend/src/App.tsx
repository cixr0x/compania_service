import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'

const pageSummaries = {
  products: {
    title: 'Products',
    description: 'Manage catalog records, external channel IDs, ownership, and model assignments.',
  },
  models: {
    title: 'Models',
    description: 'Maintain pricing model names and descriptions for product classification.',
  },
  projects: {
    title: 'Projects',
    description: 'Track product project units, cost basis, and administrative cost inputs.',
  },
  stakeholders: {
    title: 'Stakeholders',
    description: 'Maintain stakeholder records used by project distribution rules.',
  },
  projectStakeholders: {
    title: 'Project Stakeholders',
    description: 'Assign stakeholder percentages to projects and monitor ownership totals.',
  },
  sales: {
    title: 'Sales',
    description: 'Review normalized sales transactions across ecommerce, store, event, and surface sources.',
  },
  salesImports: {
    title: 'Sales Imports',
    description: 'Upload, validate, correct, and commit imported sales batches.',
  },
} satisfies Record<string, PageSummary>

type PageSummary = {
  title: string
  description: string
}

function PlaceholderPage({ description, title }: PageSummary) {
  return (
    <section className="page-panel" aria-labelledby={`${title}-heading`}>
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id={`${title}-heading`}>{title}</h2>
        </div>
        <button className="primary-action" type="button">
          New Record
        </button>
      </div>

      <p className="page-description">{description}</p>

      <div className="toolbar" aria-label={`${title} filters`}>
        <label className="search-field">
          <span>Search</span>
          <input placeholder={`Search ${title.toLowerCase()}`} type="search" />
        </label>
        <button className="secondary-action" type="button">
          Filters
        </button>
      </div>

      <div className="data-surface" aria-label={`${title} data preview`}>
        <div className="table-header">
          <span>Name</span>
          <span>Status</span>
          <span>Updated</span>
        </div>
        <div className="empty-state">
          <p>{title} workspace placeholder</p>
          <span>Data tables and forms will be connected in later tasks.</span>
        </div>
      </div>
    </section>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/products" />} />
        <Route
          path="products"
          element={<PlaceholderPage {...pageSummaries.products} />}
        />
        <Route
          path="models"
          element={<PlaceholderPage {...pageSummaries.models} />}
        />
        <Route
          path="projects"
          element={<PlaceholderPage {...pageSummaries.projects} />}
        />
        <Route
          path="stakeholders"
          element={<PlaceholderPage {...pageSummaries.stakeholders} />}
        />
        <Route
          path="project-stakeholders"
          element={<PlaceholderPage {...pageSummaries.projectStakeholders} />}
        />
        <Route
          path="sales"
          element={<PlaceholderPage {...pageSummaries.sales} />}
        />
        <Route
          path="sales-imports"
          element={<PlaceholderPage {...pageSummaries.salesImports} />}
        />
        <Route path="*" element={<Navigate replace to="/products" />} />
      </Route>
    </Routes>
  )
}

export default App
