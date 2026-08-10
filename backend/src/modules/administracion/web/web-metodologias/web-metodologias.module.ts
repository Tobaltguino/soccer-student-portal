import { Module } from '@nestjs/common';
import { WebMetodologiasController } from './web-metodologias.controller';
import { WebMetodologiasService } from './web-metodologias.service';

@Module({
  controllers: [WebMetodologiasController],
  providers: [WebMetodologiasService],
})
export class WebMetodologiasModule {}