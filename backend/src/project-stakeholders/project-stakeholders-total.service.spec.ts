import { BadRequestException } from '@nestjs/common';
import { ProjectStakeholdersTotalService } from './project-stakeholders-total.service';

describe('ProjectStakeholdersTotalService', () => {
  const prisma = {
    projectStakeholder: {
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('returns valid when project stakeholder total is exactly 100', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([
      { stakePercentage: '55.00' },
      { stakePercentage: '45.00' },
    ]);

    const service = new ProjectStakeholdersTotalService(prisma);

    await expect(service.validateTotal(10)).resolves.toEqual({ valid: true });
  });

  it('throws BadRequestException when project stakeholder total is not exactly 100', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([
      { stakePercentage: '55.00' },
      { stakePercentage: '40.00' },
    ]);

    const service = new ProjectStakeholdersTotalService(prisma);

    await expect(service.validateTotal(10)).rejects.toBeInstanceOf(BadRequestException);
  });
});
