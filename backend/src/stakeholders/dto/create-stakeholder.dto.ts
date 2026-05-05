import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateStakeholderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;
}
