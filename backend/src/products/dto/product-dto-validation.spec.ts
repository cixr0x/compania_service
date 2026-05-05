import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CreateProductDto } from './create-product.dto';
import { UpdateProductDto } from './update-product.dto';

describe('Product DTO validation', () => {
  it('requires model id when creating a product', async () => {
    const dto = plainToInstance(CreateProductDto, {
      name: 'Maple Shelf',
      ownership: 15,
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('idModel');
  });

  it('allows omitting model id when updating a product', async () => {
    const dto = plainToInstance(UpdateProductDto, {
      name: 'Maple Shelf',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).not.toContain('idModel');
  });
});
