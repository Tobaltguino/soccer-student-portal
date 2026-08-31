import { Module } from '@nestjs/common';
import { AsistenciasController } from './asistencias.controller';
import { AsistenciasService } from './asistencias.service';
import { SharedModule } from '../../../shared/shared.module'; // 🔥 IMPORTA EL MÓDULO COMPARTIDO

@Module({
  imports: [SharedModule], // 🔥 AGRÉGALO AQUÍ
  controllers: [AsistenciasController],
  providers: [AsistenciasService],
})
export class AsistenciasModule {}