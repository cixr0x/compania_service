import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

describe('Product DTO validation', () => {
  it('accepts an owner-retained profit percentage when creating a product', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: 'Maple Shelf',
      ownership: 15,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain('ownership');
    expect(dto.ownership).toBe(15);
  });

  it('allows omitting ownership when updating a product', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      name: 'Maple Shelf',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain('ownership');
  });

  it('rejects ownership percentages over 100', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: 'Maple Shelf',
      ownership: 125,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('ownership');
  });
});
