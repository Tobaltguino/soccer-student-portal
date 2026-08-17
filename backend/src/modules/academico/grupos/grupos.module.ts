import { Module } from '@nestjs/common';
import { GruposController } from './grupos.controller';
import { GruposService } from './grupos.service';
import { AsignacionesStaffModule } from '../asignaciones-staff/asignaciones-staff.module';

@Module({
  controllers: [GruposController],
  providers: [GruposService],
  imports: [AsignacionesStaffModule],
  exports: [GruposService],
})
export class GruposModule {}