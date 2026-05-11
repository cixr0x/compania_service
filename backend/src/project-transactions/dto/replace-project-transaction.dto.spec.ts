import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReplaceProjectTransactionDto } from './replace-project-transaction.dto';

describe('ReplaceProjectTransactionDto', () => {
  it('requires a valid transaction date', async () => {
    const missingDateDto = plainToInstance(ReplaceProjectTransactionDto, {
      amount: 100,
      description: 'Production run',
    });
    const invalidDateDto = plainToInstance(ReplaceProjectTransactionDto, {
      amount: 100,
      date: '2026-02-31',
      description: 'Production run',
    });

    await expect(validate(missingDateDto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'date' })]),
    );
    await expect(validate(invalidDateDto)).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ property: 'date' })]),
    );
  });

  it('accepts complete project transaction rows', async () => {
    const dto = plainToInstance(ReplaceProjectTransactionDto, {
      amount: '100.50',
      date: '2026-05-05',
      description: ' Production run ',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.amount).toBe(100.5);
    expect(dto.date).toBe('2026-05-05');
    expect(dto.description).toBe('Production run');
  });
});
