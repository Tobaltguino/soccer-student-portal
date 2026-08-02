import { Module } from '@nestjs/common';
import { KinesiologosController } from './kinesiologos.controller';
import { KinesiologosService } from './kinesiologos.service';

@Module({
  controllers: [KinesiologosController],
  providers: [KinesiologosService],
  exports: [KinesiologosService],
})
export class KinesiologosModule {}