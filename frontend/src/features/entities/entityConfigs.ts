import type { DataTableColumn } from '../../components/DataTable'

export type EntityRow = Record<string, unknown>

export type EntityField = {
  name: string
  label: string
  type: 'date' | 'number' | 'text' | 'textarea'
}

export type EntityConfig = {
  title: string
  path: EntityName
  idField: string
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

function text(name: string, label: string): EntityField {
  return { name, label, type: 'text' }
}

function number(name: string, label: string): EntityField {
  return { name, label, type: 'number' }
}

function textarea(name: string, label: string): EntityField {
  return { name, label, type: 'textarea' }
}

function column(key: string, header: string): DataTableColumn<EntityRow> {
  return { key, header }
}

export const entityConfigs = {
  products: {
    title: 'Products',
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
      text('name', 'Name'),
      textarea('description', 'Description'),
      text('image', 'Image'),
      text('idEcommerce', 'Ecommerce ID'),
      text('idStore', 'Store ID'),
      text('idEvent', 'Event ID'),
      text('idSurface', 'Surface ID'),
      number('idModel', 'Model ID'),
      text('ownership', 'Ownership'),
      text('tag', 'Tag'),
    ],
  },
  models: {
    title: 'Models',
    path: 'models',
    idField: 'idModel',
    columns: [
      column('idModel', 'ID'),
      column('name', 'Name'),
      column('description', 'Description'),
    ],
    fields: [text('name', 'Name'), textarea('description', 'Description')],
  },
  projects: {
    title: 'Projects',
    path: 'projects',
    idField: 'idProject',
    columns: [
      column('idProject', 'ID'),
      column('idProduct', 'Product ID'),
      column('units', 'Units'),
      column('unitCost', 'Unit Cost'),
      column('adminCost', 'Admin Cost'),
    ],
    fields: [
      number('idProduct', 'Product ID'),
      number('units', 'Units'),
      number('unitCost', 'Unit Cost'),
      number('adminCost', 'Admin Cost'),
    ],
  },
  stakeholders: {
    title: 'Stakeholders',
    path: 'stakeholders',
    idField: 'idStakeholder',
    columns: [column('idStakeholder', 'ID'), column('name', 'Name')],
    fields: [text('name', 'Name')],
  },
  'project-stakeholders': {
    title: 'Project Stakeholders',
    path: 'project-stakeholders',
    idField: 'idProjectStakeholder',
    columns: [
      column('idProjectStakeholder', 'ID'),
      column('idProject', 'Project ID'),
      column('idStakeholder', 'Stakeholder ID'),
      column('stakePercentage', 'Stake Percentage'),
    ],
    fields: [
      number('idProject', 'Project ID'),
      number('idStakeholder', 'Stakeholder ID'),
      number('stakePercentage', 'Stake Percentage'),
    ],
  },
  sales: {
    title: 'Sales',
    path: 'sales',
    idField: 'idSale',
    columns: [
      column('idSale', 'ID'),
      column('date', 'Date'),
      column('idProduct', 'Product ID'),
      column('quantity', 'Quantity'),
      column('amount', 'Amount'),
      column('source', 'Source'),
      column('fee', 'Fee'),
    ],
    fields: [
      { name: 'date', label: 'Date', type: 'date' },
      number('idProduct', 'Product ID'),
      number('quantity', 'Quantity'),
      number('amount', 'Amount'),
      text('source', 'Source'),
      number('fee', 'Fee'),
    ],
  },
} satisfies Record<EntityName, EntityConfig>

export function getEntityConfig(entityName: string | undefined) {
  if (!entityName || !(entityName in entityConfigs)) {
    return null
  }

  return entityConfigs[entityName as EntityName]
}
