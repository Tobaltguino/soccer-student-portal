import { Module } from '@nestjs/common';
import { EvaluacionFisicaService } from './evaluacion-fisica.service';
import { EvaluacionFisicaController } from './evaluacion-fisica.controller';

@Module({
  controllers: [EvaluacionFisicaController],
  providers: [EvaluacionFisicaService],
})
export class EvaluacionFisicaModule {}
