import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { EstudiantesService } from './estudiantes.service';
import { ActualizarEstudianteDto } from './dto/actualizar-estudiante.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../shared/services/alcance-grupos.service';
import { FiltrarEstudiantesDto } from './dto/flitrar-estudiante.dto';

@Controller('estudiantes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EstudiantesController {
  constructor(
    private readonly estudiantesService: EstudiantesService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Get()
  // 🔥 FIX: Se agregó Nutricionista y Kinesiólogo para que puedan listar alumnos al calificar
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  listar(@Query() filtros: FiltrarEstudiantesDto) {
    return this.estudiantesService.listarConFiltros(filtros);
  }

  @Get('de-mi-grupo')
  @Roles(Rol.PROFESOR, Rol.KINESIOLOGO)
  async deMiGrupo(@CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.estudiantesService.listarPorGrupos(gruposPermitidos);
  }

  @Get('count')
  // 🔥 FIX: Se agregó Nutricionista y Kinesiólogo para que el Dashboard cargue el KPI
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  async contarEstudiantesActivos() {
    const total = await this.estudiantesService.contarActivos();
    return { total };
  }

  @Get('mis-estadisticas')
  @Roles(Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  async misEstadisticas(@CurrentUser() user: RequestUser) {
    // 1. Vemos a qué grupos tiene acceso este usuario
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    
    // Si no tiene grupos asignados, devolvemos 0 de inmediato
    if (!gruposPermitidos || gruposPermitidos.length === 0) {
      return { totalGrupos: 0, totalAlumnos: 0 };
    }

    // 2. Contamos cuántos alumnos hay en esos grupos en total
    const totalAlumnos = await this.estudiantesService.contarPorGrupos(gruposPermitidos);

    // 3. Devolvemos el KPI listo para el Dashboard
    return {
      totalGrupos: gruposPermitidos.length,
      totalAlumnos: totalAlumnos
    };
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  buscarPorId(@Param('id') id: string) {
    return this.estudiantesService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarEstudianteDto) {
    return this.estudiantesService.actualizar(id, dto);
  }
}