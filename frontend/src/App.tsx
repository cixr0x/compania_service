import { Navigate, Route, Routes } from 'react-router-dom'
import { AppLayout } from './components/AppLayout'
import { EntityEditPage } from './features/entities/EntityEditPage'
import { EntityListPage } from './features/entities/EntityListPage'
import { SalesImportPage } from './features/imports/SalesImportPage'
import { SalesReportPage } from './features/reports/SalesReportPage'

function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate replace to="/products" />} />
        <Route path="imports" element={<SalesImportPage />} />
        <Route path="imports/:id" element={<SalesImportPage />} />
        <Route path="reports/sales" element={<SalesReportPage />} />
        <Route path=":entityName" element={<EntityListPage />} />
        <Route path=":entityName/new" element={<EntityEditPage />} />
        <Route path=":entityName/:id" element={<EntityEditPage />} />
        <Route path="*" element={<Navigate replace to="/products" />} />
      </Route>
    </Routes>
  )
}

export default App
