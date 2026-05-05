import { Transform } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { IMPORT_SOURCES } from '../../common/constants/import-sources';
import type { ImportSource } from '../../common/constants/import-sources';

export class CreateImportBatchDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @IsIn(IMPORT_SOURCES)
  source!: ImportSource;
}
