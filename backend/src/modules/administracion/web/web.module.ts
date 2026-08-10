// modules/administracion/web/web.module.ts
import { Module } from '@nestjs/common';
import { WebConfiguracionModule } from './web-configuracion/web-configuracion.module';
import { WebBeneficiosModule } from './web-beneficios/web-beneficios.module';
import { WebAuspiciadoresModule } from './web-auspiciadores/web-auspiciadores.module';
import { WebMetodologiasModule } from './web-metodologias/web-metodologias.module';
import { WebProgramasModule } from './web-programas/web-programas.module';

@Module({
  imports: [
    WebConfiguracionModule,
    WebBeneficiosModule,
    WebAuspiciadoresModule,
    WebMetodologiasModule,
    WebProgramasModule,
  ],
})
export class WebModule {}