import { Module } from '@nestjs/common';
import { SubevaluacionesController } from './subevaluaciones.controller';
import { SubevaluacionesService } from './subevaluaciones.service';

@Module({
  controllers: [SubevaluacionesController],
  providers: [SubevaluacionesService],
  exports: [SubevaluacionesService],
})
export class SubevaluacionesModule {}