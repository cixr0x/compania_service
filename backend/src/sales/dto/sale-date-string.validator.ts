import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
} from 'class-validator';

export function IsSaleDateString(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isSaleDateString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown) {
          return typeof value === 'string' && isValidSaleDateString(value);
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be a valid calendar date in YYYY-MM-DD format`;
        },
      },
    });
  };
}

export function parseSaleDate(value: string): Date | null {
  if (!isValidSaleDateString(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

function isValidSaleDateString(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
