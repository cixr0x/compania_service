import { BadRequestException } from '@nestjs/common';
import { ProjectStakeholdersService } from './project-stakeholders.service';

describe('ProjectStakeholdersService', () => {
  const transactionPrisma = {
    $queryRaw: jest.fn(),
    projectStakeholder: {
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  const prisma = {
    $transaction: jest.fn((callback) => callback(transactionPrisma)),
    projectStakeholder: {
      create: jest.fn(),
      createMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation((callback) =>
      callback(transactionPrisma),
    );
  });

  it('allows a project stakeholder write when the project total remains 100', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValue([
        {
          idProjectStakeholder: 1,
          idProject: 10,
          idStakeholder: 1,
          stakePercentage: '60.00',
        },
      ]);
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'create')
      .mockResolvedValue({
        idProjectStakeholder: 2,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '40.00',
      });

    const service = new ProjectStakeholdersService(prisma);
    await service.create({
      idProject: 10,
      idStakeholder: 2,
      stakePercentage: 40,
    });

    expect(prisma.$transaction).toHaveBeenCalled();
    expect(transactionPrisma.$queryRaw).toHaveBeenCalled();
    expect(transactionPrisma.projectStakeholder.findMany).toHaveBeenCalled();
    expect(transactionPrisma.projectStakeholder.create).toHaveBeenCalled();
    expect(prisma.projectStakeholder.findMany).not.toHaveBeenCalled();
    expect(prisma.projectStakeholder.create).not.toHaveBeenCalled();
  });

  it('rejects a project stakeholder write when the project total exceeds 100', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValue([
        {
          idProjectStakeholder: 1,
          idProject: 10,
          idStakeholder: 1,
          stakePercentage: '80.00',
        },
      ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.create({ idProject: 10, idStakeholder: 2, stakePercentage: 30 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a project stakeholder write when the project total is below 100', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValue([
        {
          idProjectStakeholder: 1,
          idProject: 10,
          idStakeholder: 1,
          stakePercentage: '40.00',
        },
      ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.create({ idProject: 10, idStakeholder: 2, stakePercentage: 30 }),
    ).rejects.toThrow(
      new BadRequestException('Project stakeholder total must equal 100'),
    );
    expect(transactionPrisma.projectStakeholder.create).not.toHaveBeenCalled();
  });

  it('finds all stakeholder split rows for one project without pagination', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([
      {
        idProjectStakeholder: 1,
        idProject: 10,
        idStakeholder: 1,
        stakePercentage: '60.00',
      },
      {
        idProjectStakeholder: 2,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '40.00',
      },
    ]);

    const service = new ProjectStakeholdersService(prisma);
    await service.findByProject(10);

    expect(prisma.projectStakeholder.findMany).toHaveBeenCalledWith({
      where: { idProject: 10 },
      include: expect.any(Object),
      orderBy: { idProjectStakeholder: 'desc' },
    });
  });

  it('loads project product and stakeholder names for list table display', async () => {
    jest.spyOn(prisma.projectStakeholder, 'findMany').mockResolvedValue([]);

    const service = new ProjectStakeholdersService(prisma);
    await service.findAll({ page: 1, pageSize: 25 });

    expect(prisma.projectStakeholder.findMany).toHaveBeenCalledWith({
      include: {
        project: { include: { product: true } },
        stakeholder: true,
      },
      orderBy: { idProjectStakeholder: 'desc' },
      skip: 0,
      take: 25,
    });
  });

  it('checks the destination project total when moving a stakeholder row to another project', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findUnique')
      .mockResolvedValue({
        idProjectStakeholder: 1,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '30.00',
      });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValue([
        {
          idProjectStakeholder: 3,
          idProject: 20,
          idStakeholder: 3,
          stakePercentage: '80.00',
        },
      ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.update(1, {
        idProject: 20,
        idStakeholder: 2,
        stakePercentage: 30,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('allows updating the same row percentage when the destination project total remains 100', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findUnique')
      .mockResolvedValue({
        idProjectStakeholder: 1,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '30.00',
      });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValue([
        {
          idProjectStakeholder: 1,
          idProject: 10,
          idStakeholder: 2,
          stakePercentage: '30.00',
        },
        {
          idProjectStakeholder: 3,
          idProject: 10,
          idStakeholder: 3,
          stakePercentage: '60.00',
        },
      ]);
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'update')
      .mockResolvedValue({
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
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findUnique')
      .mockResolvedValue({
        idProjectStakeholder: 1,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '30.00',
      });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValueOnce([
        {
          idProjectStakeholder: 1,
          idProject: 10,
          idStakeholder: 2,
          stakePercentage: '30.00',
        },
        {
          idProjectStakeholder: 3,
          idProject: 10,
          idStakeholder: 3,
          stakePercentage: '100.00',
        },
      ])
      .mockResolvedValueOnce([
        {
          idProjectStakeholder: 4,
          idProject: 20,
          idStakeholder: 4,
          stakePercentage: '70.00',
        },
      ]);
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'update')
      .mockResolvedValue({
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

  it('rejects moving a stakeholder row when the source project total would stop being 100', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findUnique')
      .mockResolvedValue({
        idProjectStakeholder: 1,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '30.00',
      });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValueOnce([
        {
          idProjectStakeholder: 1,
          idProject: 10,
          idStakeholder: 2,
          stakePercentage: '30.00',
        },
        {
          idProjectStakeholder: 3,
          idProject: 10,
          idStakeholder: 3,
          stakePercentage: '70.00',
        },
      ])
      .mockResolvedValueOnce([
        {
          idProjectStakeholder: 4,
          idProject: 20,
          idStakeholder: 4,
          stakePercentage: '70.00',
        },
      ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.update(1, { idProject: 20, stakePercentage: 30 }),
    ).rejects.toThrow(
      new BadRequestException('Project stakeholder total must equal 100'),
    );
    expect(transactionPrisma.projectStakeholder.update).not.toHaveBeenCalled();
  });

  it('rejects deleting a stakeholder row when the project total would stop being 100', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findUnique')
      .mockResolvedValue({
        idProjectStakeholder: 1,
        idProject: 10,
        idStakeholder: 2,
        stakePercentage: '30.00',
      });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValue([
        {
          idProjectStakeholder: 1,
          idProject: 10,
          idStakeholder: 2,
          stakePercentage: '30.00',
        },
        {
          idProjectStakeholder: 3,
          idProject: 10,
          idStakeholder: 3,
          stakePercentage: '70.00',
        },
      ]);

    const service = new ProjectStakeholdersService(prisma);

    await expect(service.remove(1)).rejects.toThrow(
      new BadRequestException('Project stakeholder total must equal 100'),
    );
    expect(transactionPrisma.projectStakeholder.delete).not.toHaveBeenCalled();
  });

  it('replaces a project split atomically when submitted stakeholder total is exactly 100', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'deleteMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'createMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValue([
        {
          idProjectStakeholder: 10,
          idProject: 10,
          idStakeholder: 1,
          stakePercentage: '25.00',
        },
        {
          idProjectStakeholder: 11,
          idProject: 10,
          idStakeholder: 2,
          stakePercentage: '75.00',
        },
      ]);

    const service = new ProjectStakeholdersService(prisma);
    await service.replaceProjectSplit(10, [
      { idStakeholder: 1, stakePercentage: 25 },
      { idStakeholder: 2, stakePercentage: 75 },
    ]);

    expect(transactionPrisma.$queryRaw).toHaveBeenCalled();
    expect(
      transactionPrisma.projectStakeholder.deleteMany,
    ).toHaveBeenCalledWith({
      where: { idProject: 10 },
    });
    expect(
      transactionPrisma.projectStakeholder.createMany,
    ).toHaveBeenCalledWith({
      data: [
        { idProject: 10, idStakeholder: 1, stakePercentage: 25 },
        { idProject: 10, idStakeholder: 2, stakePercentage: 75 },
      ],
    });
  });

  it('allows replacing a project split with no stakeholder rows', async () => {
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'deleteMany')
      .mockResolvedValue({ count: 2 });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockResolvedValue([]);

    const service = new ProjectStakeholdersService(prisma);
    const result = await service.replaceProjectSplit(10, []);

    expect(result).toEqual([]);
    expect(transactionPrisma.$queryRaw).toHaveBeenCalled();
    expect(
      transactionPrisma.projectStakeholder.deleteMany,
    ).toHaveBeenCalledWith({
      where: { idProject: 10 },
    });
    expect(
      transactionPrisma.projectStakeholder.createMany,
    ).not.toHaveBeenCalled();
  });

  it('rejects replacing a project split when submitted stakeholder total is not exactly 100', async () => {
    const service = new ProjectStakeholdersService(prisma);

    await expect(
      service.replaceProjectSplit(10, [
        { idStakeholder: 1, stakePercentage: 25 },
        { idStakeholder: 2, stakePercentage: 70 },
      ]),
    ).rejects.toThrow(
      new BadRequestException('Project stakeholder total must equal 100'),
    );
    expect(
      transactionPrisma.projectStakeholder.deleteMany,
    ).not.toHaveBeenCalled();
    expect(
      transactionPrisma.projectStakeholder.createMany,
    ).not.toHaveBeenCalled();
  });

  it('locks the project stakeholder row before reading project identity during update', async () => {
    const operations: string[] = [];
    jest.spyOn(transactionPrisma, '$queryRaw').mockImplementation(() => {
      operations.push('raw-lock');
      return Promise.resolve([]);
    });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findUnique')
      .mockImplementation(() => {
        operations.push('read-row');
        return Promise.resolve({
          idProjectStakeholder: 1,
          idProject: 10,
          idStakeholder: 2,
          stakePercentage: '30.00',
        });
      });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'findMany')
      .mockImplementation(() => {
        operations.push('validate-total');
        return Promise.resolve([
          {
            idProjectStakeholder: 1,
            idProject: 10,
            idStakeholder: 2,
            stakePercentage: '30.00',
          },
          {
            idProjectStakeholder: 3,
            idProject: 10,
            idStakeholder: 3,
            stakePercentage: '60.00',
          },
        ]);
      });
    jest
      .spyOn(transactionPrisma.projectStakeholder, 'update')
      .mockImplementation(() => {
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
    expect(operations.indexOf('read-row')).toBeGreaterThan(
      operations.indexOf('raw-lock'),
    );
    expect(operations.indexOf('update-row')).toBeGreaterThan(
      operations.lastIndexOf('raw-lock'),
    );
  });
});
