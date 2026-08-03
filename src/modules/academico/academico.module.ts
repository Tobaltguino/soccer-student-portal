import { Module } from '@nestjs/common';
import { GruposModule } from './grupos/grupos.module';
import { ClasesModule } from './clases/clases.module';

@Module({
  imports: [GruposModule, ClasesModule],
})
export class AcademicoModule {}