import { Module } from '@nestjs/common';
import { TipoEvaluacionModule } from './tipo-evaluacion/tipo-evaluacion.module';

@Module({
  imports: [TipoEvaluacionModule],
})
export class NutricionModule {}