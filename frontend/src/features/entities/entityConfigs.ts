import type { DataTableColumn } from '../../components/DataTable'

export type EntityRow = Record<string, unknown>

export type EntityField = {
  name: string
  label: string
  type:
    | 'checkbox'
    | 'date'
    | 'imagePreview'
    | 'number'
    | 'select'
    | 'text'
    | 'textarea'
  helperText?: string
  required?: boolean
  requiredOnCreate?: boolean
  section?: string
  span?: 'full'
  prefix?: string
  suffix?: string
  options?: { label: string; value: string }[]
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

function column(
  key: string,
  header: string,
  options: Omit<DataTableColumn<EntityRow>, 'header' | 'key'> = {},
): DataTableColumn<EntityRow> {
  return { key, header, ...options }
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
      column('idModel', 'Model ID'),
    ],
    fields: [
      text('name', 'Name', {
        helperText: 'Public product name shown in lists and sale matching.',
        required: true,
        section: 'Product details',
      }),
      imagePreview('imagePreview', 'Image preview', 'image', {
        previewAltField: 'name',
        section: 'Product details',
      }),
      textarea('description', 'Description', {
        helperText: 'Short internal description for identifying this product.',
        section: 'Product details',
        span: 'full',
      }),
      text('image', 'Image URL', {
        helperText: 'Direct image URL used in catalog previews.',
        section: 'Product details',
        span: 'full',
      }),
      text('idEcommerce', 'Ecommerce external ID', {
        helperText: 'External product ID used by ecommerce imports.',
        section: 'Channel mapping',
      }),
      text('idStore', 'Store external ID', {
        helperText: 'External product ID used by store imports.',
        section: 'Channel mapping',
      }),
      text('idEvent', 'Event external ID', {
        helperText: 'External product ID used by event imports.',
        section: 'Channel mapping',
      }),
      text('idSurface', 'Surface external ID', {
        helperText: 'External product ID used by surface imports.',
        section: 'Channel mapping',
      }),
      select('idModel', 'Model', undefined, {
        helperText: 'Pricing model that classifies this product.',
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
        helperText:
          'Percentage of profit retained by the owner for this product.',
        max: 100,
        min: 0,
        section: 'Commercial attributes',
        step: 0.01,
        suffix: '%',
      }),
      text('tag', 'Tag', {
        helperText: 'Optional short label for filtering or reporting.',
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
        helperText: 'Compact model name used to group products.',
        required: true,
      }),
      textarea('description', 'Description', {
        helperText: 'Optional notes about this model.',
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
      column('idProduct', 'Product ID'),
      column('isActive', 'Active'),
      column('units', 'Units'),
      column('unitCost', 'Unit Cost', { valueFormat: 'money' }),
      column('productionCost', 'Production Cost', { valueFormat: 'money' }),
      column('adminCost', 'Admin Cost', { valueFormat: 'money' }),
    ],
    fields: [
      select('idProduct', 'Product', undefined, {
        helperText: 'Product this batch purchase will produce or sell.',
        optionSource: {
          labelField: 'name',
          path: 'products',
          valueField: 'id',
        },
        requiredOnCreate: true,
        valueType: 'number',
      }),
      checkbox('isActive', 'Active', {
        helperText:
          'Marks this as the current project for the product. Only one active project is allowed per product.',
      }),
      number('units', 'Units', {
        helperText: 'Whole number of units planned for the project.',
        min: 0,
        step: 1,
      }),
      number('unitCost', 'Unit Cost', {
        helperText: 'Currency cost per unit.',
        min: 0,
        prefix: '$',
        step: 0.01,
        valueFormat: 'money',
      }),
      number('productionCost', 'Production Cost', {
        helperText: 'Currency production cost for the project.',
        min: 0,
        prefix: '$',
        step: 0.01,
        valueFormat: 'money',
      }),
      number('adminCost', 'Admin Cost', {
        helperText: 'Currency cost for project administration.',
        min: 0,
        prefix: '$',
        step: 0.01,
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
        helperText: 'Stakeholder display name.',
        required: true,
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
      column('idProject', 'Project ID'),
      column('idStakeholder', 'Stakeholder ID'),
      column('stakePercentage', 'Stake Percentage'),
    ],
    fields: [
      select('idProject', 'Project', undefined, {
        helperText: 'Project whose stakeholder split must total 100%.',
        optionSource: {
          labelField: 'idProject',
          labelFormatter: formatProjectOption,
          path: 'projects',
          valueField: 'idProject',
        },
        valueType: 'number',
      }),
      select('idStakeholder', 'Stakeholder', undefined, {
        helperText: 'Stakeholder receiving this share.',
        optionSource: {
          labelField: 'name',
          path: 'stakeholders',
          valueField: 'idStakeholder',
        },
        valueType: 'number',
      }),
      number('stakePercentage', 'Stake Percentage', {
        helperText: 'Percentage share for this stakeholder.',
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
      column('idProduct', 'Product ID'),
      column('idProject', 'Project ID'),
      column('quantity', 'Quantity'),
      column('amount', 'Amount', { valueFormat: 'money' }),
      column('source', 'Source'),
      column('fee', 'Fee', { valueFormat: 'money' }),
    ],
    fields: [
      {
        name: 'date',
        label: 'Date',
        type: 'date',
        helperText: 'Sale date.',
        required: true,
      },
      select('idProduct', 'Product', undefined, {
        helperText: 'Product sold in this sale.',
        optionSource: {
          labelField: 'name',
          path: 'products',
          valueField: 'id',
        },
        required: true,
        valueType: 'number',
      }),
      select('idProject', 'Project', undefined, {
        helperText: 'Project linked to this sale. Required for all sales.',
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
        helperText: 'Whole number of units sold.',
        min: 1,
        step: 1,
      }),
      number('amount', 'Amount', {
        helperText: 'Sale amount in currency.',
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
        { helperText: 'Sales channel matching import sources.' },
      ),
      number('fee', 'Fee', {
        helperText: 'Fee amount in currency.',
        min: 0,
        prefix: '$',
        step: 0.01,
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
