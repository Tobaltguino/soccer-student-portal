import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CentralService } from './central.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CentralController {
  constructor(private readonly centralService: CentralService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crearUsuario(@Body() dto: CrearUsuarioDto) {
    return this.centralService.crearUsuario(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  listarUsuarios(@Query('rol') rol?: Rol) {
    return this.centralService.listarUsuarios(rol);
  }

  @Get('me')
  miPerfil(@CurrentUser() user: RequestUser) {
    return this.centralService.buscarPerfilCompleto(user.id);
  }

  @Get('mi-equipo-tecnico')
  @Roles(Rol.ESTUDIANTE)
  miEquipoTecnico(@CurrentUser() user: RequestUser) {
    return this.centralService.miEquipoTecnico(user.id);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR)
  buscarPerfilCompletoPorId(@Param('id') id: string) {
    return this.centralService.buscarPerfilCompleto(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizarUsuario(@Param('id') id: string, @Body() dto: ActualizarUsuarioDto) {
    return this.centralService.actualizarUsuario(id, dto);
  }

  @Patch(':id/desactivar')
  @Roles(Rol.ADMINISTRADOR)
  desactivar(@Param('id') id: string) {
    return this.centralService.desactivarUsuario(id);
  }

  @Patch(':id/reactivar')
  @Roles(Rol.ADMINISTRADOR)
  reactivar(@Param('id') id: string) {
    return this.centralService.reactivarUsuario(id);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminarUsuario(@Param('id') id: string) {
    return this.centralService.eliminarUsuario(id);
  }
}