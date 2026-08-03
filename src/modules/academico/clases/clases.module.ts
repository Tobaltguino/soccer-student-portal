import { Module } from '@nestjs/common';
import { ClasesController } from './clases.controller';
import { ClasesService } from './clases.service';

@Module({
  controllers: [ClasesController],
  providers: [ClasesService],
  exports: [ClasesService],
})
export class ClasesModule {}