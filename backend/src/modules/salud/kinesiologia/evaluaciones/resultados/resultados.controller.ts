import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { ResultadosService } from './resultados.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import { JwtAuthGuard } from '../../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../../../shared/services/alcance-grupos.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultadosController {
  constructor(
    private readonly resultadosService: ResultadosService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post('kine-evaluaciones-resultados')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async crear(@Body() dto: CrearResultadoDto, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.resultadosService.crear(dto, gruposPermitidos);
  }

  // "me" antes que ":sesionId"
  @Get('estudiantes/me/kine-resultados')
  @Roles(Rol.ESTUDIANTE)
  misResultados(@CurrentUser() user: RequestUser) {
    return this.resultadosService.listarPorEstudianteFinalizados(user.id);
  }

  @Get('kine-evaluaciones-sesiones/:sesionId/resultados')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR)
  async listarPorSesion(@Param('sesionId') sesionId: string, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.resultadosService.listarPorSesion(sesionId, gruposPermitidos);
  }

  @Get('kine-evaluaciones-sesiones/:sesionId/resultados/exportar/excel')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR)
  async exportarExcelKinePorSesion(
    @Param('sesionId') sesionId: string,
    @CurrentUser() user: RequestUser,
    @Res() res: Response,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    const buffer = await this.resultadosService.generarExcelPorSesionKine(sesionId, gruposPermitidos);

    const nombreArchivo = `kine_resultados_${sesionId.substring(0, 8)}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
    res.send(buffer);
  }

  @Patch('kine-evaluaciones-resultados/:id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarResultadoDto,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.resultadosService.actualizar(id, dto, gruposPermitidos);
  }

  @Delete('kine-evaluaciones-resultados/:id')
  @Roles(Rol.ADMINISTRADOR)
  async eliminar(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.resultadosService.eliminar(id, gruposPermitidos);
  }
}