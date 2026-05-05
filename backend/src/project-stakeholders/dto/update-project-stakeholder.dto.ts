import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectStakeholderDto } from './create-project-stakeholder.dto';

export class UpdateProjectStakeholderDto extends PartialType(CreateProjectStakeholderDto) {}
