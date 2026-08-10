import { Module } from '@nestjs/common';
import { TipoEvaluacionController } from './tipo-evaluacion.controller';
import { TipoEvaluacionService } from './tipo-evaluacion.service';

@Module({
  controllers: [TipoEvaluacionController],
  providers: [TipoEvaluacionService],
  exports: [TipoEvaluacionService],
})
export class TipoEvaluacionModule {}