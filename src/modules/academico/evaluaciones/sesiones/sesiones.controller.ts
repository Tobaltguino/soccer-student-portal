import {
  Body,
  Controller,
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

@Controller('evaluaciones-sesiones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SesionesController {
  constructor(private readonly sesionesService: SesionesService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  crear(@Body() dto: CrearSesionDto, @CurrentUser() user: RequestUser) {
    return this.sesionesService.crear(dto, user.id);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  listar(@Query('grupoId') grupoId?: string) {
    return this.sesionesService.listar(grupoId ? Number(grupoId) : undefined);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  buscarPorId(@Param('id') id: string) {
    return this.sesionesService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarSesionDto) {
    return this.sesionesService.actualizar(id, dto);
  }

  @Patch(':id/estado')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  cambiarEstado(@Param('id') id: string, @Body() dto: CambiarEstadoSesionDto) {
    return this.sesionesService.cambiarEstado(id, dto);
  }
}