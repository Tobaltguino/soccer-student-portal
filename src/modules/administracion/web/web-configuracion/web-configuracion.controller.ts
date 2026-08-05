import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { WebConfiguracionService } from './web-configuracion.service';
import { ActualizarWebConfiguracionDto } from './dto/actualizar-web-configuracion.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';

@Controller('web-configuracion')
export class WebConfiguracionController {
  constructor(private readonly service: WebConfiguracionService) {}

  @Get()
  obtener() {
    return this.service.obtener();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Body() dto: ActualizarWebConfiguracionDto) {
    return this.service.actualizar(dto);
  }
}