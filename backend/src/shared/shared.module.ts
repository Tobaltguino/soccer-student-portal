import { Global, Module } from '@nestjs/common';
import { AlcanceGruposService } from './services/alcance-grupos.service';
import { ExcelService } from './services/excel.service';

@Global()
@Module({
  providers: [AlcanceGruposService, ExcelService],
  exports: [AlcanceGruposService, ExcelService],
})
export class SharedModule {}