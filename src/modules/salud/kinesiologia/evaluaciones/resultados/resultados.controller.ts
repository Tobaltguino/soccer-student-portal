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