import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { NutriService } from './nutri.service';
import { CreateNutriDto } from './dto/create-nutri.dto';
import { UpdateNutriDto } from './dto/update-nutri.dto';

@Controller('nutri')
export class NutriController {
  constructor(private readonly nutriService: NutriService) {}

  @Post()
  create(@Body() createNutriDto: CreateNutriDto) {
    return this.nutriService.create(createNutriDto);
  }

  @Get()
  findAll() {
    return this.nutriService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.nutriService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateNutriDto: UpdateNutriDto) {
    return this.nutriService.update(+id, updateNutriDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.nutriService.remove(+id);
  }
}
