import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  const validPayload = {
    idModel: 5,
    idProduct: 10,
    units: 25,
    unitCost: 12.5,
  };

  async function validatePayload(payload: Record<string, unknown>) {
    return validate(plainToInstance(CreateProjectDto, payload));
  }

  it('does not require deprecated fixed cost fields when creating a project', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validPayload,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain(
      'productionCost',
    );
    expect(errors.map((error) => error.property)).not.toContain('adminCost');
  });

  it('requires a pricing model when creating a project', async () => {
    const errors = await validatePayload({
      idProduct: 10,
      units: 25,
      unitCost: 12.5,
    });

    expect(errors.map((error) => error.property)).toContain('idModel');
  });
});
