import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { UploadOutlined } from '@ant-design/icons'
import {
  Alert,
  Button,
  Form,
  List,
  Select,
  Space,
  Spin,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
} from 'antd'
import type { TableProps, UploadFile, UploadProps } from 'antd'
import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  api,
  formatApiErrorMessage,
  getJson,
  patchJson,
  postJson,
} from '../../api/client'
import { ProductNameCell } from '../../components/ProductNameCell'
import type {
  ImportBatch,
  ImportError,
  ImportSource,
  ImportStageRow,
  Project,
} from '../../api/types'
import { formatCurrency } from '../../utils/money'

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

const IMPORT_STAGE_TABLE_WIDTH = 1240

function queryKeys(batchId: number) {
  return {
    batch: ['import-batches', batchId] as const,
    errors: ['import-batches', batchId, 'errors'] as const,
    stage: ['import-batches', batchId, 'stage'] as const,
  }
}

function getOperationErrorMessage(error: unknown) {
  return formatApiErrorMessage(error, 'The import operation failed.')
}

function formatDecimal(value: ImportStageRow['amount']) {
  if (value === null || value === undefined || value === '') {
    return 'Missing'
  }

  return formatCurrency(value)
}

function formatRowStatus(row: ImportStageRow) {
  if (row.errors && row.errors.length > 0) {
    return 'Needs review'
  }

  if (!row.product) {
    return 'Unmatched'
  }

  if (row.idProject === null || row.idProject === undefined) {
    return 'Needs review'
  }

  return 'Valid'
}

function getStatusTag(status: string) {
  if (status === 'Valid') {
    return <Tag color="success">{status}</Tag>
  }

  return <Tag color="warning">{status}</Tag>
}

function isCompleteStageRow(row: ImportStageRow) {
  return (
    row.idProduct !== null &&
    row.quantity !== null &&
    row.amount !== null &&
    row.amount !== undefined &&
    row.amount !== '' &&
    row.idProject !== null &&
    row.idProject !== undefined &&
    row.product !== null &&
    row.product !== undefined
  )
}

function normalizeBatchDate(batch: ImportBatch | undefined) {
  return batch?.importDate?.slice(0, 10) ?? ''
}

function getRowProjects(row: ImportStageRow) {
  if (row.product?.projects && row.product.projects.length > 0) {
    return row.product.projects
  }

  return row.project ? [row.project] : []
}

function formatProjectOption(project?: Project | null) {
  if (!project) {
    return '-'
  }

  return `Project #${project.idProject}`
}

export function SalesImportPage({ initialBatchId }: SalesImportPageProps) {
  const params = useParams()
  const navigate = useNavigate()
  const routeBatchId = params.id ? Number(params.id) : null
  const queryClient = useQueryClient()
  const [activeBatchId, setActiveBatchId] = useState<number | null>(
    initialBatchId ?? (Number.isFinite(routeBatchId) ? routeBatchId : null),
  )
  const [source, setSource] = useState<ImportSource>('ecommerce')
  const [lockedSource, setLockedSource] = useState<ImportSource | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [importDate, setImportDate] = useState('')
  const [isImportDateDirty, setIsImportDateDirty] = useState(false)
  const [operationError, setOperationError] = useState<string | null>(null)
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null)

  const activeKeys = activeBatchId ? queryKeys(activeBatchId) : null
  const hasActiveBatch = activeBatchId !== null

  const batchQuery = useQuery({
    enabled: hasActiveBatch,
    queryKey: activeKeys?.batch ?? ['import-batches', 'inactive'],
    queryFn: () => getJson<ImportBatch>(`/import-batches/${activeBatchId}`),
  })
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
  const selectedSource = hasActiveBatch
    ? (batchQuery.data?.source ?? lockedSource ?? source)
    : source
  const selectedImportDate =
    hasActiveBatch && !isImportDateDirty
      ? normalizeBatchDate(batchQuery.data)
      : importDate
  const operationErrors = useMemo(() => {
    const queryErrors = []

    if (batchQuery.error) {
      queryErrors.push(getOperationErrorMessage(batchQuery.error))
    }

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
  }, [batchQuery.error, errorsQuery.error, operationError, stageQuery.error])

  async function refreshBatch(batchId: number) {
    const keys = queryKeys(batchId)
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: keys.batch }),
      queryClient.invalidateQueries({ queryKey: keys.stage }),
      queryClient.invalidateQueries({ queryKey: keys.errors }),
    ])
  }

  function resetImport(options: { preserveSuccess?: boolean } = {}) {
    setActiveBatchId(null)
    setLockedSource(null)
    setFile(null)
    setImportDate('')
    setIsImportDateDirty(false)
    setOperationError(null)
    if (!options.preserveSuccess) {
      setOperationSuccess(null)
    }
    if (params.id) {
      navigate('/imports')
    }
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
      setIsImportDateDirty(false)
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
      setOperationSuccess(null)
    },
    onSettled: async () => {
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
        { importDate: selectedImportDate },
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
      setOperationSuccess(null)
    },
    onSuccess: () => {
      resetImport({ preserveSuccess: true })
      setOperationSuccess('Sales import committed successfully.')
    },
    onSettled: async () => {
      if (activeBatchId) {
        await refreshBatch(activeBatchId)
      }
    },
  })

  const stageProjectMutation = useMutation({
    mutationFn: async ({
      idImportStage,
      idProject,
    }: {
      idImportStage: number
      idProject: number
    }) => {
      if (!activeBatchId) {
        throw new Error('Upload a batch before selecting projects.')
      }

      return patchJson<ImportStageRow, { idProject: number }>(
        `/import-batches/${activeBatchId}/stage/${idImportStage}`,
        { idProject },
      )
    },
    onError: (error) => {
      setOperationError(getOperationErrorMessage(error))
    },
    onMutate: () => {
      setOperationError(null)
    },
    onSuccess: (updatedRow) => {
      if (!activeKeys) {
        return
      }

      queryClient.setQueryData<ImportStageRow[]>(activeKeys.stage, (current) =>
        current?.map((row) =>
          row.idImportStage === updatedRow.idImportStage ? updatedRow : row,
        ),
      )
    },
    onSettled: async () => {
      if (activeBatchId) {
        await refreshBatch(activeBatchId)
      }
    },
  })

  function handleUpload() {
    if (hasActiveBatch) {
      return
    }
    uploadMutation.mutate()
  }

  const isAnyMutationPending =
    uploadMutation.isPending ||
    validateMutation.isPending ||
    commitMutation.isPending ||
    stageProjectMutation.isPending
  const isAnyOperationPending =
    isAnyMutationPending ||
    batchQuery.isFetching ||
    stageQuery.isFetching ||
    errorsQuery.isFetching
  const areRowsComplete = rows.every(isCompleteStageRow)
  const canCommit =
    hasActiveBatch &&
    batchQuery.data?.status === 'validated' &&
    selectedImportDate !== '' &&
    batchQuery.isSuccess &&
    stageQuery.isSuccess &&
    errorsQuery.isSuccess &&
    !isAnyOperationPending &&
    !batchQuery.error &&
    !stageQuery.error &&
    !errorsQuery.error &&
    errors.length === 0 &&
    rows.length > 0 &&
    areRowsComplete
  const isUploadDisabled = hasActiveBatch || uploadMutation.isPending
  const displayedFilename =
    file?.name ?? (hasActiveBatch ? batchQuery.data?.originalFilename : null)
  const fileHint = displayedFilename ?? 'Choose a CSV or XLSX file.'
  const uploadFileList: UploadFile[] = displayedFilename
    ? [
        {
          name: displayedFilename,
          status: 'done',
          uid: displayedFilename,
        },
      ]
    : []
  const uploadProps: UploadProps = {
    accept: '.csv,.xlsx',
    beforeUpload: (nextFile) => {
      setFile(nextFile)
      return false
    },
    disabled: hasActiveBatch,
    fileList: uploadFileList,
    maxCount: 1,
    onRemove: () => {
      setFile(null)
      return true
    },
    showUploadList: false,
  }
  const stepItems = [
    {
      content: 'Choose and upload a sales file.',
      title: 'Upload file',
    },
    {
      content: 'Upload a batch before validation.',
      title: 'Validate batch',
    },
    {
      content: 'Validate the uploaded batch and clear errors before commit.',
      title: 'Commit sales',
    },
  ]
  const currentStep = hasActiveBatch
    ? batchQuery.data?.status === 'validated' || batchQuery.data?.status === 'committed'
      ? 2
      : 1
    : 0
  function renderProjectCell(row: ImportStageRow) {
    if (!row.product) {
      return '-'
    }

    const projects = getRowProjects(row)
    const selectedProject =
      row.project ??
      projects.find((project) => project.idProject === row.idProject) ??
      null

    if (projects.length > 1) {
      return (
        <Select
          aria-label={`Project for row ${row.rowNumber}`}
          disabled={
            !activeBatchId ||
            batchQuery.data?.status === 'committed' ||
            (stageProjectMutation.isPending &&
              stageProjectMutation.variables?.idImportStage === row.idImportStage)
          }
          loading={
            stageProjectMutation.isPending &&
            stageProjectMutation.variables?.idImportStage === row.idImportStage
          }
          options={projects.map((project) => ({
            label: formatProjectOption(project),
            value: project.idProject,
          }))}
          placeholder="Select project"
          size="small"
          style={{ width: '100%' }}
          value={row.idProject ?? undefined}
          onChange={(value) =>
            stageProjectMutation.mutate({
              idImportStage: row.idImportStage,
              idProject: Number(value),
            })
          }
        />
      )
    }

    if (selectedProject) {
      return <Typography.Text>{formatProjectOption(selectedProject)}</Typography.Text>
    }

    return <Tag color="warning">Project required</Tag>
  }

  const stagedRowColumns: TableProps<ImportStageRow>['columns'] = [
    {
      align: 'right',
      dataIndex: 'rowNumber',
      title: 'Row',
      width: 64,
    },
    {
      dataIndex: 'externalProductId',
      render: (value: ImportStageRow['externalProductId']) => value ?? '-',
      title: 'External ID',
      width: 132,
    },
    {
      dataIndex: 'importedProductDescription',
      render: (value: ImportStageRow['importedProductDescription']) =>
        value ?? '-',
      title: 'Imported Description',
      width: 280,
    },
    {
      dataIndex: 'product',
      render: (product: ImportStageRow['product']) =>
        product ? (
          <ProductNameCell imageUrl={product.image} name={product.name} />
        ) : (
          <Tag color="warning">Unmatched product</Tag>
        ),
      title: 'Matched Product',
      width: 220,
    },
    {
      render: (_, row) => renderProjectCell(row),
      title: 'Project',
      width: 200,
    },
    {
      align: 'right',
      dataIndex: 'quantity',
      render: (value: ImportStageRow['quantity']) => value ?? '-',
      title: 'Quantity',
      width: 82,
    },
    {
      align: 'right',
      dataIndex: 'amount',
      render: (value: ImportStageRow['amount']) => formatDecimal(value),
      title: 'Amount',
      width: 122,
    },
    {
      render: (_, row) => getStatusTag(formatRowStatus(row)),
      title: 'Status',
      width: 140,
    },
  ]

  return (
    <section className="page-panel import-workflow" aria-labelledby="imports-heading">
      <Space orientation="vertical" size="large" style={{ width: '100%' }}>
        <div className="page-heading-row">
          <div>
            <Typography.Title id="imports-heading" level={2}>
              Sales Imports
            </Typography.Title>
          </div>
          {hasActiveBatch ? <Tag color="processing">Active batch #{activeBatchId}</Tag> : null}
        </div>

        <Steps current={currentStep} items={stepItems} />

        <Form
          className="import-controls"
          layout="vertical"
          onFinish={handleUpload}
        >
          <div className="import-controls-grid">
            <Form.Item label="Source">
              <Select
                aria-label="Source"
                disabled={hasActiveBatch}
                id="sales-import-source"
                options={importSources.map((sourceOption) => ({
                  label: sourceLabels[sourceOption],
                  value: sourceOption,
                }))}
                style={{ minWidth: 180 }}
                value={selectedSource}
                onChange={(value) => setSource(value)}
              />
            </Form.Item>

            <Form.Item label="Import date">
              <input
                aria-label="Import date"
                id="sales-import-date"
                type="date"
                value={selectedImportDate}
                onChange={(event) => {
                  setIsImportDateDirty(true)
                  setImportDate(event.target.value)
                }}
              />
            </Form.Item>

            <Form.Item label="Sales file">
              <Space orientation="vertical" size={4}>
                <Upload {...uploadProps}>
                  <Button disabled={hasActiveBatch} icon={<UploadOutlined />}>
                    Sales file
                  </Button>
                </Upload>
                <Typography.Text type="secondary">{fileHint}</Typography.Text>
              </Space>
            </Form.Item>

            <Form.Item className="import-actions-item">
              <Space
                aria-label="Workflow actions"
                className="import-actions"
                role="group"
                size="small"
                wrap
              >
                <Button
                  disabled={isUploadDisabled}
                  htmlType="submit"
                  loading={uploadMutation.isPending}
                  type="primary"
                >
                  Upload
                </Button>
                <Button
                  disabled={!hasActiveBatch || isAnyOperationPending}
                  loading={validateMutation.isPending}
                  onClick={() => validateMutation.mutate()}
                >
                  Validate/Revalidate
                </Button>
                <Button
                  disabled={!canCommit || commitMutation.isPending}
                  loading={commitMutation.isPending}
                  type="primary"
                  onClick={() => commitMutation.mutate()}
                >
                  Commit
                </Button>
                {hasActiveBatch ? (
                <Button
                  disabled={isAnyMutationPending}
                  onClick={() => resetImport()}
                >
                  New import
                </Button>
                ) : null}
              </Space>
            </Form.Item>
          </div>
        </Form>

        {hasActiveBatch ? (
          <Typography.Text className="source-lock-note">
            {`Source is locked for the active batch: ${sourceLabels[selectedSource]}.`}
          </Typography.Text>
        ) : null}

        {operationErrors.length > 0 ? (
          <Alert
            showIcon
            title="Import operation error"
            type="error"
            description={
              <div aria-label="Operation error list" role="list">
                <List
                  dataSource={operationErrors}
                  size="small"
                  renderItem={(error) => (
                    <List.Item key={error} role="listitem">
                      {error}
                    </List.Item>
                  )}
                />
              </div>
            }
          />
        ) : null}

        {operationSuccess ? (
          <Alert showIcon message={operationSuccess} type="success" />
        ) : null}

        <section className="import-section" aria-labelledby="import-errors-heading">
          <div className="section-heading-row">
            <Typography.Title id="import-errors-heading" level={3}>
              Import Errors
            </Typography.Title>
            <Tag>{errors.length} open</Tag>
          </div>
          {errors.length > 0 ? (
            <Alert
              showIcon
              title={`${errors.length} open import error${errors.length === 1 ? '' : 's'}`}
              type="warning"
              description={
                <div aria-label="Import error list" role="list">
                  <List
                    dataSource={errors}
                    size="small"
                    renderItem={(error) => (
                      <List.Item key={error.idImportError} role="listitem">
                        <Space wrap>
                          <Typography.Text>
                            Row {error.rowNumber ?? 'Batch'}
                          </Typography.Text>
                          {' '}
                          <Typography.Text>{error.field ?? 'General'}</Typography.Text>
                          {' '}
                          <Typography.Text strong>{error.message}</Typography.Text>
                        </Space>
                      </List.Item>
                    )}
                  />
                </div>
              }
            />
          ) : (
            <Typography.Text type="secondary">
              {hasActiveBatch
                ? 'No import errors for this batch.'
                : 'Upload and validate a batch to see import errors.'}
            </Typography.Text>
          )}
        </section>

        <section className="import-section" aria-labelledby="staged-rows-heading">
          <div className="section-heading-row">
            <Typography.Title id="staged-rows-heading" level={3}>
              Staged Rows
            </Typography.Title>
            <Tag>{rows.length} rows</Tag>
          </div>

          <Spin spinning={stageQuery.isLoading}>
            <Table<ImportStageRow>
              className="import-stage-table"
              columns={stagedRowColumns}
              dataSource={rows}
              locale={{
                emptyText: hasActiveBatch
                  ? 'No staged rows'
                  : 'Upload a file to stage rows before validation.',
              }}
              pagination={{ pageSize: 10, showSizeChanger: false }}
              rowKey="idImportStage"
              scroll={{ x: IMPORT_STAGE_TABLE_WIDTH }}
              size="small"
              tableLayout="fixed"
            />
          </Spin>
        </section>
      </Space>
    </section>
  )
}
