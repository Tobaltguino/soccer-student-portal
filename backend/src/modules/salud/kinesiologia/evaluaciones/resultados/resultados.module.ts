import { Module } from '@nestjs/common';
import { ResultadosController } from './resultados.controller';
import { ResultadosService } from './resultados.service';
import { SesionesModule } from '../sesiones/sesiones.module';
import { EstudiantesController } from 'src/modules/usuarios/estudiantes/estudiantes.controller';
import { EstudiantesModule } from '../../../../usuarios/estudiantes/estudiantes.module';

@Module({
  controllers: [ResultadosController],
  providers: [ResultadosService],
  imports: [SesionesModule, EstudiantesModule],
})
export class ResultadosModule {}