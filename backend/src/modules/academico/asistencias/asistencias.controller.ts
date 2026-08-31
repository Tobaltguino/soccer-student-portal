import { BadRequestException, Body, Controller, ForbiddenException, Get, Param, ParseIntPipe, Post, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
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
  @Roles(Rol.PROFESOR)
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
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  async reporteMensualConsolidado(
    @Query() filtros: FiltrosReporteMensualDto,
    @CurrentUser() user: RequestUser,
  ) {
    if (!filtros.grupoId) {
      throw new BadRequestException('Se requiere especificar un grupo_id para el reporte');
    }

    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    if (gruposPermitidos !== null && !gruposPermitidos.includes(filtros.grupoId)) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    return this.asistenciasService.reporteMensualConsolidado(
      filtros.grupoId,
      filtros.mes,
      filtros.anio,
    );
  }

  // 🔥 NUEVO ENDPOINT DE EXCEL
  @Get('reportes/mensual/exportar/excel')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  async exportarReporteMensualExcel(
    @Query() filtros: FiltrosReporteMensualDto,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    if (!filtros.grupoId) {
      throw new BadRequestException('Se requiere especificar un grupo_id para exportar el reporte');
    }

    // Validamos seguridad (igual que en el endpoint normal)
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    if (gruposPermitidos !== null && !gruposPermitidos.includes(filtros.grupoId)) {
      throw new ForbiddenException('No tienes acceso a este grupo');
    }

    const buffer = await this.asistenciasService.generarExcelReporteMensual(
      filtros.grupoId,
      filtros.mes,
      filtros.anio,
    );

    const nombreArchivo = `asistencia_grupo_${filtros.grupoId}_${filtros.mes}_${filtros.anio}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(buffer);
  }
  
  @Get('estudiantes/:estudianteId/asistencias/mensual')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  async detalleMensualEstudiante(
    @Param('estudianteId') estudianteId: string,
    @Query() filtros: FiltrosReporteMensualDto,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.asistenciasService.detalleMensualEstudiante(
      estudianteId,
      filtros.mes,
      filtros.anio,
      gruposPermitidos,
    );
  }
}