import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProjectDto } from './create-project.dto';

describe('CreateProjectDto', () => {
  const validPayload = {
    idProduct: 10,
    units: 25,
    unitCost: 12.5,
    productionCost: 125,
    adminCost: 15,
    costAdjustment: -10.5,
    adjustmentDescription: 'Damaged packaging discount',
  };

  async function validatePayload(payload: Record<string, unknown>) {
    return validate(plainToInstance(CreateProjectDto, payload));
  }

  it('requires production cost when creating a project', async () => {
    const payload: Partial<typeof validPayload> = { ...validPayload };
    delete payload.productionCost;

    const errors = await validatePayload(payload);

    expect(errors.map((error) => error.property)).toContain('productionCost');
  });

  it('rejects negative production cost values', async () => {
    const errors = await validatePayload({
      ...validPayload,
      productionCost: -1,
    });

    expect(errors.map((error) => error.property)).toContain('productionCost');
  });

  it('accepts a signed project cost adjustment with a text description', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      ...validPayload,
      costAdjustment: '-10.50',
      adjustmentDescription: 'Damaged packaging discount',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain(
      'costAdjustment',
    );
    expect(errors.map((error) => error.property)).not.toContain(
      'adjustmentDescription',
    );
    expect(dto.costAdjustment).toBe(-10.5);
  });
});
