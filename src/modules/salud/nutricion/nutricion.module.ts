// nutricion.module.ts
import { Module } from '@nestjs/common';
import { TipoEvaluacionModule } from './tipo-evaluacion/tipo-evaluacion.module';
import { SesionesModule } from './sesiones/sesiones.module';
import { ResultadosModule } from './resultados/resultados.module';

@Module({
  imports: [TipoEvaluacionModule, SesionesModule, ResultadosModule],
})
export class NutricionModule {}