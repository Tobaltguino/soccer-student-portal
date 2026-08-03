// modules/academico/academico.module.ts
import { Module } from '@nestjs/common';
import { GruposModule } from './grupos/grupos.module';
import { ClasesModule } from './clases/clases.module';
import { AsistenciasModule } from './asistencias/asistencias.module';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';

@Module({
  imports: [GruposModule, ClasesModule, AsistenciasModule, EvaluacionesModule],
})
export class AcademicoModule {}