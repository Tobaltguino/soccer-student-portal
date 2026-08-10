import { Module } from '@nestjs/common';
import { TiposEvaluacionModule } from './tipos-evaluacion/tipos-evaluacion.module';
import { SubevaluacionesModule } from './subevaluaciones/subevaluaciones.module';
import { RangosModule } from './rangos/rangos.module';
import { SesionesModule } from './sesiones/sesiones.module';
import { ResultadosModule } from './resultados/resultados.module';

@Module({
  imports: [
    TiposEvaluacionModule,
    SubevaluacionesModule,
    RangosModule,
    SesionesModule,
    ResultadosModule,
  ],
})
export class EvaluacionesModule {}