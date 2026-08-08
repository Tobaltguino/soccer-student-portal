// modules/salud/nutricion/sesiones/sesiones.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  listar(@CurrentUser() user: RequestUser) {
    const soloDeNutricionista = user.rol === Rol.ADMINISTRADOR ? null : user.id;
    return this.sesionesService.listar(soloDeNutricionista);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  buscarPorId(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const soloDeNutricionista = user.rol === Rol.ADMINISTRADOR ? null : user.id;
    return this.sesionesService.buscarPorId(id, soloDeNutricionista);
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