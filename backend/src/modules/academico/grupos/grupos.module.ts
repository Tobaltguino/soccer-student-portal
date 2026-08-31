import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';
import { AsignacionesStaffModule } from '../asignaciones-staff/asignaciones-staff.module';
import { SharedModule } from '../../../shared/shared.module'; // 🔥 IMPORTA EL MÓDULO COMPARTIDO

@Module({
  controllers: [GruposController],
  providers: [GruposService],
  imports: [
    AsignacionesStaffModule, 
    SharedModule // 🔥 AGRÉGALO AQUÍ
  ],
  exports: [GruposService],
})
export class GruposModule {}