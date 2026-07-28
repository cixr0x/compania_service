import type { Prisma } from '@prisma/client';
import type { PrismaService } from '../src/prisma/prisma.service';

export function asPrismaService<TMock extends object>(
  mock: TMock,
): PrismaService {
  return mock as unknown as PrismaService;
}

export function asPrismaTransactionClient<TMock extends object>(
  mock: TMock,
): Prisma.TransactionClient {
  return mock as unknown as Prisma.TransactionClient;
}
