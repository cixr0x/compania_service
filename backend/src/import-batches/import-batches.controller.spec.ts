import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { createValidationException } from '../common/errors/validation-error.factory';
import { ImportBatchesController } from './import-batches.controller';
import { ImportBatchesService } from './import-batches.service';

describe('ImportBatchesController', () => {
  let app: INestApplication;
  const importBatchesService = {
    updateStageRow: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ImportBatchesController],
      providers: [
        {
          provide: ImportBatchesService,
          useValue: importBatchesService,
        },
      ],
    }).compile();

    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        exceptionFactory: createValidationException,
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('accepts stage row project updates with both route params validated', async () => {
    importBatchesService.updateStageRow.mockResolvedValue({
      idImportStage: 45,
      idProject: 5,
    });

    await request(app.getHttpServer())
      .patch('/import-batches/13/stage/45')
      .send({ idProject: 5 })
      .expect(200);

    expect(importBatchesService.updateStageRow).toHaveBeenCalledWith(13, 45, {
      idProject: 5,
    });
  });
});
