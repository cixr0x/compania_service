import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProductDto } from './dto/update-product.dto';

describe('ProductsService', () => {
  const prisma = {
    product: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
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

  it('defaults omitted ownership to zero on create', async () => {
    jest.spyOn(prisma.product, 'create').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      ownership: '0.00',
    });

    const service = new ProductsService(prisma);
    await service.create({ name: 'Starter Kit' });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: { name: 'Starter Kit', ownership: 0 },
    });
  });

  it('does not include ownership in update data when ownership is omitted', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      ownership: '15.00',
    });
    jest.spyOn(prisma.product, 'update').mockResolvedValue({
      id: 1,
      name: 'Changed',
      ownership: '15.00',
    });

    const service = new ProductsService(prisma);
    const dto = Object.assign(new UpdateProductDto(), { name: 'Changed' });
    await service.update(1, dto);

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Changed' },
    });
  });

  it('normalizes blank external product IDs to undefined', async () => {
    jest.spyOn(prisma.product, 'create').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      idEcommerce: null,
      idStore: null,
      idEvent: null,
      idSurface: null,
      ownership: '0.00',
    });

    const service = new ProductsService(prisma);
    await service.create({
      name: ' Starter Kit ',
      idEcommerce: '   ',
      idStore: '',
      idEvent: ' EVT-1 ',
      idSurface: '\t',
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Starter Kit',
        idEcommerce: undefined,
        idStore: undefined,
        idEvent: 'EVT-1',
        idSurface: undefined,
        ownership: 0,
      },
    });
  });
});
