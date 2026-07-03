import { Prisma } from '@prisma/client';

export const publicProjectBaseSelect = {
  idProject: true,
  idProduct: true,
  name: true,
  feeModel: true,
  feeValue: true,
  isActive: true,
  units: true,
  unitCost: true,
  productionCost: true,
  adminCost: true,
  costAdjustment: true,
  adjustmentDescription: true,
} satisfies Prisma.ProjectSelect;

export const publicProjectSummarySelect = {
  ...publicProjectBaseSelect,
  product: true,
} satisfies Prisma.ProjectSelect;

export const publicProjectDetailSelect = {
  ...publicProjectSummarySelect,
  stakeholders: { include: { stakeholder: true } },
  transactions: true,
} satisfies Prisma.ProjectSelect;
