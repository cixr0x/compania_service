import type { DataTableColumn } from '../../components/DataTable'
import { getChannelHeaderClass } from '../../utils/channelHeaders'
import { formatCurrency, parseMoneyNumber } from '../../utils/money'

export type EntityRow = Record<string, unknown>

export type EntityField = {
  name: string
  label: string
  type:
    | 'checkbox'
    | 'computed'
    | 'date'
    | 'imagePreview'
    | 'number'
    | 'select'
    | 'text'
    | 'textarea'
  required?: boolean
  requiredOnCreate?: boolean
  readOnly?: boolean
  readOnlyWhen?: (values: EntityRow) => boolean
  visibleWhen?: (values: EntityRow) => boolean
  section?: string
  span?: 'full'
  prefix?: string
  suffix?: string
  options?: { label: string; value: string }[]
  computeValue?: (values: EntityRow) => unknown
  defaultValue?: unknown
  persistComputed?: boolean
  optionSource?: {
    labelField: string
    labelFormatter?: (row: EntityRow) => string | null | undefined
    optionFilter?: (row: EntityRow, values: EntityRow) => boolean
    path: EntityName
    valueField: string
  }
  previewAltField?: string
  previewSourceField?: string
  valueFormat?: 'money'
  valueType?: 'number' | 'string'
  min?: number
  max?: number
  step?: number
}

export type EntityConfig = {
  title: string
  singularTitle: string
  path: EntityName
  idField: string
  formLayout?: 'compact' | 'default'
  columns: DataTableColumn<EntityRow>[]
  fields: EntityField[]
}

export type EntityName =
  | 'products'
  | 'projects'
  | 'stakeholders'
  | 'project-stakeholders'
  | 'sales'
  | 'settings'

function text(
  name: string,
  label: string,
  options: Omit<EntityField, 'label' | 'name' | 'type'> = {},
): EntityField {
  return { name, label, type: 'text', ...options }
}

function number(
  name: string,
  label: string,
  options: Omit<EntityField, 'label' | 'name' | 'type'> = {},
): EntityField {
  return { name, label, type: 'number', ...options }
}

function checkbox(
  name: string,
  label: string,
  options: Omit<EntityField, 'label' | 'name' | 'type'> = {},
): EntityField {
  return { name, label, type: 'checkbox', ...options }
}

function select(
  name: string,
  label: string,
  options?: EntityField['options'],
  fieldOptions: Omit<EntityField, 'label' | 'name' | 'options' | 'type'> = {},
): EntityField {
  return { name, label, options, type: 'select', ...fieldOptions }
}

function textarea(
  name: string,
  label: string,
  options: Omit<EntityField, 'label' | 'name' | 'type'> = {},
): EntityField {
  return { name, label, type: 'textarea', ...options }
}

function imagePreview(
  name: string,
  label: string,
  previewSourceField: string,
  options: Omit<
    EntityField,
    'label' | 'name' | 'previewSourceField' | 'type'
  > = {},
): EntityField {
  return { name, label, previewSourceField, type: 'imagePreview', ...options }
}

function computed(
  name: string,
  label: string,
  computeValue: (values: EntityRow) => unknown,
  options: Omit<EntityField, 'computeValue' | 'label' | 'name' | 'type'> = {},
): EntityField {
  return { name, label, computeValue, type: 'computed', ...options }
}

function column(
  key: string,
  header: string,
  options: Omit<DataTableColumn<EntityRow>, 'header' | 'key'> = {},
): DataTableColumn<EntityRow> {
  return { key, header, ...options }
}

function asEntityRow(value: unknown): EntityRow | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as EntityRow)
    : null
}

function getEntityName(value: unknown): string | null {
  const row = asEntityRow(value)
  const name = row?.name

  return typeof name === 'string' && name.trim() !== '' ? name.trim() : null
}

function getRelatedEntityName(row: EntityRow, relationName: string) {
  return getEntityName(row[relationName])
}

function getEntityImage(value: unknown): string | null {
  const row = asEntityRow(value)
  const image = row?.image

  return typeof image === 'string' && image.trim() !== ''
    ? image.trim()
    : null
}

function getRelatedEntityImage(row: EntityRow, relationName: string) {
  return getEntityImage(row[relationName])
}

function getProjectDisplayNameFromProject(row: EntityRow) {
  return getEntityName(row) ?? getRelatedEntityName(row, 'product')
}

function getProjectProductName(row: EntityRow) {
  const project = asEntityRow(row.project)
  return (
    (project ? getProjectDisplayNameFromProject(project) : null) ??
    getProjectDisplayNameFromProject(row)
  )
}

function getProjectProductImage(row: EntityRow) {
  const project = asEntityRow(row.project)

  return (
    (project ? getRelatedEntityImage(project, 'product') : null) ??
    getRelatedEntityImage(row, 'product')
  )
}

function formatProjectOption(row: EntityRow) {
  const projectName = getEntityName(row)
  const projectId = String(row.idProject)
  const productName = getRelatedEntityName(row, 'product')

  if (projectName) {
    return `${projectName} (#${projectId})`
  }

  return productName
    ? `Project #${projectId} - ${productName}`
    : `Project #${projectId}`
}

function sumMoneyValues(...values: unknown[]): number {
  return values.reduce<number>(
    (total, value) => total + (parseMoneyNumber(value) ?? 0),
    0,
  )
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const PROJECT_FEE_MODEL_OPTIONS = [
  { label: 'Percentage fee', value: 'percentage' },
  { label: 'Fixed fee per unit', value: 'fixed' },
]

function getProjectFeeModelLabel(value: unknown) {
  const feeModel = typeof value === 'string' ? value : ''

  return (
    PROJECT_FEE_MODEL_OPTIONS.find((option) => option.value === feeModel)
      ?.label ?? '-'
  )
}

function getProjectFeeDisplay(row: EntityRow) {
  const feeModel = typeof row.feeModel === 'string' ? row.feeModel : ''
  const feeValue = parseMoneyNumber(row.feeValue)

  if (feeValue === null) {
    return '-'
  }

  if (feeModel === 'fixed') {
    return formatCurrency(feeValue)
  }

  return `${Number.isInteger(feeValue) ? feeValue : feeValue.toFixed(2)}%`
}

function isPercentageFeeModel(row: EntityRow) {
  return row.feeModel !== 'fixed'
}

function isFixedFeeModel(row: EntityRow) {
  return row.feeModel === 'fixed'
}

function getProjectTransactions(row: EntityRow) {
  return Array.isArray(row.transactions) ? (row.transactions as EntityRow[]) : []
}

function getProjectTotalCost(row: EntityRow) {
  const explicitTotal = parseMoneyNumber(row.transactionTotal)

  if (explicitTotal !== null) {
    return explicitTotal
  }

  return getProjectTransactions(row).reduce(
    (total, transaction) => total + (parseMoneyNumber(transaction.amount) ?? 0),
    0,
  )
}

function getProjectRealUnitCost(row: EntityRow) {
  const totalCost = getProjectTotalCost(row)
  const units = parseMoneyNumber(row.units) ?? 0

  return units > 0 ? roundCurrency(totalCost / units) : 0
}

function getSaleProfit(row: EntityRow) {
  return roundCurrency(
    sumMoneyValues(
      row.amount,
      -(parseMoneyNumber(row.fee) ?? 0),
    ),
  )
}

function getSaleOwnerProfit(row: EntityRow) {
  const product = asEntityRow(row.product)
  const ownerPercentage =
    parseMoneyNumber(row.ownerPercentage) ??
    parseMoneyNumber(product?.ownership) ??
    0

  return roundCurrency(getSaleProfit(row) * (ownerPercentage / 100))
}

function isOnlySelectedProductProject(row: EntityRow) {
  return parseMoneyNumber(row.selectedProductProjectCount) === 1
}

function isProjectForSelectedProduct(row: EntityRow, values: EntityRow) {
  const selectedProductId = parseMoneyNumber(values.idProduct)

  if (selectedProductId === null) {
    return true
  }

  return parseMoneyNumber(row.idProduct) === selectedProductId
}

function isFeeOverrideEnabled(row: EntityRow) {
  return row.feeOverride === true || row.feeOverride === 'true'
}

export const entityConfigs = {
  products: {
    title: 'Products',
    singularTitle: 'Product',
    path: 'products',
    idField: 'id',
    columns: [
      column('id', 'ID'),
      column('name', 'Name', {
        thumbnailGetter: (row) => row.image,
        width: 240,
      }),
      column('idEcommerce', 'Ecommerce ID', {
        headerClassName: getChannelHeaderClass('ecommerce'),
      }),
      column('idStore', 'Store ID', {
        headerClassName: getChannelHeaderClass('store'),
      }),
      column('idEvent', 'Event ID', {
        headerClassName: getChannelHeaderClass('event'),
      }),
      column('idSurface', 'Surface ID', {
        headerClassName: getChannelHeaderClass('surface'),
      }),
      column('ownership', 'Ownership'),
      column('tag', 'Tag'),
    ],
    fields: [
      text('name', 'Name', {
        required: true,
        section: 'Product details',
      }),
      imagePreview('imagePreview', 'Image preview', 'image', {
        previewAltField: 'name',
        section: 'Product details',
      }),
      textarea('description', 'Description', {
        section: 'Product details',
        span: 'full',
      }),
      text('image', 'Image URL', {
        section: 'Product details',
        span: 'full',
      }),
      text('idEcommerce', 'Ecommerce external ID', {
        section: 'Channel mapping',
      }),
      text('idStore', 'Store external ID', {
        section: 'Channel mapping',
      }),
      text('idEvent', 'Event external ID', {
        section: 'Channel mapping',
      }),
      text('idSurface', 'Surface external ID', {
        section: 'Channel mapping',
      }),
      number('ownership', 'Owner-retained profit', {
        max: 100,
        min: 0,
        section: 'Commercial attributes',
        step: 0.01,
        suffix: '%',
      }),
      text('tag', 'Tag', {
        section: 'Commercial attributes',
      }),
    ],
  },
  projects: {
    title: 'Projects',
    singularTitle: 'Project',
    path: 'projects',
    idField: 'idProject',
    columns: [
      column('idProject', 'ID'),
      column('name', 'Name', {
        valueGetter: (row) => getEntityName(row) ?? '-',
        valueType: 'string',
        width: 220,
      }),
      column('idProduct', 'Product', {
        thumbnailGetter: (row) => getRelatedEntityImage(row, 'product'),
        valueGetter: (row) => getRelatedEntityName(row, 'product'),
        valueType: 'string',
        width: 240,
      }),
      column('feeModel', 'Fee Model', {
        valueGetter: (row) => getProjectFeeModelLabel(row.feeModel),
        valueType: 'string',
        width: 170,
      }),
      column('feeAmount', 'Fee', {
        valueGetter: getProjectFeeDisplay,
        valueType: 'string',
        width: 130,
      }),
      column('isActive', 'Active'),
      column('units', 'Units'),
      column('unitCost', 'Unit Cost', { valueFormat: 'money' }),
      column('totalCost', 'Total Cost', {
        valueFormat: 'money',
        valueGetter: getProjectTotalCost,
      }),
      column('realUnitCost', 'Real Unit Cost', {
        valueFormat: 'money',
        valueGetter: getProjectRealUnitCost,
      }),
    ],
    fields: [
      text('name', 'Name'),
      select('idProduct', 'Product', undefined, {
        optionSource: {
          labelField: 'name',
          path: 'products',
          valueField: 'id',
        },
        requiredOnCreate: true,
        valueType: 'number',
      }),
      select('feeModel', 'Fee Model', PROJECT_FEE_MODEL_OPTIONS, {
        defaultValue: 'percentage',
        required: true,
      }),
      number('feeValue', 'Percentage Fee', {
        min: 0,
        required: true,
        step: 0.01,
        suffix: '%',
        visibleWhen: isPercentageFeeModel,
      }),
      number('feeValue', 'Fixed Fee Per Unit', {
        min: 0,
        prefix: '$',
        required: true,
        step: 0.01,
        valueFormat: 'money',
        visibleWhen: isFixedFeeModel,
      }),
      checkbox('isActive', 'Active', {
        defaultValue: true,
      }),
      number('units', 'Units', {
        min: 0,
        step: 1,
      }),
      number('unitCost', 'Unit Cost', {
        min: 0,
        prefix: '$',
        step: 0.01,
        valueFormat: 'money',
      }),
      computed('totalCost', 'Total Cost', getProjectTotalCost, {
        prefix: '$',
        valueFormat: 'money',
      }),
      computed('realUnitCost', 'Real Unit Cost', getProjectRealUnitCost, {
        prefix: '$',
        valueFormat: 'money',
      }),
    ],
  },
  stakeholders: {
    title: 'Stakeholders',
    singularTitle: 'Stakeholder',
    path: 'stakeholders',
    idField: 'idStakeholder',
    formLayout: 'compact',
    columns: [column('idStakeholder', 'ID'), column('name', 'Name')],
    fields: [
      text('name', 'Name', {
        required: true,
      }),
    ],
  },
  settings: {
    title: 'Settings',
    singularTitle: 'Setting',
    path: 'settings',
    idField: 'id',
    columns: [
      column('id', 'ID'),
      column('code', 'Code'),
      column('name', 'Name'),
      column('description', 'Description'),
      column('value', 'Value'),
    ],
    fields: [
      text('code', 'Code', {
        required: true,
      }),
      text('name', 'Name', {
        required: true,
      }),
      textarea('description', 'Description', {
        span: 'full',
      }),
      textarea('value', 'Value', {
        required: true,
        span: 'full',
      }),
    ],
  },
  'project-stakeholders': {
    title: 'Project Stakeholders',
    singularTitle: 'Project Stakeholders/Split',
    path: 'project-stakeholders',
    idField: 'idProjectStakeholder',
    columns: [
      column('idProjectStakeholder', 'ID'),
      column('idProject', 'Project', {
        thumbnailGetter: getProjectProductImage,
        valueGetter: getProjectProductName,
        valueType: 'string',
        width: 260,
      }),
      column('idStakeholder', 'Stakeholder', {
        valueGetter: (row) => getRelatedEntityName(row, 'stakeholder'),
        valueType: 'string',
      }),
      column('stakePercentage', 'Stake Percentage'),
    ],
    fields: [
      select('idProject', 'Project', undefined, {
        optionSource: {
          labelField: 'idProject',
          labelFormatter: formatProjectOption,
          path: 'projects',
          valueField: 'idProject',
        },
        valueType: 'number',
      }),
      select('idStakeholder', 'Stakeholder', undefined, {
        optionSource: {
          labelField: 'name',
          path: 'stakeholders',
          valueField: 'idStakeholder',
        },
        valueType: 'number',
      }),
      number('stakePercentage', 'Stake Percentage', {
        max: 100,
        min: 0,
        step: 0.01,
        suffix: '%',
      }),
    ],
  },
  sales: {
    title: 'Sales',
    singularTitle: 'Sale',
    path: 'sales',
    idField: 'idSale',
    columns: [
      column('idSale', 'ID', { width: 56 }),
      column('date', 'Date', { width: 112 }),
      column('idProduct', 'Product', {
        thumbnailGetter: (row) => getRelatedEntityImage(row, 'product'),
        valueGetter: (row) => getRelatedEntityName(row, 'product'),
        valueType: 'string',
        width: 190,
      }),
      column('idProject', 'Project', {
        thumbnailGetter: getProjectProductImage,
        valueGetter: getProjectProductName,
        valueType: 'string',
        width: 190,
      }),
      column('quantity', 'Quantity', { width: 84 }),
      column('amount', 'Amount', { valueFormat: 'money', width: 114 }),
      column('source', 'Source', { width: 94 }),
      column('fee', 'Fee', { valueFormat: 'money', width: 112 }),
      column('profit', 'Profit', {
        valueFormat: 'money',
        valueGetter: getSaleProfit,
        width: 112,
      }),
      column('ownerProfit', 'Owner Profit', {
        valueFormat: 'money',
        valueGetter: getSaleOwnerProfit,
        width: 124,
      }),
    ],
    fields: [
      {
        name: 'date',
        label: 'Date',
        type: 'date',
        required: true,
      },
      select('idProduct', 'Product', undefined, {
        optionSource: {
          labelField: 'name',
          path: 'products',
          valueField: 'id',
        },
        required: true,
        valueType: 'number',
      }),
      select('idProject', 'Project', undefined, {
        optionSource: {
          labelField: 'idProject',
          labelFormatter: formatProjectOption,
          optionFilter: isProjectForSelectedProduct,
          path: 'projects',
          valueField: 'idProject',
        },
        readOnlyWhen: isOnlySelectedProductProject,
        required: true,
        valueType: 'number',
      }),
      number('quantity', 'Quantity', {
        min: 1,
        step: 1,
      }),
      number('amount', 'Amount', {
        min: 0,
        prefix: '$',
        step: 0.01,
        valueFormat: 'money',
      }),
      select(
        'source',
        'Source',
        [
          { label: 'Ecommerce', value: 'ecommerce' },
          { label: 'Store', value: 'store' },
          { label: 'Event', value: 'event' },
          { label: 'Surface', value: 'surface' },
        ],
      ),
      checkbox('feeOverride', 'Override Fee'),
      number('fee', 'Fee', {
        min: 0,
        prefix: '$',
        readOnlyWhen: (row) => !isFeeOverrideEnabled(row),
        step: 0.01,
        valueFormat: 'money',
      }),
      computed('profit', 'Profit', getSaleProfit, {
        persistComputed: true,
        prefix: '$',
        valueFormat: 'money',
      }),
      computed('ownerProfit', 'Owner Profit', getSaleOwnerProfit, {
        persistComputed: true,
        prefix: '$',
        valueFormat: 'money',
      }),
    ],
  },
} satisfies Record<EntityName, EntityConfig>

export function getEntityConfig(entityName: string | undefined) {
  if (!entityName || !(entityName in entityConfigs)) {
    return null
  }

  return entityConfigs[entityName as EntityName]
}
