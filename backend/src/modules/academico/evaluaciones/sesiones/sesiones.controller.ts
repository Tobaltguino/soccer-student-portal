import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { SesionesService } from './sesiones.service';
import { CrearSesionDto } from './dto/crear-sesion.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';
import { CambiarEstadoSesionDto } from './dto/cambiar-estado-sesion.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../../shared/services/alcance-grupos.service';
import { FiltrarSesionesDto } from './dto/filtrar-sesiones.dto';

@Controller('evaluaciones-sesiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SesionesController {
  constructor(
    private readonly sesionesService: SesionesService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post()
  @Roles(Rol.PROFESOR)
  async crear(@Body() dto: CrearSesionDto, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.sesionesService.crear(dto, user.id, gruposPermitidos);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async listar(@CurrentUser() user: RequestUser, @Query() filtros: FiltrarSesionesDto) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.sesionesService.listar(filtros, gruposPermitidos);
  }

  @Get('ultima-finalizada')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async obtenerUltima(@CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.sesionesService.obtenerUltimaFinalizada(gruposPermitidos);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async buscarPorId(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.sesionesService.buscarPorId(id, gruposPermitidos);
  }

  @Patch(':id')
  @Roles(Rol.PROFESOR)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarSesionDto,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.sesionesService.actualizar(id, dto, gruposPermitidos);
  }

  @Patch(':id/estado')
  @Roles(Rol.PROFESOR)
  async cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoSesionDto,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.sesionesService.cambiarEstado(id, dto, gruposPermitidos);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id') id: string) {
    return this.sesionesService.eliminar(id);
  }

  @Patch(':id/restaurar')
  @Roles(Rol.ADMINISTRADOR)
  restaurar(@Param('id') id: string) {
    return this.sesionesService.restaurar(id);
  }
}