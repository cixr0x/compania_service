import { StakeholdersService } from './stakeholders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StakeholdersService', () => {
  const prisma = {
    stakeholder: {
      create: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates a stakeholder by name', async () => {
    jest.spyOn(prisma.stakeholder, 'create').mockResolvedValue({
      idStakeholder: 1,
      name: 'Primary Investor',
    });

    const service = new StakeholdersService(prisma);
    const result = await service.create({ name: 'Primary Investor' });

    expect(prisma.stakeholder.create).toHaveBeenCalledWith({
      data: { name: 'Primary Investor' },
    });
    expect(result.idStakeholder).toBe(1);
  });
});
