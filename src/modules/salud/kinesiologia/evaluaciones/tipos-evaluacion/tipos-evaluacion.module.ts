import { Module } from '@nestjs/common';
import { TiposEvaluacionController } from './tipos-evaluacion.controller';
import { TiposEvaluacionService } from './tipos-evaluacion.service';

@Module({
  controllers: [TiposEvaluacionController],
  providers: [TiposEvaluacionService],
  exports: [TiposEvaluacionService],
})
export class TiposEvaluacionModule {}