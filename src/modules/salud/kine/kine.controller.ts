import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { KineService } from './kine.service';
import { CreateKineDto } from './dto/create-kine.dto';
import { UpdateKineDto } from './dto/update-kine.dto';

@Controller('kine')
export class KineController {
  constructor(private readonly kineService: KineService) {}

  @Post()
  create(@Body() createKineDto: CreateKineDto) {
    return this.kineService.create(createKineDto);
  }

  @Get()
  findAll() {
    return this.kineService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.kineService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateKineDto: UpdateKineDto) {
    return this.kineService.update(+id, updateKineDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.kineService.remove(+id);
  }
}
