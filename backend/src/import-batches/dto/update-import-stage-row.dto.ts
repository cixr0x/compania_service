import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateImportStageRowDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProject?: number | null;
}
