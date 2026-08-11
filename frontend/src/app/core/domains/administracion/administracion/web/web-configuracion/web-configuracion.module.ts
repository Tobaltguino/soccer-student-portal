import { Module } from '@nestjs/common';
import { WebConfiguracionController } from './web-configuracion.controller';
import { WebConfiguracionService } from './web-configuracion.service';

@Module({
  controllers: [WebConfiguracionController],
  providers: [WebConfiguracionService],
})
export class WebConfiguracionModule {}