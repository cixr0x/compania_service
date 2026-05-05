import { BadRequestException } from '@nestjs/common';
import { ProjectStakeholdersService } from './project-stakeholders.service';

describe('ProjectStakeholdersService', () => {
  const transactionPrisma = {
    $queryRaw: jest.fn(),
    projectStakeholder: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  const prisma = {
    $transaction: jest.fn((callback) => callback(transactionPrisma)),
    projectStakeholder: {
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) => callback(transactionPrisma));
  });

  it('allows a project stakeholder write when the project total remains 100', async () => {
    jest.spyOn(transactionPrisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 1, idProject: 10, idStakeholder: 1, stakePercentage: '60.00' },
    ]);
    jest.spyOn(transactionPrisma.projectStakeholder, 'create').mockResolvedValue({
      idProjectStakeholder: 2,
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: '40.00',
    });

    const service = new ProjectStakeholdersService(prisma);
    await service.create({ idProject: 10, idStakeholder: 2, stakePercentage: 40 });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(transactionPrisma.$queryRaw).toHaveBeenCalled();
    expect(transactionPrisma.projectStakeholder.findMany).toHaveBeenCalled();
    expect(transactionPrisma.projectStakeholder.create).toHaveBeenCalled();
    expect(prisma.projectStakeholder.findMany).not.toHaveBeenCalled();
    expect(prisma.projectStakeholder.create).not.toHaveBeenCalled();
  });

  it('rejects a project stakeholder write when the project total exceeds 100', async () => {
    jest.spyOn(transactionPrisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 1, idProject: 10, idStakeholder: 1, stakePercentage: '80.00' },
    ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.create({ idProject: 10, idStakeholder: 2, stakePercentage: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('checks the destination project total when moving a stakeholder row to another project', async () => {
    jest.spyOn(transactionPrisma.projectStakeholder, 'findUnique').mockResolvedValue({
      idProjectStakeholder: 1,
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: '30.00',
    });
    jest.spyOn(transactionPrisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 3, idProject: 20, idStakeholder: 3, stakePercentage: '80.00' },
    ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.update(1, { idProject: 20, idStakeholder: 2, stakePercentage: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows updating the same row percentage when the destination project total remains 100', async () => {
    jest.spyOn(transactionPrisma.projectStakeholder, 'findUnique').mockResolvedValue({
      idProjectStakeholder: 1,
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: '30.00',
    });
    jest.spyOn(transactionPrisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 1, idProject: 10, idStakeholder: 2, stakePercentage: '30.00' },
      { idProjectStakeholder: 3, idProject: 10, idStakeholder: 3, stakePercentage: '60.00' },
    ]);
    jest.spyOn(transactionPrisma.projectStakeholder, 'update').mockResolvedValue({
      idProjectStakeholder: 1,
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: '40.00',
    });

    const service = new ProjectStakeholdersService(prisma);
    await service.update(1, { stakePercentage: 40 });

    expect(transactionPrisma.projectStakeholder.update).toHaveBeenCalled();
  });

  it('uses the current percentage when moving a stakeholder row without stakePercentage', async () => {
    jest.spyOn(transactionPrisma.projectStakeholder, 'findUnique').mockResolvedValue({
      idProjectStakeholder: 1,
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: '30.00',
    });
    jest.spyOn(transactionPrisma.projectStakeholder, 'findMany').mockResolvedValue([
      { idProjectStakeholder: 3, idProject: 20, idStakeholder: 3, stakePercentage: '60.00' },
    ]);
    jest.spyOn(transactionPrisma.projectStakeholder, 'update').mockResolvedValue({
      idProjectStakeholder: 1,
      idProject: 20,
      idStakeholder: 2,
      stakePercentage: '30.00',
    });

    const service = new ProjectStakeholdersService(prisma);
    await service.update(1, { idProject: 20 });

    expect(transactionPrisma.projectStakeholder.update).toHaveBeenCalledWith({
      where: { idProjectStakeholder: 1 },
      data: { idProject: 20 },
    });
  });

  it('locks the project stakeholder row before reading project identity during update', async () => {
    const operations: string[] = [];
    jest.spyOn(transactionPrisma, '$queryRaw').mockImplementation(() => {
      operations.push('raw-lock');
      return Promise.resolve([]);
    });
    jest.spyOn(transactionPrisma.projectStakeholder, 'findUnique').mockImplementation(() => {
      operations.push('read-row');
      return Promise.resolve({
        idProjectStakeholder: 1,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '30.00',
      });
    });
    jest.spyOn(transactionPrisma.projectStakeholder, 'findMany').mockImplementation(() => {
      operations.push('validate-total');
      return Promise.resolve([
        { idProjectStakeholder: 1, idProject: 10, idStakeholder: 2, stakePercentage: '30.00' },
        { idProjectStakeholder: 3, idProject: 10, idStakeholder: 3, stakePercentage: '60.00' },
      ]);
    });
    jest.spyOn(transactionPrisma.projectStakeholder, 'update').mockImplementation(() => {
      operations.push('update-row');
      return Promise.resolve({
        idProjectStakeholder: 1,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '40.00',
      });
    });

    const service = new ProjectStakeholdersService(prisma);
    await service.update(1, { stakePercentage: 40 });

    expect(operations[0]).toBe('raw-lock');
    expect(operations.indexOf('read-row')).toBeGreaterThan(operations.indexOf('raw-lock'));
    expect(operations.indexOf('update-row')).toBeGreaterThan(operations.lastIndexOf('raw-lock'));
  });
});
