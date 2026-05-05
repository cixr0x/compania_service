import { Type } from 'class-transformer';
import { IsInt, IsNumber, Min } from 'class-validator';

export class CreateProjectDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProduct!: number;

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
  adminCost!: number;
}
