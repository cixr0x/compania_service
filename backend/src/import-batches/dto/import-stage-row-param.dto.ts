import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';
import { IdParamDto } from '../../common/dto/id-param.dto';

export class ImportStageRowParamDto extends IdParamDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  stageId!: number;
}
