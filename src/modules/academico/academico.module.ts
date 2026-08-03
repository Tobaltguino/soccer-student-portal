import { Module } from '@nestjs/common';
import { GruposModule } from './grupos/grupos.module';
import { ClasesModule } from './clases/clases.module';
import { AsistenciasModule } from './asistencias/asistencias.module';

@Module({
  imports: [GruposModule, ClasesModule, AsistenciasModule],
})
export class AcademicoModule {}