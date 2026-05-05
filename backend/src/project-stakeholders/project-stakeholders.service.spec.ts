import { BadRequestException } from '@nestjs/common';
import { ProjectStakeholdersService } from './project-stakeholders.service';

describe('ProjectStakeholdersService', () => {
  const prisma = {
    projectStakeholder: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('allows a project stakeholder write when the project total remains 100', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 1, idProject: 10, idStakeholder: 1, stakePercentage: '60.00' },
    ]);
    jest.spyOn(prisma.projectStakeholder, 'create').mockResolvedValue({
      idProjectStakeholder: 2,
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: '40.00',
    });

    const service = new ProjectStakeholdersService(prisma);
    await service.create({ idProject: 10, idStakeholder: 2, stakePercentage: 40 });

    expect(prisma.projectStakeholder.create).toHaveBeenCalled();
  });

  it('rejects a project stakeholder write when the project total exceeds 100', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 1, idProject: 10, idStakeholder: 1, stakePercentage: '80.00' },
    ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.create({ idProject: 10, idStakeholder: 2, stakePercentage: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks the destination project total when moving a stakeholder row to another project', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findUnique').mockResolvedValue({
      idProjectStakeholder: 1,
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: '30.00',
    });
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 3, idProject: 20, idStakeholder: 3, stakePercentage: '80.00' },
    ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.update(1, { idProject: 20, idStakeholder: 2, stakePercentage: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
