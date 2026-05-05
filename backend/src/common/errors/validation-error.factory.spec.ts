import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { HttpExceptionFilter } from './http-exception.filter';
import {
  createValidationException,
  flattenValidationErrors,
} from './validation-error.factory';

describe('validation error factory', () => {
  it('flattens validation errors with nested property paths', () => {
    const errors: ValidationError[] = [
      {
        property: 'name',
        constraints: {
          isNotEmpty: 'name must not be empty',
        },
      },
      {
        property: 'items',
        children: [
          {
            property: '0',
            children: [
              {
                property: 'quantity',
                constraints: {
                  min: 'quantity must not be less than 1',
                },
              },
            ],
          },
        ],
      },
    ];

    expect(flattenValidationErrors(errors)).toEqual([
      { field: 'name', message: 'name must not be empty' },
      { field: 'items.0.quantity', message: 'quantity must not be less than 1' },
    ]);
  });

  it('creates a validation exception with structured errors', () => {
    const exception = createValidationException([
      {
        property: 'pageSize',
        constraints: {
          max: 'pageSize must not be greater than 100',
        },
      },
    ]);

    expect(exception.getResponse()).toEqual({
      message: 'Validation failed',
      errors: [
        {
          field: 'pageSize',
          message: 'pageSize must not be greater than 100',
        },
      ],
    });
  });

  it('preserves structured errors already present in exception responses', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    };
    const exception = new BadRequestException({
      message: 'Validation failed',
      errors: [{ field: 'name', message: 'name must not be empty' }],
    });

    new HttpExceptionFilter().catch(exception, host as never);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({
      message: 'Validation failed',
      errors: [{ field: 'name', message: 'name must not be empty' }],
    });
  });
});
