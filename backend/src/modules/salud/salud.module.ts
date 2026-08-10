import { Module } from '@nestjs/common';
import { NutricionModule } from './nutricion/nutricion.module';
import { KinesiologiaModule } from './kinesiologia/kinesiologia.module';

@Module({
  imports: [NutricionModule, KinesiologiaModule],
})
export class SaludModule {}