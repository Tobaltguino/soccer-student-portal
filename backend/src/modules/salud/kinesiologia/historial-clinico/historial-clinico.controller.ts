import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { HistorialClinicoService } from './historial-clinico.service';
import { CrearHistorialDto } from './dto/crear-historial.dto';
import { ActualizarHistorialDto } from './dto/actualizar-historial.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../../shared/services/alcance-grupos.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class HistorialClinicoController {
  constructor(
    private readonly historialService: HistorialClinicoService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post('kine-historial-clinico')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async crear(@Body() dto: CrearHistorialDto, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.historialService.crear(dto, gruposPermitidos);
  }

  // "me" antes que ":estudianteId"
  @Get('estudiantes/me/historial-clinico')
  @Roles(Rol.ESTUDIANTE)
  miHistorial(@CurrentUser() user: RequestUser) {
    return this.historialService.listarPorEstudiante(user.id, null);
  }

  @Get('stats')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  obtenerEstadisticas() {
    return this.historialService.obtenerEstadisticasDashboard();
  }

  @Get('estado-salud-estudiantes')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async estadoSaludGrupal(@CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.historialService.obtenerEstadoSaludGrupal(gruposPermitidos);
  }

  @Get('estudiantes/:estudianteId/estado-salud')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async estadoSaludEstudiante(
    @Param('estudianteId') estudianteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.historialService.obtenerEstadoSalud(estudianteId, gruposPermitidos);
  }

  @Get('estudiantes/:estudianteId/historial-clinico')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async listarPorEstudiante(
    @Param('estudianteId') estudianteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.historialService.listarPorEstudiante(estudianteId, gruposPermitidos);
  }

  @Get('kine-historial-clinico/:id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async buscarPorId(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.historialService.buscarPorId(id, gruposPermitidos);
  }

  @Patch('kine-historial-clinico/:id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarHistorialDto,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.historialService.actualizar(id, dto, gruposPermitidos);
  }

  @Patch('kine-historial-clinico/:id/restaurar')
  @Roles(Rol.ADMINISTRADOR)
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.historialService.restaurar(id);
  }

  @Delete('kine-historial-clinico/:id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.historialService.eliminar(id);
  }
}