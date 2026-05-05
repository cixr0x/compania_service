import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { IdParamDto } from '../common/dto/id-param.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateSaleDto } from './dto/create-sale.dto';
import { UpdateSaleDto } from './dto/update-sale.dto';
import { SalesService } from './sales.service';

@Controller('sales')
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post()
  create(@Body() dto: CreateSaleDto) {
    return this.salesService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.salesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.salesService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateSaleDto) {
    return this.salesService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.salesService.remove(params.id);
  }
}
