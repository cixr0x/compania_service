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

export class UpdateSaleDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsSaleDateString()
  date?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProduct?: number;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity?: number;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount?: number;

  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  source?: string;

  @ValidateIf((_, value) => value !== undefined)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  fee?: number;
}
