import { Module } from '@nestjs/common';
import { AsignacionesStaffController } from './asignaciones-staff.controller';
import { AsignacionesStaffService } from './asignaciones-staff.service';

@Module({
  controllers: [AsignacionesStaffController],
  providers: [AsignacionesStaffService],
})
export class AsignacionesStaffModule {}