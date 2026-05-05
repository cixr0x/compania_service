import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { IsSaleDateString } from './sale-date-string.validator';
import { transformSaleNumber } from './sale-number.transformer';

export class CreateSaleDto {
  @IsSaleDateString()
  date!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProduct!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProject!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;

  @Transform(({ value }) => transformSaleNumber(value))
  @IsNumber()
  @Min(0)
  amount!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  source!: string;

  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => transformSaleNumber(value))
  @IsNumber()
  @Min(0)
  fee?: number;
}
