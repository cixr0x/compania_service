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
import { CreateSettingDto } from './dto/create-setting.dto';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { SettingsService } from './settings.service';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Post()
  create(@Body() dto: CreateSettingDto) {
    return this.settingsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.settingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: IdParamDto) {
    return this.settingsService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: IdParamDto, @Body() dto: UpdateSettingDto) {
    return this.settingsService.update(params.id, dto);
  }

  @Delete(':id')
  remove(@Param() params: IdParamDto) {
    return this.settingsService.remove(params.id);
  }
}
