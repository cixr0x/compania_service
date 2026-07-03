import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  const validPayload = {
    feeModel: 'percentage',
    feeValue: 18,
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

  it('requires fee configuration when creating a project', async () => {
    const errors = await validatePayload({
      idProduct: 10,
      units: 25,
      unitCost: 12.5,
    });
    const errorProperties = errors.map((error) => error.property);

    expect(errorProperties).toContain('feeModel');
    expect(errorProperties).toContain('feeValue');
  });

  it('rejects unsupported project fee models', async () => {
    const errors = await validatePayload({
      ...validPayload,
      feeModel: 'ladrillo',
    });

    expect(errors.map((error) => error.property)).toContain('feeModel');
  });

  it('does not require unit cost when creating a project', async () => {
    const errors = await validatePayload({
      feeModel: 'fixed',
      feeValue: 125.5,
      idProduct: 10,
      units: 25,
    });

    expect(errors.map((error) => error.property)).not.toContain('unitCost');
  });

  it('does not require unit fields when creating a project', async () => {
    const errors = await validatePayload({
      feeModel: 'fixed',
      feeValue: 125.5,
      idProduct: 10,
    });

    expect(errors.map((error) => error.property)).not.toContain('units');
    expect(errors.map((error) => error.property)).not.toContain('unitCost');
  });
});
