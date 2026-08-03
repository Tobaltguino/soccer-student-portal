import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ResultadosService } from './resultados.service';
import { CrearResultadoDto } from './dto/crear-resultado.dto';
import { ActualizarResultadoDto } from './dto/actualizar-resultado.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class ResultadosController {
  constructor(private readonly resultadosService: ResultadosService) {}

  @Post('evaluaciones-resultados')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  crear(@Body() dto: CrearResultadoDto) {
    return this.resultadosService.crear(dto);
  }

  @Get('evaluaciones-sesiones/:sesionId/resultados')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  listarPorSesion(@Param('sesionId') sesionId: string) {
    return this.resultadosService.listarPorSesion(sesionId);
  }

  @Get('estudiantes/:estudianteId/resultados')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  listarPorEstudiante(@Param('estudianteId') estudianteId: string) {
    return this.resultadosService.listarPorEstudiante(estudianteId);
  }

  @Patch('evaluaciones-resultados/:id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarResultadoDto,
  ) {
    return this.resultadosService.actualizar(id, dto);
  }

  @Delete('evaluaciones-resultados/:id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.resultadosService.eliminar(id);
  }
}