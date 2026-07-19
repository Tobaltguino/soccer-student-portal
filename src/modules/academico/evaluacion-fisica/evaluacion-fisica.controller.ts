import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { EvaluacionFisicaService } from './evaluacion-fisica.service';
import { CreateEvaluacionFisicaDto } from './dto/create-evaluacion-fisica.dto';
import { UpdateEvaluacionFisicaDto } from './dto/update-evaluacion-fisica.dto';

@Controller('evaluacion-fisica')
export class EvaluacionFisicaController {
  constructor(private readonly evaluacionFisicaService: EvaluacionFisicaService) {}

  @Post()
  create(@Body() createEvaluacionFisicaDto: CreateEvaluacionFisicaDto) {
    return this.evaluacionFisicaService.create(createEvaluacionFisicaDto);
  }

  @Get()
  findAll() {
    return this.evaluacionFisicaService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.evaluacionFisicaService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateEvaluacionFisicaDto: UpdateEvaluacionFisicaDto) {
    return this.evaluacionFisicaService.update(+id, updateEvaluacionFisicaDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.evaluacionFisicaService.remove(+id);
  }
}
