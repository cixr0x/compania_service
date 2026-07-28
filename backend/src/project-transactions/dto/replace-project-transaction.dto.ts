import { Transform, Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { IsSaleDateString } from '../../sales/dto/sale-date-string.validator';

export class ReplaceProjectTransactionDto {
  @IsSaleDateString()
  date!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @Transform(({ value }: { value: unknown }): unknown =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  description!: string;
}
