import { Module } from '@nestjs/common';
import { GruposModule } from './grupos/grupos.module';
import { ClasesModule } from './clases/clases.module';
import { AsistenciasModule } from './asistencias/asistencias.module';
import { TipoEvaluacionModule } from './evaluaciones/tipo-evaluacion/tipo-evaluacion.module';

@Module({
  imports: [GruposModule, ClasesModule, AsistenciasModule, TipoEvaluacionModule],
})
export class AcademicoModule {}