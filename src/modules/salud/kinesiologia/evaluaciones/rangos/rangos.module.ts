import { Module } from '@nestjs/common';
import { RangosController } from './rangos.controller';
import { RangosService } from './rangos.service';

@Module({
  controllers: [RangosController],
  providers: [RangosService],
  exports: [RangosService],
})
export class RangosModule {}