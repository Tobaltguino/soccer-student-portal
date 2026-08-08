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
import { RangosService } from './rangos.service';
import { CrearRangoDto } from './dto/crear-rango.dto';
import { ActualizarRangoDto } from './dto/actualizar-rango.dto';
import { JwtAuthGuard } from '../../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../../shared/enums/rol.enum';

@Controller('kine-evaluacion-rangos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RangosController {
  constructor(private readonly service: RangosService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearRangoDto) {
    return this.service.crear(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR)
  listarPorSubevaluacion(@Query('subevaluacionId', ParseIntPipe) subevaluacionId: number) {
    return this.service.listarPorSubevaluacion(subevaluacionId);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.KINESIOLOGO, Rol.PROFESOR)
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarRangoDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}