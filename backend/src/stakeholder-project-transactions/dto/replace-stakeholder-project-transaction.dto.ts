import { Transform, Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { IsSaleDateString } from '../../sales/dto/sale-date-string.validator';

export const STAKEHOLDER_PROJECT_TRANSACTION_TYPES = [
  'investment',
  'payment',
  'adjustment',
] as const;

export type StakeholderProjectTransactionType =
  (typeof STAKEHOLDER_PROJECT_TRANSACTION_TYPES)[number];

export class ReplaceStakeholderProjectTransactionDto {
  @IsSaleDateString()
  date!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  amount!: number;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsIn(STAKEHOLDER_PROJECT_TRANSACTION_TYPES)
  transactionType!: StakeholderProjectTransactionType;
}
