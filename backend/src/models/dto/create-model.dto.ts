import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateModelDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  code?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
