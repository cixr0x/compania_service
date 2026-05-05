import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { api, getJson, patchJson, postJson } from '../../api/client'
import type {
  ImportBatch,
  ImportError,
  ImportSource,
  ImportStageRow,
} from '../../api/types'

type SalesImportPageProps = {
  initialBatchId?: number
}

const importSources: ImportSource[] = [
  'ecommerce',
  'store',
  'event',
  'surface',
]

const sourceLabels: Record<ImportSource, string> = {
  ecommerce: 'Ecommerce',
  store: 'Store',
  event: 'Event',
  surface: 'Surface',
}

function queryKeys(batchId: number) {
  return {
    errors: ['import-batches', batchId, 'errors'] as const,
    stage: ['import-batches', batchId, 'stage'] as const,
  }
}

function getOperationErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'The import operation failed.'
}

function formatDecimal(value: ImportStageRow['amount']) {
  if (value === null || value === undefined || value === '') {
    return 'Missing'
  }

  return String(value)
}

function formatRowStatus(row: ImportStageRow) {
  if (row.errors && row.errors.length > 0) {
    return 'Needs review'
  }

  if (!row.product) {
    return 'Unmatched'
  }

  return 'Valid'
}

export function SalesImportPage({ initialBatchId }: SalesImportPageProps) {
  const queryClient = useQueryClient()
  const [activeBatchId, setActiveBatchId] = useState<number | null>(
    initialBatchId ?? null,
  )
  const [source, setSource] = useState<ImportSource>('ecommerce')
  const [lockedSource, setLockedSource] = useState<ImportSource | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importDate, setImportDate] = useState('')
  const [operationError, setOperationError] = useState<string | null>(null)

  const activeKeys = activeBatchId ? queryKeys(activeBatchId) : null
  const hasActiveBatch = activeBatchId !== null

  const stageQuery = useQuery({
    enabled: hasActiveBatch,
    queryKey: activeKeys?.stage ?? ['import-batches', 'inactive', 'stage'],
    queryFn: () =>
      getJson<ImportStageRow[]>(`/import-batches/${activeBatchId}/stage`),
  })
  const errorsQuery = useQuery({
    enabled: hasActiveBatch,
    queryKey: activeKeys?.errors ?? ['import-batches', 'inactive', 'errors'],
    queryFn: () =>
      getJson<ImportError[]>(`/import-batches/${activeBatchId}/errors`),
  })

  const rows = stageQuery.data ?? []
  const errors = errorsQuery.data ?? []
  const canCommit =
    hasActiveBatch && importDate !== '' && errors.length === 0 && rows.length > 0
  const operationErrors = useMemo(() => {
    const queryErrors = []

    if (stageQuery.error) {
      queryErrors.push(getOperationErrorMessage(stageQuery.error))
    }

    if (errorsQuery.error) {
      queryErrors.push(getOperationErrorMessage(errorsQuery.error))
    }

    if (operationError) {
      queryErrors.push(operationError)
    }

    return queryErrors
  }, [errorsQuery.error, operationError, stageQuery.error])

  async function refreshBatch(batchId: number) {
    const keys = queryKeys(batchId)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.stage }),
      queryClient.invalidateQueries({ queryKey: keys.errors }),
    ])
  }

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!file) {
        throw new Error('Choose a CSV or XLSX file before uploading.')
      }

      const formData = new FormData()
      formData.append('source', source)
      formData.append('file', file)

      const response = await api.post<ImportBatch>('/import-batches', formData)
      return response.data
    },
    onError: (error) => {
      setOperationError(getOperationErrorMessage(error))
    },
    onMutate: () => {
      setOperationError(null)
    },
    onSuccess: async (batch) => {
      setActiveBatchId(batch.idImportBatch)
      setSource(batch.source)
      setLockedSource(batch.source)
      setImportDate(batch.importDate?.slice(0, 10) ?? '')
      await refreshBatch(batch.idImportBatch)
    },
  })

  const validateMutation = useMutation({
    mutationFn: async () => {
      if (!activeBatchId) {
        throw new Error('Upload a batch before validating.')
      }

      return postJson<ImportBatch, Record<string, never>>(
        `/import-batches/${activeBatchId}/validate`,
        {},
      )
    },
    onError: (error) => {
      setOperationError(getOperationErrorMessage(error))
    },
    onMutate: () => {
      setOperationError(null)
    },
    onSuccess: async () => {
      if (activeBatchId) {
        await refreshBatch(activeBatchId)
      }
    },
  })

  const commitMutation = useMutation({
    mutationFn: async () => {
      if (!activeBatchId) {
        throw new Error('Upload a batch before committing.')
      }

      await patchJson<ImportBatch, { importDate: string }>(
        `/import-batches/${activeBatchId}`,
        { importDate },
      )

      return postJson<ImportBatch, Record<string, never>>(
        `/import-batches/${activeBatchId}/commit`,
        {},
      )
    },
    onError: (error) => {
      setOperationError(getOperationErrorMessage(error))
    },
    onMutate: () => {
      setOperationError(null)
    },
    onSuccess: async () => {
      if (activeBatchId) {
        await refreshBatch(activeBatchId)
      }
    },
  })

  function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    uploadMutation.mutate()
  }

  return (
    <section className="page-panel import-workflow" aria-labelledby="imports-heading">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">Workspace</p>
          <h2 id="imports-heading">Sales Imports</h2>
        </div>
        {hasActiveBatch ? (
          <div className="batch-pill">Active batch #{activeBatchId}</div>
        ) : null}
      </div>

      <form className="import-controls" onSubmit={handleUpload}>
        <label className="form-field">
          Source
          <select
            disabled={hasActiveBatch}
            value={source}
            onChange={(event) => setSource(event.target.value as ImportSource)}
          >
            {importSources.map((sourceOption) => (
              <option key={sourceOption} value={sourceOption}>
                {sourceLabels[sourceOption]}
              </option>
            ))}
          </select>
        </label>

        <label className="form-field">
          Import date
          <input
            type="date"
            value={importDate}
            onChange={(event) => setImportDate(event.target.value)}
          />
        </label>

        <label className="form-field import-file-field">
          Sales file
          <input
            accept=".csv,.xlsx"
            type="file"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <div className="import-actions">
          <button
            className="primary-action"
            disabled={uploadMutation.isPending}
            type="submit"
          >
            {uploadMutation.isPending ? 'Uploading' : 'Upload'}
          </button>
          <button
            className="secondary-action"
            disabled={!hasActiveBatch || validateMutation.isPending}
            type="button"
            onClick={() => validateMutation.mutate()}
          >
            {validateMutation.isPending ? 'Validating' : 'Validate/Revalidate'}
          </button>
          <button
            className="primary-action"
            disabled={!canCommit || commitMutation.isPending}
            type="button"
            onClick={() => commitMutation.mutate()}
          >
            {commitMutation.isPending ? 'Committing' : 'Commit'}
          </button>
        </div>
      </form>

      {hasActiveBatch ? (
        <p className="source-lock-note">
          Source is locked for the active batch
          {lockedSource ? `: ${sourceLabels[lockedSource]}.` : '.'}
        </p>
      ) : null}

      {operationErrors.length > 0 ? (
        <div className="form-error" role="alert">
          {operationErrors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}

      <section className="import-section" aria-labelledby="import-errors-heading">
        <div className="section-heading-row">
          <h3 id="import-errors-heading">Import Errors</h3>
          <span>{errors.length} open</span>
        </div>
        {errors.length > 0 ? (
          <div className="error-list">
            {errors.map((error) => (
              <div className="error-row" key={error.idImportError}>
                <span>Row {error.rowNumber ?? 'Batch'}</span>
                <span>{error.field ?? 'General'}</span>
                <strong>{error.message}</strong>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted-copy">No import errors for this batch.</p>
        )}
      </section>

      <section className="import-section" aria-labelledby="staged-rows-heading">
        <div className="section-heading-row">
          <h3 id="staged-rows-heading">Staged Rows</h3>
          <span>{rows.length} rows</span>
        </div>

        <div className="table-scroll">
          <table className="data-table import-table">
            <thead>
              <tr>
                <th>Row</th>
                <th>External ID</th>
                <th>Imported Description</th>
                <th>Matched Product</th>
                <th>Quantity</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => {
                  const status = formatRowStatus(row)

                  return (
                    <tr key={row.idImportStage}>
                      <td>{row.rowNumber}</td>
                      <td>{row.externalProductId ?? 'Missing'}</td>
                      <td>{row.importedProductDescription ?? 'Missing'}</td>
                      <td>
                        {row.product ? (
                          row.product.name
                        ) : (
                          <span className="status-badge status-badge-warning">
                            Unmatched product
                          </span>
                        )}
                      </td>
                      <td>{row.quantity ?? 'Missing'}</td>
                      <td>{formatDecimal(row.amount)}</td>
                      <td>
                        <span
                          className={
                            status === 'Valid'
                              ? 'status-badge'
                              : 'status-badge status-badge-warning'
                          }
                        >
                          {status}
                        </span>
                      </td>
                    </tr>
                  )
                })
              ) : (
                <tr>
                  <td className="table-state" colSpan={7}>
                    {stageQuery.isLoading ? 'Loading staged rows' : 'No staged rows'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}
