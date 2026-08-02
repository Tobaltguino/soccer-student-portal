import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { KinesiologosService } from './kinesiologos.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';

@Controller('kinesiologos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KinesiologosController {
  constructor(private readonly kinesiologosService: KinesiologosService) {}

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  listar() {
    return this.kinesiologosService.listar();
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR)
  buscarPorId(@Param('id') id: string) {
    return this.kinesiologosService.buscarPorId(id);
  }
}