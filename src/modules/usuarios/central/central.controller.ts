import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CentralService } from './central.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CentralController {
  constructor(private readonly centralService: CentralService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crearUsuario(@Body() dto: CrearUsuarioDto) {
    return this.centralService.crearUsuario(dto);
  }

  @Get('me')
  miPerfil(@CurrentUser() user: RequestUser) {
    return this.centralService.buscarPerfilCompleto(user.id);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  buscarPerfilCompleto(@Param('id') id: string) {
    return this.centralService.buscarPerfilCompleto(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizarUsuario(
    @Param('id') id: string,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.centralService.actualizarUsuario(id, dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  listarUsuarios(@Query('rol') rol?: Rol) {
    return this.centralService.listarUsuarios(rol);
  }
}