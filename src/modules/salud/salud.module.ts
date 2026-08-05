import { Module } from '@nestjs/common';
import { NutricionModule } from './nutricion/nutricion.module';

@Module({
  imports: [NutricionModule],
})
export class SaludModule {}