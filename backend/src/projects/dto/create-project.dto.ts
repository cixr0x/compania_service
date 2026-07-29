import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsInt,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export const PROJECT_FEE_MODELS = ['percentage', 'fixed'] as const;
export type ProjectFeeModel = (typeof PROJECT_FEE_MODELS)[number];

export class CreateProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProduct!: number;

  @IsOptional()
  @IsString()
  name?: string;

  @IsIn(PROJECT_FEE_MODELS)
  feeModel!: ProjectFeeModel;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  feeValue!: number;

  @IsOptional()
  @IsBoolean()
  fixedRoi?: boolean;

  @ValidateIf(
    (dto: CreateProjectDto) =>
      dto.fixedRoi === true || dto.fixedRoiPercentage !== undefined,
  )
  @IsDefined()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fixedRoiPercentage?: number;

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
