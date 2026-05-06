import type { DataTableColumn } from '../../components/DataTable'
import { parseMoneyNumber } from '../../utils/money'

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
  section?: string
  span?: 'full'
  prefix?: string
  suffix?: string
  options?: { label: string; value: string }[]
  computeValue?: (values: EntityRow) => unknown
  optionSource?: {
    labelField: string
    labelFormatter?: (row: EntityRow) => string | null | undefined
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
  | 'models'
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

function getProjectProductName(row: EntityRow) {
  const project = asEntityRow(row.project)
  return (
    (project ? getRelatedEntityName(project, 'product') : null) ??
    getRelatedEntityName(row, 'product')
  )
}

function formatProjectOption(row: EntityRow) {
  const product = row.product
  const productName =
    typeof product === 'object' &&
    product !== null &&
    'name' in product &&
    typeof product.name === 'string'
      ? product.name
      : null

  return productName
    ? `Project #${String(row.idProject)} - ${productName}`
    : `Project #${String(row.idProject)}`
}

function sumMoneyValues(...values: unknown[]): number {
  return values.reduce<number>(
    (total, value) => total + (parseMoneyNumber(value) ?? 0),
    0,
  )
}

function getProjectTotalCost(row: EntityRow) {
  return sumMoneyValues(row.productionCost, row.adminCost)
}

function getSaleTax(row: EntityRow) {
  return parseMoneyNumber(row.tax) ?? 0
}

export const entityConfigs = {
  products: {
    title: 'Products',
    singularTitle: 'Product',
    path: 'products',
    idField: 'id',
    columns: [
      column('id', 'ID'),
      column('name', 'Name'),
      column('idEcommerce', 'Ecommerce ID'),
      column('idStore', 'Store ID'),
      column('idEvent', 'Event ID'),
      column('idSurface', 'Surface ID'),
      column('ownership', 'Ownership'),
      column('tag', 'Tag'),
      column('idModel', 'Model', {
        valueGetter: (row) => getRelatedEntityName(row, 'model'),
        valueType: 'string',
      }),
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
      select('idModel', 'Model', undefined, {
        optionSource: {
          labelField: 'name',
          path: 'models',
          valueField: 'idModel',
        },
        requiredOnCreate: true,
        section: 'Commercial attributes',
        valueType: 'number',
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
  models: {
    title: 'Models',
    singularTitle: 'Model',
    path: 'models',
    idField: 'idModel',
    formLayout: 'compact',
    columns: [
      column('idModel', 'ID'),
      column('name', 'Name'),
      column('description', 'Description'),
    ],
    fields: [
      text('name', 'Name', {
        required: true,
      }),
      textarea('description', 'Description', {
        span: 'full',
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
      column('idProduct', 'Product', {
        valueGetter: (row) => getRelatedEntityName(row, 'product'),
        valueType: 'string',
      }),
      column('isActive', 'Active'),
      column('units', 'Units'),
      column('unitCost', 'Unit Cost', { valueFormat: 'money' }),
      column('productionCost', 'Production Cost', { valueFormat: 'money' }),
      column('adminCost', 'Admin Cost', { valueFormat: 'money' }),
      column('totalCost', 'Total Cost', {
        valueFormat: 'money',
        valueGetter: getProjectTotalCost,
      }),
    ],
    fields: [
      select('idProduct', 'Product', undefined, {
        optionSource: {
          labelField: 'name',
          path: 'products',
          valueField: 'id',
        },
        requiredOnCreate: true,
        valueType: 'number',
      }),
      checkbox('isActive', 'Active'),
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
      number('productionCost', 'Production Cost', {
        min: 0,
        prefix: '$',
        step: 0.01,
        valueFormat: 'money',
      }),
      number('adminCost', 'Admin Cost', {
        min: 0,
        prefix: '$',
        step: 0.01,
        valueFormat: 'money',
      }),
      computed('totalCost', 'Total Cost', getProjectTotalCost, {
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
        valueGetter: getProjectProductName,
        valueType: 'string',
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
      column('idSale', 'ID'),
      column('date', 'Date'),
      column('idProduct', 'Product', {
        valueGetter: (row) => getRelatedEntityName(row, 'product'),
        valueType: 'string',
      }),
      column('idProject', 'Project', {
        valueGetter: getProjectProductName,
        valueType: 'string',
      }),
      column('quantity', 'Quantity'),
      column('amount', 'Amount', { valueFormat: 'money' }),
      column('source', 'Source'),
      column('fee', 'Fee', { valueFormat: 'money' }),
      column('tax', 'Tax', { valueFormat: 'money' }),
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
          path: 'projects',
          valueField: 'idProject',
        },
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
      number('fee', 'Fee', {
        min: 0,
        prefix: '$',
        step: 0.01,
        valueFormat: 'money',
      }),
      computed('tax', 'Tax', getSaleTax, {
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
