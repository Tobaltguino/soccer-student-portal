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
  UseGuards,
} from '@nestjs/common';
import { ClasesService } from './clases.service';
import { CrearClaseDto } from './dto/crear-clase.dto';
import { ActualizarClaseDto } from './dto/actualizar-clase.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../shared/services/alcance-grupos.service';

@Controller('clases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClasesController {
  constructor(
    private readonly clasesService: ClasesService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  async crear(@Body() dto: CrearClaseDto, @CurrentUser() user: RequestUser) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.clasesService.crear(dto, gruposPermitidos);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async listar(
    @CurrentUser() user: RequestUser,
    @Query('grupoId') grupoId?: string,
    @Query('incluirEliminadas') incluirEliminadas?: string,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);

    return this.clasesService.listar(
      grupoId ? Number(grupoId) : undefined,
      incluirEliminadas === 'true',
      gruposPermitidos,
    );
  }

  @Get('mis-clases')
  @Roles(Rol.ESTUDIANTE)
  misClases(@CurrentUser() user: RequestUser) {
    return this.clasesService.listarPorGrupoDeEstudiante(user.id);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  async buscarPorId(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.clasesService.buscarPorId(id, gruposPermitidos);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  async actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarClaseDto,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.clasesService.actualizar(id, dto, gruposPermitidos);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.clasesService.eliminar(id);
  }

  @Patch(':id/restaurar')
  @Roles(Rol.ADMINISTRADOR)
  restaurar(@Param('id', ParseIntPipe) id: number) {
    return this.clasesService.restaurar(id);
  }
}