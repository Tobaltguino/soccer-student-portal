import { Module } from '@nestjs/common';
import { WebAuspiciadoresController } from './web-auspiciadores.controller';
import { WebAuspiciadoresService } from './web-auspiciadores.service';

@Module({
  controllers: [WebAuspiciadoresController],
  providers: [WebAuspiciadoresService],
})
export class WebAuspiciadoresModule {}