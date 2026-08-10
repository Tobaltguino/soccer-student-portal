// modules/salud/kinesiologia/kinesiologia.module.ts
import { Module } from '@nestjs/common';
import { FichasEvolutivasModule } from './ficha-evolutiva/fichas-evolutivas.module';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { HistorialClinicoModule } from './historial-clinico/historial-clinico.module';

@Module({
  imports: [FichasEvolutivasModule, EvaluacionesModule, HistorialClinicoModule],
})
export class KinesiologiaModule {}