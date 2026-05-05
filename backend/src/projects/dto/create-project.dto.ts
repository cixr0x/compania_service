import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

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
  productionCost!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  adminCost!: number;
}
