export type DecimalValue = string | number
export type IsoDateTime = string
export type ImportSource = 'ecommerce' | 'store' | 'event' | 'surface'
export type ImportStatus =
  | 'uploaded'
  | 'validated'
  | 'has_errors'
  | 'committed'
  | 'cancelled'

export type ProjectFeeModel = 'percentage' | 'fixed'

export type Product = {
  id: number
  name: string
  description: string | null
  image: string | null
  idEcommerce: string | null
  idStore: string | null
  idEvent: string | null
  idSurface: string | null
  ownership: DecimalValue
  tag: string | null
  projects?: Project[]
}

export type Stakeholder = {
  idStakeholder: number
  name: string
}

export type Setting = {
  id: number
  code: string
  name: string
  description: string | null
  value: string
}

export type Project = {
  idProject: number
  idProduct: number
  name: string
  feeModel: ProjectFeeModel
  feeValue: DecimalValue
  isActive: boolean
  units: number
  unitCost: DecimalValue
  productionCost: DecimalValue
  adminCost: DecimalValue
  costAdjustment: DecimalValue
  adjustmentDescription: string | null
  product?: Product
  stakeholders?: ProjectStakeholder[]
  transactions?: ProjectTransaction[]
}

export type ProjectTransaction = {
  idProjectTransaction: number
  idProject: number
  date: IsoDateTime
  amount: DecimalValue
  description: string
}

export type ProjectStakeholder = {
  idProjectStakeholder: number
  idProject: number
  idStakeholder: number
  stakePercentage: DecimalValue
  project?: Project
  stakeholder?: Stakeholder
}

export type StakeholderProjectTransaction = {
  idStakeholderProjectTransaction: number
  idProject: number
  idStakeholder: number
  date: IsoDateTime
  description: string
  amount: DecimalValue
}

export type Sale = {
  idSale: number
  date: IsoDateTime
  idProduct: number
  idProject: number
  quantity: number
  amount: DecimalValue
  source: string
  fee: DecimalValue
  feeOverride?: boolean
  profit: DecimalValue
  ownerProfit: DecimalValue
  product?: Product
  project?: Project
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
  idProject: number | null
  quantity: number | null
  amount: DecimalValue | null
  rawRow: Record<string, unknown> | null
  createdAt: IsoDateTime
  product?: Product | null
  project?: Project | null
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

export type SalesReportSource = ImportSource

export type SalesReportSourceTotals = {
  amount: number
  averagePrice: number
  quantity: number
}

export type SalesReportRow = Record<SalesReportSource, SalesReportSourceTotals> & {
  fee: number
  ownerProfit: number
  productId: number
  productImage: string | null
  productName: string
  profit: number
  projectId: number
  totalAmount: number
  totalAveragePrice: number
  totalQuantity: number
}

export type SalesReportSummary = {
  rows: SalesReportRow[]
  sources: SalesReportSource[]
}

export type SalesReportPeriod = {
  months: number[]
  year: number
}

export type StakeholderProjectsReportSource = ImportSource

export type StakeholderProjectsReportSourceTotals = {
  amount: number
  quantity: number
}

export type StakeholderProjectStakeholderRow = {
  balance: number
  income: number
  investment: number
  payments: number
  stakePercentage: number
  stakeholderId: number
  stakeholderName: string
}

export type StakeholderProjectTransactionRow = {
  amount?: number
  date?: string
  description?: string
  id: string
}

export type StakeholderProjectReportRow = Record<
  StakeholderProjectsReportSource,
  StakeholderProjectsReportSourceTotals
> & {
  calculatedCost: number
  netSalesTotal: number
  productImage: string | null
  productName: string
  profit: number
  projectId: number
  projectProgress: number
  projectTotalCost: number
  stakeholder: StakeholderProjectStakeholderRow
  totalFees: number
  totalSales: number
  totalUnits: number
  totalUnitsSold: number
  transactions: StakeholderProjectTransactionRow[]
  unitPrice: number
  unitsLeft: number
}

export type StakeholderProjectsReport = {
  row: StakeholderProjectReportRow | null
  sources: StakeholderProjectsReportSource[]
}
