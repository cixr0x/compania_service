import { SettingsService } from './settings.service';

describe('SettingsService', () => {
  const prisma = {
    setting: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates a setting with a unique code and text value', async () => {
    jest.spyOn(prisma.setting, 'create').mockResolvedValue({
      id: 1,
      code: 'default_margin',
      name: 'Default Margin',
      description: 'Default margin used by future sale calculations',
      value: '16',
    });

    const service = new SettingsService(prisma);
    const result = await service.create({
      code: 'default_margin',
      name: 'Default Margin',
      description: 'Default margin used by future sale calculations',
      value: '16',
    });

    expect(prisma.setting.create).toHaveBeenCalledWith({
      data: {
        code: 'default_margin',
        name: 'Default Margin',
        description: 'Default margin used by future sale calculations',
        value: '16',
      },
    });
    expect(result.code).toBe('default_margin');
  });

  it('searches settings by code or name', async () => {
    jest.spyOn(prisma.setting, 'findMany').mockResolvedValue([]);

    const service = new SettingsService(prisma);
    await service.findAll({ page: 2, pageSize: 10, search: 'margin' });

    expect(prisma.setting.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { code: { contains: 'margin' } },
          { name: { contains: 'margin' } },
        ],
      },
      orderBy: { id: 'desc' },
      skip: 10,
      take: 10,
    });
  });
});
