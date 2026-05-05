import { Type } from 'class-transformer';
import { IsInt, IsNumber, Max, Min } from 'class-validator';

export class CreateProjectStakeholderDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  idProject!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  idStakeholder!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  @Max(100)
  stakePercentage!: number;
}
