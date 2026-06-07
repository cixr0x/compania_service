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
      idModel: null,
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
        ownership: 15,
        tag: 'starter',
      },
    });
  });

  it('creates a product with a fee amount', async () => {
    jest.spyOn(prisma.product, 'create').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      feeAmount: '125.50',
    });

    const service = new ProductsService(prisma);
    await service.create({
      name: 'Starter Kit',
      feeAmount: 125.5,
    });

    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Starter Kit',
        feeAmount: 125.5,
        ownership: 0,
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

  it('updates a product fee amount when provided', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      feeAmount: '125.50',
    });
    jest.spyOn(prisma.product, 'update').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      feeAmount: '150.75',
    });

    const service = new ProductsService(prisma);
    await service.update(1, { feeAmount: 150.75 });

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { feeAmount: 150.75 },
    });
  });

  it('preserves blank optional strings as empty strings when updating a product', async () => {
    jest.spyOn(prisma.product, 'findUnique').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      ownership: '15.00',
    });
    jest.spyOn(prisma.product, 'update').mockResolvedValue({
      id: 1,
      name: 'Starter Kit',
      description: '',
      image: '',
      idEcommerce: '',
      ownership: '15.00',
    });

    const service = new ProductsService(prisma);
    await service.update(1, {
      description: '',
      image: '   ',
      idEcommerce: '',
    });

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: {
        description: '',
        image: '',
        idEcommerce: '',
      },
    });
  });

  it('trims optional product strings while preserving empty strings', async () => {
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
        idEcommerce: '',
        idStore: '',
        idEvent: 'EVT-1',
        idSurface: '',
        ownership: 0,
      },
    });
  });
});
