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
import { FichasEvolutivasService } from './fichas-evolutivas.service';
import { CrearFichaDto } from './dto/crear-ficha.dto';
import { ActualizarFichaDto } from './dto/actualizar-ficha.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../../shared/services/alcance-grupos.service';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class FichasEvolutivasController {
  constructor(
    private readonly fichasService: FichasEvolutivasService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post('kine-fichas-evolutivas')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async crear(@Body() dto: CrearFichaDto, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.fichasService.crear(dto, user.id, gruposPermitidos);
  }

  // "me" antes que ":estudianteId"
  @Get('estudiantes/me/fichas-evolutivas')
  @Roles(Rol.ESTUDIANTE)
  misFichas(@CurrentUser() user: RequestUser) {
    return this.fichasService.listarPorEstudiante(user.id, null);
  }

  @Get('estudiantes/:estudianteId/fichas-evolutivas')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async listarPorEstudiante(
    @Param('estudianteId') estudianteId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.fichasService.listarPorEstudiante(estudianteId, gruposPermitidos);
  }

  @Get('kine-fichas-evolutivas/:id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async buscarPorId(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.fichasService.buscarPorId(id, gruposPermitidos);
  }

  @Patch('kine-fichas-evolutivas/:id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarFichaDto,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.fichasService.actualizar(id, dto, gruposPermitidos);
  }

  @Delete('kine-fichas-evolutivas/:id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id') id: string) {
    return this.fichasService.eliminar(id);
  }
}