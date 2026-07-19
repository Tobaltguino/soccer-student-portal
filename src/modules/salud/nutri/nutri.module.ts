import { Module } from '@nestjs/common';
import { NutriService } from './nutri.service';
import { NutriController } from './nutri.controller';

@Module({
  controllers: [NutriController],
  providers: [NutriService],
})
export class NutriModule {}
