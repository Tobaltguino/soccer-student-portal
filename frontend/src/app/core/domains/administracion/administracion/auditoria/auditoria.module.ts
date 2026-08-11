import { Module } from '@nestjs/common';
import { AuditoriaController } from './auditoria.controller';
import { AuditoriaConsultaService } from './auditoria.service';

@Module({
  controllers: [AuditoriaController],
  providers: [AuditoriaConsultaService],
})
export class AuditoriaModule {}