import { Module } from '@nestjs/common';
import { ResultadosController } from './resultados.controller';
import { ResultadosService } from './resultados.service';
import { SesionesModule } from '../sesiones/sesiones.module';

@Module({
  controllers: [ResultadosController],
  providers: [ResultadosService],
  imports: [SesionesModule],
})
export class ResultadosModule {}