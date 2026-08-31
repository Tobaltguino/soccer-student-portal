import { Module } from '@nestjs/common';
import { ClasesController } from './clases.controller';
import { ClasesService } from './clases.service';
import { SharedModule } from '../../../shared/shared.module'; // 🔥 IMPORTA EL MÓDULO COMPARTIDO

@Module({
  imports: [SharedModule], // 🔥 AGRÉGALO AQUÍ
  controllers: [ClasesController],
  providers: [ClasesService],
  exports: [ClasesService],
})
export class ClasesModule {}