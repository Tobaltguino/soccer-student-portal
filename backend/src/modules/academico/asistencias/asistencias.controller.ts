// modules/academico/asistencias/asistencias.controller.ts
import { BadRequestException, Body, Controller, Get, Param, ParseIntPipe, Post, Query, UseGuards } from '@nestjs/common';
import { AsistenciasService } from './asistencias.service';
import { RegistrarAsistenciasLoteDto } from './dto/registrar-asistencias-lotes.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../shared/services/alcance-grupos.service';
import { FiltrosReporteMensualDto } from './dto/filtros-reporte';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsistenciasController {
  constructor(
    private readonly asistenciasService: AsistenciasService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post('clases/:claseId/asistencias')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  async registrarLote(
    @Param('claseId', ParseIntPipe) claseId: number,
    @Body() dto: RegistrarAsistenciasLoteDto,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.asistenciasService.registrarLote(claseId, dto, gruposPermitidos);
  }

  @Get('clases/:claseId/asistencias')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async listarPorClase(
    @Param('claseId', ParseIntPipe) claseId: number,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.asistenciasService.listarPorClase(claseId, gruposPermitidos);
  }

  @Get('estudiantes/me/asistencias')
  @Roles(Rol.ESTUDIANTE)
  misAsistencias(@CurrentUser() user: RequestUser) {
    return this.asistenciasService.listarPorEstudiante(user.id, null);
  }

  @Get('estudiantes/:estudianteId/asistencias')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async listarPorEstudiante(
    @Param('estudianteId') estudianteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.asistenciasService.listarPorEstudiante(estudianteId, gruposPermitidos);
  }

  @Get('reportes/mensual')
  @Roles(Rol.ADMINISTRADOR)
  async reporteMensualConsolidado(@Query() filtros: FiltrosReporteMensualDto) {
    if (!filtros.grupoId) {
      throw new BadRequestException('Se requiere especificar un grupo_id para el reporte');
    }
    return this.asistenciasService.reporteMensualConsolidado(
      filtros.grupoId, 
      filtros.mes, 
      filtros.anio
    );
  }

  @Get('estudiantes/:estudianteId/asistencias/mensual')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  async detalleMensualEstudiante(
    @Param('estudianteId') estudianteId: string,
    @Query() filtros: FiltrosReporteMensualDto,
  ) {
    return this.asistenciasService.detalleMensualEstudiante(
      estudianteId,
      filtros.mes,
      filtros.anio
    );
  }
}