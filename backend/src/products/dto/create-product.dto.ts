import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idEcommerce?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idStore?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idEvent?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  idSurface?: string;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  idModel?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  ownership?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  feeAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  tag?: string;
}
