import { Module } from '@nestjs/common';
import { WebBeneficiosController } from './web-beneficios.controller';
import { WebBeneficiosService } from './web-beneficios.service';

@Module({
  controllers: [WebBeneficiosController],
  providers: [WebBeneficiosService],
})
export class WebBeneficiosModule {}