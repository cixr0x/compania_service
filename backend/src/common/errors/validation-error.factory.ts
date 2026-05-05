import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export type StructuredValidationError = {
  field: string;
  message: string;
};

export function flattenValidationErrors(
  errors: ValidationError[],
): StructuredValidationError[] {
  return errors.flatMap((error) => flattenValidationError(error));
}

export function createValidationException(
  errors: ValidationError[],
): BadRequestException {
  return new BadRequestException({
    message: 'Validation failed',
    errors: flattenValidationErrors(errors),
  });
}

function flattenValidationError(
  error: ValidationError,
  parentPath?: string,
): StructuredValidationError[] {
  const path = parentPath ? `${parentPath}.${error.property}` : error.property;
  const constraintErrors = Object.values(error.constraints ?? {}).map(
    (message) => ({
      field: path,
      message,
    }),
  );
  const childErrors = (error.children ?? []).flatMap((child) =>
    flattenValidationError(child, path),
  );

  return [...constraintErrors, ...childErrors];
}
