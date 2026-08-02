import { Module } from '@nestjs/common';
import { AceptacionesLegalesController } from './aceptaciones-legales.controller';
import { AceptacionesLegalesService } from './aceptaciones-legales.service';

@Module({
  controllers: [AceptacionesLegalesController],
  providers: [AceptacionesLegalesService],
})
export class AceptacionesLegalesModule {}