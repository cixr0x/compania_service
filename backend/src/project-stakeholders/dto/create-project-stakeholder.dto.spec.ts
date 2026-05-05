import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectStakeholderDto } from './create-project-stakeholder.dto';

describe('CreateProjectStakeholderDto', () => {
  it('rejects zero stakePercentage', async () => {
    const dto = plainToInstance(CreateProjectStakeholderDto, {
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: 0,
    });

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'stakePercentage')).toBe(true);
  });
});
