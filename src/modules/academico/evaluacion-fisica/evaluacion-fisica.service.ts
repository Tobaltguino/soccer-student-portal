import { Injectable } from '@nestjs/common';
import { CreateEvaluacionFisicaDto } from './dto/create-evaluacion-fisica.dto';
import { UpdateEvaluacionFisicaDto } from './dto/update-evaluacion-fisica.dto';

@Injectable()
export class EvaluacionFisicaService {
  create(createEvaluacionFisicaDto: CreateEvaluacionFisicaDto) {
    return 'This action adds a new evaluacionFisica';
  }

  findAll() {
    return `This action returns all evaluacionFisica`;
  }

  findOne(id: number) {
    return `This action returns a #${id} evaluacionFisica`;
  }

  update(id: number, updateEvaluacionFisicaDto: UpdateEvaluacionFisicaDto) {
    return `This action updates a #${id} evaluacionFisica`;
  }

  remove(id: number) {
    return `This action removes a #${id} evaluacionFisica`;
  }
}
