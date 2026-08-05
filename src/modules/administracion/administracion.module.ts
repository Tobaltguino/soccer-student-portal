import { Module } from '@nestjs/common';
import { WebModule } from './web/web.module';
import { PagosModule } from './pagos/pagos.module';

@Module({
  imports: [WebModule, PagosModule],
})
export class AdministracionModule {}