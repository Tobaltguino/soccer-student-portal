import { Module } from '@nestjs/common';
import { WebProgramasController } from './web-programas.controller';
import { WebProgramasService } from './web-programas.service';

@Module({
  controllers: [WebProgramasController],
  providers: [WebProgramasService],
})
export class WebProgramasModule {}