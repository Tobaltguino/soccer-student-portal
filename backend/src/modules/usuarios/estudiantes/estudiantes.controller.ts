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
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
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
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  async contarEstudiantesActivos() {
    const total = await this.estudiantesService.contarActivos();
    return { total };
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