import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { IdParamDto } from '../common/dto/id-param.dto';
import { CreateImportBatchDto } from './dto/create-import-batch.dto';
import { UpdateImportBatchDto } from './dto/update-import-batch.dto';
import { ImportBatchesService } from './import-batches.service';

@Controller('import-batches')
export class ImportBatchesController {
  constructor(private readonly importBatchesService: ImportBatchesService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  create(
    @Body() dto: CreateImportBatchDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.importBatchesService.create(dto, file);
  }

  @Get()
  findAll() {
    return this.importBatchesService.findAll();
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.importBatchesService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateImportBatchDto) {
    return this.importBatchesService.update(params.id, dto);
  }

  @Get(':id/stage')
  stageRows(@Param() params: IdParamDto) {
    return this.importBatchesService.stageRows(params.id);
  }

  @Get(':id/errors')
  errors(@Param() params: IdParamDto) {
    return this.importBatchesService.errors(params.id);
  }

  @Post(':id/validate')
  validate(@Param() params: IdParamDto) {
    return this.importBatchesService.validate(params.id);
  }

  @Post(':id/commit')
  commit(@Param() params: IdParamDto) {
    return this.importBatchesService.commit(params.id);
  }

  @Post(':id/cancel')
  cancel(@Param() params: IdParamDto) {
    return this.importBatchesService.cancel(params.id);
  }
}
