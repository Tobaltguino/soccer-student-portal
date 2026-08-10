import { Module } from '@nestjs/common';
import { NutricionistasController } from './nutricionistas.controller';
import { NutricionistasService } from './nutricionistas.service';

@Module({
  controllers: [NutricionistasController],
  providers: [NutricionistasService],
  exports: [NutricionistasService],
})
export class NutricionistasModule {}