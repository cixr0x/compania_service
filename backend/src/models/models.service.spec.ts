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

  it('creates a pricing model with name and description', async () => {
    jest.spyOn(prisma.pricingModel, 'create').mockResolvedValue({
      idModel: 1,
      name: 'Retail',
      description: 'Retail pricing',
    });

    const service = new ModelsService(prisma);
    const result = await service.create({
      name: 'Retail',
      description: 'Retail pricing',
    });

    expect(prisma.pricingModel.create).toHaveBeenCalledWith({
      data: { name: 'Retail', description: 'Retail pricing' },
    });
    expect(result.name).toBe('Retail');
  });
});
