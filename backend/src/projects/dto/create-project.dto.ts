import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProduct!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  units!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;

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
