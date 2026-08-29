import 'multer';
import { memoryStorage } from 'multer';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ResultadosService } from './resultados.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../../core/auth/strategies/jwt.strategy';
import { AlcanceGruposService } from '../../../../shared/services/alcance-grupos.service';

// FIX: Patrón de enrutamiento agrupado correctamente
@Controller('nutri-evaluacion-resultados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultadosController {
  constructor(
    private readonly resultadosService: ResultadosService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage() }))
  async crear(
    @Body() dto: CrearResultadoDto,
    @CurrentUser() user: RequestUser,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.resultadosService.crear(
      dto,
      user.id,
      user.rol === Rol.ADMINISTRADOR,
      archivo,
      gruposPermitidos,
    );
  }

  @Get('mis-resultados')
  @Roles(Rol.ESTUDIANTE)
  misResultados(@CurrentUser() user: RequestUser) {
    return this.resultadosService.listarPorEstudianteFinalizados(user.id);
  }

  @Get('sesion/:evaluacionId')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA, Rol.PROFESOR, Rol.KINESIOLOGO)
  async listarPorSesion(
    @Param('evaluacionId') evaluacionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.resultadosService.listarPorSesion(evaluacionId, gruposPermitidos);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage() }))
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarResultadoDto,
    @CurrentUser() user: RequestUser,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    // Pasamos el usuario para validar seguridad
    return this.resultadosService.actualizar(id, dto, user.id, user.rol === Rol.ADMINISTRADOR, archivo);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA) // Permitido a Nutricionista para borrar los suyos
  eliminar(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    // Pasamos el usuario para validar seguridad
    return this.resultadosService.eliminar(id, user.id, user.rol === Rol.ADMINISTRADOR);
  }
}