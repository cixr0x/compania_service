import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReplaceStakeholderProjectTransactionDto } from './replace-stakeholder-project-transaction.dto';

describe('ReplaceStakeholderProjectTransactionDto', () => {
  it('accepts stakeholder transaction rows with supported transaction types', async () => {
    const dto = plainToInstance(ReplaceStakeholderProjectTransactionDto, {
      amount: '100.50',
      date: '2026-05-05',
      description: ' Distribution ',
      transactionType: 'payment',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.amount).toBe(100.5);
    expect(dto.description).toBe('Distribution');
    expect(dto.transactionType).toBe('payment');
  });

  it('rejects unsupported stakeholder transaction types', async () => {
    const dto = plainToInstance(ReplaceStakeholderProjectTransactionDto, {
      amount: 100,
      date: '2026-05-05',
      description: 'Distribution',
      transactionType: 'refund',
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain('transactionType');
  });
});
