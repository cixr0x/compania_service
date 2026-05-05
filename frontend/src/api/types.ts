export type DecimalValue = string | number
export type IsoDateTime = string
export type ImportSource = 'ecommerce' | 'store' | 'event' | 'surface'
export type ImportStatus =
  | 'uploaded'
  | 'validated'
  | 'has_errors'
  | 'committed'
  | 'cancelled'

export type PricingModel = {
  idModel: number
  name: string
  description: string | null
}

export type Product = {
  id: number
  name: string
  description: string | null
  image: string | null
  idEcommerce: string | null
  idStore: string | null
  idEvent: string | null
  idSurface: string | null
  idModel: number | null
  ownership: DecimalValue
  tag: string | null
  model?: PricingModel | null
}

export type Stakeholder = {
  idStakeholder: number
  name: string
}

export type Project = {
  idProject: number
  idProduct: number
  units: number
  unitCost: DecimalValue
  adminCost: DecimalValue
  product?: Product
  stakeholders?: ProjectStakeholder[]
}

export type ProjectStakeholder = {
  idProjectStakeholder: number
  idProject: number
  idStakeholder: number
  stakePercentage: DecimalValue
  project?: Project
  stakeholder?: Stakeholder
}

export type Sale = {
  idSale: number
  date: IsoDateTime
  idProduct: number
  quantity: number
  amount: DecimalValue
  source: string
  fee: DecimalValue
  product?: Product
}

export type ImportBatch = {
  idImportBatch: number
  source: ImportSource
  importDate: IsoDateTime | null
  originalFilename: string
  status: ImportStatus
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
  committedAt: IsoDateTime | null
  _count?: {
    stageRows: number
    errors: number
  }
}

export type ImportStageRow = {
  idImportStage: number
  idImportBatch: number
  rowNumber: number
  externalProductId: string | null
  importedProductDescription: string | null
  idProduct: number | null
  quantity: number | null
  amount: DecimalValue | null
  rawRow: Record<string, unknown> | null
  createdAt: IsoDateTime
  product?: Product | null
  errors?: ImportError[]
}

export type ImportError = {
  idImportError: number
  idImportBatch: number
  idImportStage: number | null
  rowNumber: number | null
  field: string | null
  message: string
  createdAt: IsoDateTime
}
