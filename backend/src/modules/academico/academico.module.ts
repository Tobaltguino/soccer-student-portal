import { Module } from '@nestjs/common';
import { GruposModule } from './grupos/grupos.module';
import { ClasesModule } from './clases/clases.module';
import { AsistenciasModule } from './asistencias/asistencias.module';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { MaterialModule } from './material-complementario/material.module';
import { AsignacionesStaffModule } from './asignaciones-staff/asignaciones-staff.module';

@Module({
  imports: [
    GruposModule,
    ClasesModule,
    AsistenciasModule,
    EvaluacionesModule,
    MaterialModule,
    AsignacionesStaffModule,
  ],
})
export class AcademicoModule {}