import { ModelsService } from './models.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ModelsService', () => {
  const prisma = {
    pricingModel: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates a pricing model with code, name, and description', async () => {
    jest.spyOn(prisma.pricingModel, 'create').mockResolvedValue({
      idModel: 1,
      code: 'retail',
      name: 'Retail',
      description: 'Retail pricing',
    });

    const service = new ModelsService(prisma);
    const result = await service.create({
      code: 'retail',
      name: 'Retail',
      description: 'Retail pricing',
    });

    expect(prisma.pricingModel.create).toHaveBeenCalledWith({
      data: { code: 'retail', name: 'Retail', description: 'Retail pricing' },
    });
    expect(result.code).toBe('retail');
    expect(result.name).toBe('Retail');
  });

  it('searches pricing models by code or name', async () => {
    jest.spyOn(prisma.pricingModel, 'findMany').mockResolvedValue([]);

    const service = new ModelsService(prisma);
    await service.findAll({ page: 2, pageSize: 10, search: 'retail' });

    expect(prisma.pricingModel.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          { code: { contains: 'retail' } },
          { name: { contains: 'retail' } },
        ],
      },
      orderBy: { idModel: 'desc' },
      skip: 10,
      take: 10,
    });
  });
});
