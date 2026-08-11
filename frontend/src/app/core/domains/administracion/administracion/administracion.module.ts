import { Module } from '@nestjs/common';
import { WebModule } from './web/web.module';
import { PagosModule } from './pagos/pagos.module';
import { AuditoriaModule } from './auditoria/auditoria.module';

@Module({
  imports: [WebModule, PagosModule, AuditoriaModule],
})
export class AdministracionModule {}