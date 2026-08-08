import { Module } from '@nestjs/common';
import { TiposEvaluacionModule } from './tipos-evaluacion/tipos-evaluacion.module';
import { SubevaluacionesModule } from './subevaluaciones/subevaluaciones.module';

@Module({
  imports: [TiposEvaluacionModule, SubevaluacionesModule],
})
export class EvaluacionesModule {}