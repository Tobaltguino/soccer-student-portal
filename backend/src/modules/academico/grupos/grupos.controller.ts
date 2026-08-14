import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { GruposService } from './grupos.service';
import { CrearGrupoDto } from './dto/crear-grupo.dto';
import { ActualizarGrupoDto } from './dto/actualizar-grupo.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../shared/services/alcance-grupos.service';
import { AsignacionesStaffService } from '../asignaciones-staff/asignaciones-staff.service';
import { TipoStaff } from '../../../shared/enums/tipo-staff.enum';

@Controller('grupos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GruposController {
  constructor(
    private readonly gruposService: GruposService,
    private readonly asignacionesStaffService: AsignacionesStaffService, 
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearGrupoDto) {
    return this.gruposService.crear(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  async listar(
    @CurrentUser() user: RequestUser,
    @Query('incluirEliminados') incluirEliminados?: string,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.gruposService.listar(incluirEliminados === 'true', gruposPermitidos);
  }

  @Get('mis-grupos')
  @Roles(Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  async listarMisGrupos(@Request() req: any) {
    const usuarioId = req.user.id; // El UUID del token
    const rol = req.user.rol;

    // Mapeamos el Rol del token al TipoStaff de tu servicio
    let tipoStaff: TipoStaff;
    if (rol === Rol.PROFESOR) tipoStaff = TipoStaff.PROFESOR;
    else if (rol === Rol.KINESIOLOGO) tipoStaff = TipoStaff.KINESIOLOGO;
    else if (rol === Rol.NUTRICIONISTA) tipoStaff = TipoStaff.NUTRICIONISTA;
    else return [];

    // 1. Buscamos en la tabla intermedia los grupos de este usuario
    const asignaciones = await this.asignacionesStaffService.listarPorUsuario(usuarioId, tipoStaff);
    const gruposPermitidos = asignaciones.map(a => a.grupo_id);

    // Si no tiene grupos asignados, devolvemos vacío rápido
    if (gruposPermitidos.length === 0) {
      return [];
    }

    // 2. Usamos tu función existente que ya filtra por array de IDs
    return this.gruposService.listar(false, gruposPermitidos);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  async buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.gruposService.buscarPorId(id, gruposPermitidos);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarGrupoDto) {
    return this.gruposService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.eliminar(id);
  }

  @Patch(':id/restaurar')
  @Roles(Rol.ADMINISTRADOR)
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.gruposService.restaurar(id);
  }
}