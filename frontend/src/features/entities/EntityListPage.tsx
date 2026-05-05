import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getJson } from '../../api/client'
import { DataTable } from '../../components/DataTable'
import { getEntityConfig, type EntityRow } from './entityConfigs'

function UnknownEntityPage() {
  return (
    <section className="page-panel" aria-labelledby="unknown-entity-heading">
      <p className="eyebrow">Workspace</p>
      <h2 id="unknown-entity-heading">Unknown Entity</h2>
      <p className="page-description">
        The requested admin entity is not configured.
      </p>
    </section>
  )
}

export function EntityListPage() {
  const { entityName } = useParams()
  const navigate = useNavigate()
  const [searchValue, setSearchValue] = useState('')
  const config = getEntityConfig(entityName)

  const query = useQuery({
    enabled: Boolean(config),
    queryKey: ['entities', config?.path],
    queryFn: () => getJson<EntityRow[]>(`/${config!.path}`),
  })

  if (!config) {
    return <UnknownEntityPage />
  }

  return (
    <section className="page-panel" aria-labelledby={`${config.path}-heading`}>
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id={`${config.path}-heading`}>{config.title}</h2>
        </div>
        <Link className="primary-action" to={`/${config.path}/new`}>
          Create
        </Link>
      </div>

      {query.isError ? (
        <div className="form-error" role="alert">
          Unable to load {config.title.toLowerCase()}.
        </div>
      ) : null}

      <DataTable
        columns={config.columns}
        emptyMessage={`No ${config.title.toLowerCase()} found.`}
        getRowId={(row) => String(row[config.idField])}
        isLoading={query.isLoading}
        onRowDoubleClick={(row) =>
          navigate(`/${config.path}/${String(row[config.idField])}`)
        }
        onSearchChange={setSearchValue}
        rows={query.data ?? []}
        searchValue={searchValue}
      />
    </section>
  )
}
