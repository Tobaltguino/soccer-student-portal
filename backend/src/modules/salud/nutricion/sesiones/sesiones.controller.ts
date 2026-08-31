// modules/salud/nutricion/sesiones/sesiones.controller.ts
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
import { CambiarEstadoSesionDto } from './dto/cambiar-estado-sesion.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../../core/auth/strategies/jwt.strategy';
import { FiltrarSesionesDto } from './dto/filtrar-sesion.dto';
import { ActualizarSesionDto } from './dto/actualizar-sesion.dto';

@Controller('nutri-evaluacion-sesiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  crear(@Body() dto: CrearSesionDto, @CurrentUser() user: RequestUser) {
    return this.sesionesService.crear(dto, user.id, user.rol === Rol.ADMINISTRADOR);
  }

  @Get()
  // 🔥 FIX: Se agregó Rol.KINESIOLOGO a los permisos de listar
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA, Rol.PROFESOR, Rol.KINESIOLOGO)
  listar(@CurrentUser() user: RequestUser, @Query() filtros: FiltrarSesionesDto) {
    const soloDeNutricionista = user.rol === Rol.NUTRICIONISTA ? user.id : null;
    return this.sesionesService.listar(soloDeNutricionista, filtros);
  }

  @Get('ultima-finalizada')
  // 🔥 FIX: Se agregó Rol.KINESIOLOGO por seguridad transversal
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA, Rol.PROFESOR, Rol.KINESIOLOGO)
  obtenerUltima() {
    return this.sesionesService.obtenerUltimaFinalizada();
  }

  @Get(':id')
  // 🔥 FIX: Se agregó Rol.KINESIOLOGO a los permisos de buscar por ID
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA, Rol.PROFESOR, Rol.KINESIOLOGO)
  buscarPorId(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const soloDeNutricionista = user.rol === Rol.NUTRICIONISTA ? user.id : null;
    return this.sesionesService.buscarPorId(id, soloDeNutricionista);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarSesionDto,
    @CurrentUser() user: RequestUser,
  ) {
    const soloDeNutricionista = user.rol === Rol.ADMINISTRADOR ? null : user.id;
    const esAdmin = user.rol === Rol.ADMINISTRADOR;
    return this.sesionesService.actualizar(id, dto, soloDeNutricionista, esAdmin);
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoSesionDto,
    @CurrentUser() user: RequestUser,
  ) {
    const soloDeNutricionista = user.rol === Rol.ADMINISTRADOR ? null : user.id;
    return this.sesionesService.cambiarEstado(id, dto, soloDeNutricionista);
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