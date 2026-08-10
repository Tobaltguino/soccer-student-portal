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
import { SubevaluacionesService } from './subevaluaciones.service';
import { CrearSubevaluacionDto } from './dto/crear-subevaluacion.dto';
import { ActualizarSubevaluacionDto } from './dto/actualizar-subevaluacion.dto';
import { JwtAuthGuard } from '../../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../../shared/enums/rol.enum';

@Controller('kine-subevaluaciones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubevaluacionesController {
  constructor(private readonly service: SubevaluacionesService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearSubevaluacionDto) {
    return this.service.crear(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE)
  listarPorTipoEvaluacion(@Query('tipoEvaluacionId', ParseIntPipe) tipoEvaluacionId: number) {
    return this.service.listarPorTipoEvaluacion(tipoEvaluacionId);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE)
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarSubevaluacionDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}