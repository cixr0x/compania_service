import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { EntityEditPage } from './features/entities/EntityEditPage'
import { EntityListPage } from './features/entities/EntityListPage'

function SalesImportsPlaceholderPage() {
  return (
    <section className="page-panel" aria-labelledby="sales-imports-heading">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id="sales-imports-heading">Sales Imports</h2>
        </div>
      </div>
      <p className="page-description">Sales Imports</p>
    </section>
  )
}

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/products" />} />
        <Route path="imports" element={<SalesImportsPlaceholderPage />} />
        <Route path=":entityName" element={<EntityListPage />} />
        <Route path=":entityName/new" element={<EntityEditPage />} />
        <Route path=":entityName/:id" element={<EntityEditPage />} />
        <Route path="*" element={<Navigate replace to="/products" />} />
      </Route>
    </Routes>
  )
}

export default App
