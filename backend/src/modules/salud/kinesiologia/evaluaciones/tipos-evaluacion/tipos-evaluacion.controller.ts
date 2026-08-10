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
import { TiposEvaluacionService } from './tipos-evaluacion.service';
import { CrearTipoEvaluacionDto } from './dto/crear-tipo-evaluacion.dto';
import { ActualizarTipoEvaluacionDto } from './dto/actualizar-tipo-evaluacion.dto';
import { JwtAuthGuard } from '../../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../../shared/enums/rol.enum';

@Controller('kine-tipos-evaluacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TiposEvaluacionController {
  constructor(private readonly service: TiposEvaluacionService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearTipoEvaluacionDto) {
    return this.service.crear(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE)
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR, Rol.ESTUDIANTE)
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarTipoEvaluacionDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}