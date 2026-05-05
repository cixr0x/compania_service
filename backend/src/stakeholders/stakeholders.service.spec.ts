import { StakeholdersService } from './stakeholders.service';
import { PrismaService } from '../prisma/prisma.service';

describe('StakeholdersService', () => {
  const prisma = {
    stakeholder: {
      create: jest.fn(),
      findUnique: jest.fn(),
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

  it('loads project participation when reading one stakeholder', async () => {
    jest.spyOn(prisma.stakeholder, 'findUnique').mockResolvedValue({
      idStakeholder: 10,
      name: 'Alicia',
      projects: [
        {
          idProjectStakeholder: 501,
          idProject: 77,
          idStakeholder: 10,
          project: {
            idProject: 77,
            product: { id: 42, name: 'Maple Shelf' },
          },
          stakePercentage: 60,
        },
      ],
    });

    const service = new StakeholdersService(prisma as PrismaService);
    const result = await service.findOne(10);

    expect(prisma.stakeholder.findUnique).toHaveBeenCalledWith({
      where: { idStakeholder: 10 },
      include: {
        projects: {
          include: {
            project: {
              include: {
                product: true,
              },
            },
          },
          orderBy: { idProjectStakeholder: 'desc' },
        },
      },
    });
    expect(result.projects[0].project.product.name).toBe('Maple Shelf');
  });
});
