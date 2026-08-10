import { Module } from '@nestjs/common';
import { AsistenciasController } from './asistencias.controller';
import { AsistenciasService } from './asistencias.service';

@Module({
  controllers: [AsistenciasController],
  providers: [AsistenciasService],
})
export class AsistenciasModule {}