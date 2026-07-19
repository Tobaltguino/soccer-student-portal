import { Module } from '@nestjs/common';
import { KineService } from './kine.service';
import { KineController } from './kine.controller';

@Module({
  controllers: [KineController],
  providers: [KineService],
})
export class KineModule {}
