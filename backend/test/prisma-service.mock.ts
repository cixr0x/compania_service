import type { PrismaService } from '../src/prisma/prisma.service';

export function asPrismaService<TMock extends object>(
  mock: TMock,
): PrismaService {
  return mock as unknown as PrismaService;
}
