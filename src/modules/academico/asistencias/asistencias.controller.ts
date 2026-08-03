import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AsistenciasService } from './asistencias.service';
import { RegistrarAsistenciasLoteDto } from './dto/registrar-asistencias-lotes.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsistenciasController {
  constructor(private readonly asistenciasService: AsistenciasService) {}

  @Post('clases/:claseId/asistencias')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  registrarLote(
    @Param('claseId', ParseIntPipe) claseId: number,
    @Body() dto: RegistrarAsistenciasLoteDto,
  ) {
    return this.asistenciasService.registrarLote(claseId, dto);
  }

  @Get('clases/:claseId/asistencias')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  listarPorClase(@Param('claseId', ParseIntPipe) claseId: number) {
    return this.asistenciasService.listarPorClase(claseId);
  }

  @Get('estudiantes/:estudianteId/asistencias')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  listarPorEstudiante(@Param('estudianteId') estudianteId: string) {
    return this.asistenciasService.listarPorEstudiante(estudianteId);
  }
}