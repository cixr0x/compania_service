import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ProductsService', () => {
  const prisma = {
    product: {
      create: jest.fn(),
    },
  } as any;

  beforeEach(() => jest.clearAllMocks());

  it('creates a product with external IDs and ownership percentage', async () => {
    jest.spyOn(prisma.product, 'create').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      description: 'Kit',
      image: null,
      idEcommerce: 'EC-1',
      idStore: null,
      idEvent: null,
      idSurface: null,
      idModel: 2,
      ownership: '15.00',
      tag: 'starter',
    });

    const service = new ProductsService(prisma);
    await service.create({
      name: 'Starter Kit',
      description: 'Kit',
      image: undefined,
      idEcommerce: 'EC-1',
      idStore: undefined,
      idEvent: undefined,
      idSurface: undefined,
      idModel: 2,
      ownership: 15,
      tag: 'starter',
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Starter Kit',
        description: 'Kit',
        image: undefined,
        idEcommerce: 'EC-1',
        idStore: undefined,
        idEvent: undefined,
        idSurface: undefined,
        idModel: 2,
        ownership: 15,
        tag: 'starter',
      },
    });
  });
});
