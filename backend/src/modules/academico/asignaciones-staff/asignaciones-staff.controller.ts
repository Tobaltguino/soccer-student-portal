import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AsignacionesStaffService } from './asignaciones-staff.service';
import { AsignarStaffDto } from './dto/asignar-staff.dto';
import { TipoStaff } from '../../../shared/enums/tipo-staff.enum';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';

@Controller('grupos/:grupoId')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AsignacionesStaffController {
  constructor(private readonly service: AsignacionesStaffService) {}

  // ---------- PROFESORES ----------
  @Post('profesores')
  @Roles(Rol.ADMINISTRADOR)
  asignarProfesor(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Body() dto: AsignarStaffDto,
  ) {
    return this.service.asignar(grupoId, dto.usuarioId, TipoStaff.PROFESOR);
  }

  @Delete('profesores/:usuarioId')
  @Roles(Rol.ADMINISTRADOR)
  desasignarProfesor(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.service.desasignar(grupoId, usuarioId, TipoStaff.PROFESOR);
  }

  @Get('profesores')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  listarProfesores(@Param('grupoId', ParseIntPipe) grupoId: number) {
    return this.service.listarPorGrupo(grupoId, TipoStaff.PROFESOR);
  }

  // ---------- KINESIÓLOGOS ----------
  @Post('kinesiologos')
  @Roles(Rol.ADMINISTRADOR)
  asignarKinesiologo(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Body() dto: AsignarStaffDto,
  ) {
    return this.service.asignar(grupoId, dto.usuarioId, TipoStaff.KINESIOLOGO);
  }

  @Delete('kinesiologos/:usuarioId')
  @Roles(Rol.ADMINISTRADOR)
  desasignarKinesiologo(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.service.desasignar(grupoId, usuarioId, TipoStaff.KINESIOLOGO);
  }

  @Get('kinesiologos')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  listarKinesiologos(@Param('grupoId', ParseIntPipe) grupoId: number) {
    return this.service.listarPorGrupo(grupoId, TipoStaff.KINESIOLOGO);
  }

  // ---------- NUTRICIONISTAS ----------
  @Post('nutricionistas')
  @Roles(Rol.ADMINISTRADOR)
  asignarNutricionista(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Body() dto: AsignarStaffDto,
  ) {
    return this.service.asignar(grupoId, dto.usuarioId, TipoStaff.NUTRICIONISTA);
  }

  @Delete('nutricionistas/:usuarioId')
  @Roles(Rol.ADMINISTRADOR)
  desasignarNutricionista(
    @Param('grupoId', ParseIntPipe) grupoId: number,
    @Param('usuarioId') usuarioId: string,
  ) {
    return this.service.desasignar(grupoId, usuarioId, TipoStaff.NUTRICIONISTA);
  }

  @Get('nutricionistas')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  listarNutricionistas(@Param('grupoId', ParseIntPipe) grupoId: number) {
    return this.service.listarPorGrupo(grupoId, TipoStaff.NUTRICIONISTA);
  }
}