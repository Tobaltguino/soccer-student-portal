import { Module } from '@nestjs/common';
import { ResultadosController } from './resultados.controller';
import { ResultadosService } from './resultados.service';
import { SesionesModule } from '../sesiones/sesiones.module';
import { EstudiantesModule } from '../../../../usuarios/estudiantes/estudiantes.module';
import { SharedModule } from '../../../../../shared/shared.module'; // 🔥 IMPORTA EL MÓDULO COMPARTIDO

@Module({
  controllers: [ResultadosController],
  providers: [ResultadosService],
  imports: [SesionesModule, EstudiantesModule, SharedModule], // 🔥 AGRÉGALO AQUÍ
})
export class ResultadosModule {}