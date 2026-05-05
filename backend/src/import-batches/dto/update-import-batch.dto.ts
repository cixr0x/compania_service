import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString, ValidateIf } from 'class-validator';
import { IMPORT_SOURCES } from '../../common/constants/import-sources';
import type { ImportSource } from '../../common/constants/import-sources';
import { IsSaleDateString } from '../../sales/dto/sale-date-string.validator';

export class UpdateImportBatchDto {
  @ValidateIf((_, value) => value !== undefined)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @IsIn(IMPORT_SOURCES)
  source?: ImportSource;

  @ValidateIf((_, value) => value !== undefined)
  @IsSaleDateString()
  importDate?: string;
}
