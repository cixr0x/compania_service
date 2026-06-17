import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export const PROJECT_FEE_TYPES = ['sale_percentage', 'fixed_per_unit'] as const;
export type ProjectFeeType = (typeof PROJECT_FEE_TYPES)[number];

export class CreateProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProduct!: number;

  @IsIn(PROJECT_FEE_TYPES)
  feeType!: ProjectFeeType;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  feeValue!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @IsOptional()
  units?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  unitCost?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  productionCost?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  adminCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  costAdjustment?: number;

  @IsOptional()
  @IsString()
  adjustmentDescription?: string;
}
