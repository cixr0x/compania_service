import { PrismaService } from '../prisma/prisma.service';
import { ProjectsService } from './projects.service';

type ProjectCreateMock = (args: {
  data: {
    idProduct: number;
    units: number;
    unitCost: number;
    productionCost: number;
    adminCost: number;
  };
}) => Promise<unknown>;

describe('ProjectsService', () => {
  const projectCreate = jest.fn<ProjectCreateMock>();
  const prisma = {
    project: {
      create: projectCreate,
    },
  } as unknown as PrismaService;

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates projects with production cost', async () => {
    const service = new ProjectsService(prisma);
    await service.create({
      idProduct: 42,
      units: 10,
      unitCost: 4.5,
      productionCost: 7.75,
      adminCost: 2.25,
    });

    expect(projectCreate).toHaveBeenCalledWith({
      data: {
        idProduct: 42,
        units: 10,
        unitCost: 4.5,
        productionCost: 7.75,
        adminCost: 2.25,
      },
    });
  });
});
