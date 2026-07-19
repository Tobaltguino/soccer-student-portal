import { Module } from '@nestjs/common';
import { MaterialComplService } from './material-compl.service';
import { MaterialComplController } from './material-compl.controller';

@Module({
  controllers: [MaterialComplController],
  providers: [MaterialComplService],
})
export class MaterialComplModule {}
