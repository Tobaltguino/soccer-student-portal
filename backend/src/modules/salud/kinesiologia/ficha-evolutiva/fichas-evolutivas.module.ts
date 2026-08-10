import { Module } from '@nestjs/common';
import { FichasEvolutivasController } from './fichas-evolutivas.controller';
import { FichasEvolutivasService } from './fichas-evolutivas.service';

@Module({
  controllers: [FichasEvolutivasController],
  providers: [FichasEvolutivasService],
})
export class FichasEvolutivasModule {}