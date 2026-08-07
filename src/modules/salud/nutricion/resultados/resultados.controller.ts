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

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultadosController {
  constructor(
    private readonly resultadosService: ResultadosService,
    private readonly alcanceService: AlcanceGruposService,
  ) {}

  @Post('nutri-evaluacion-resultados')
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

  // "me" antes que ":evaluacionId", por el patrón que ya conocemos
  @Get('estudiantes/me/nutri-resultados')
  @Roles(Rol.ESTUDIANTE)
  misResultados(@CurrentUser() user: RequestUser) {
    return this.resultadosService.listarPorEstudianteFinalizados(user.id);
  }

  @Get('nutri-evaluacion-sesiones/:evaluacionId/resultados')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA, Rol.PROFESOR, Rol.KINESIOLOGO)
  async listarPorSesion(
    @Param('evaluacionId') evaluacionId: string,
    @CurrentUser() user: RequestUser,
  ) {
    const gruposPermitidos = await this.alcanceService.obtenerGruposPermitidos(user.id, user.rol);
    return this.resultadosService.listarPorSesion(evaluacionId, gruposPermitidos);
  }

  @Patch('nutri-evaluacion-resultados/:id')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage() }))
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarResultadoDto,
    @UploadedFile() archivo?: Express.Multer.File,
  ) {
    return this.resultadosService.actualizar(id, dto, archivo);
  }

  @Delete('nutri-evaluacion-resultados/:id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id') id: string) {
    return this.resultadosService.eliminar(id);
  }
}