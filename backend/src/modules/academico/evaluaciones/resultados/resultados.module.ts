import { Module } from '@nestjs/common';
import { ResultadosController } from './resultados.controller';
import { ResultadosService } from './resultados.service';
import { SesionesModule } from '../sesiones/sesiones.module';
import { RangosModule } from '../rangos/rangos.module';
import { SharedModule } from '../../../../shared/shared.module'; // 🔥 IMPORTA EL MÓDULO COMPARTIDO

@Module({
  controllers: [ResultadosController],
  providers: [ResultadosService],
  imports: [SesionesModule, RangosModule, SharedModule], // 🔥 AGRÉGALO AQUÍ
})
export class ResultadosModule {}