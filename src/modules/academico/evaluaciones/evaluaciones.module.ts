import { Module } from '@nestjs/common';
import { TipoEvaluacionModule } from './tipo-evaluacion/tipo-evaluacion.module';
import { RangosModule } from './rangos/rangos.module';
import { SesionesModule } from './sesiones/sesiones.module';
import { ResultadosModule } from './resultados/resultados.module';

@Module({
  imports: [TipoEvaluacionModule, RangosModule, SesionesModule, ResultadosModule],
})
export class EvaluacionesModule {}