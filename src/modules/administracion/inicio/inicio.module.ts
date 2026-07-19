import { Module } from '@nestjs/common';
import { InicioService } from './inicio.service';
import { InicioController } from './inicio.controller';

@Module({
  controllers: [InicioController],
  providers: [InicioService],
})
export class InicioModule {}
