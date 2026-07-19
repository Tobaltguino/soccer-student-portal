import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { MaterialComplService } from './material-compl.service';
import { CreateMaterialComplDto } from './dto/create-material-compl.dto';
import { UpdateMaterialComplDto } from './dto/update-material-compl.dto';

@Controller('material-compl')
export class MaterialComplController {
  constructor(private readonly materialComplService: MaterialComplService) {}

  @Post()
  create(@Body() createMaterialComplDto: CreateMaterialComplDto) {
    return this.materialComplService.create(createMaterialComplDto);
  }

  @Get()
  findAll() {
    return this.materialComplService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.materialComplService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateMaterialComplDto: UpdateMaterialComplDto) {
    return this.materialComplService.update(+id, updateMaterialComplDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.materialComplService.remove(+id);
  }
}
