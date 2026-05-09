import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class StakeholderProjectReportQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  projectId!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  stakeholderId!: number;
}
