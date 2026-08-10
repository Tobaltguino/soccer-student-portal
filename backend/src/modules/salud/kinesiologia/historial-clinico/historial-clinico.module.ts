import { Module } from '@nestjs/common';
import { HistorialClinicoController } from './historial-clinico.controller';
import { HistorialClinicoService } from './historial-clinico.service';

@Module({
  controllers: [HistorialClinicoController],
  providers: [HistorialClinicoService],
})
export class HistorialClinicoModule {}