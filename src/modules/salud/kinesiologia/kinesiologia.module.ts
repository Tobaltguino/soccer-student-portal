import { Module } from '@nestjs/common';
import { FichasEvolutivasModule } from './ficha-evolutiva/fichas-evolutivas.module';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';

@Module({
  imports: [FichasEvolutivasModule, EvaluacionesModule],
})
export class KinesiologiaModule {}