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
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';

@Controller('evaluacion-rangos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RangosController {
  constructor(private readonly rangosService: RangosService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearRangoDto) {
    return this.rangosService.crear(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  listarPorTipoEvaluacion(@Query('tipoEvaluacionId', ParseIntPipe) tipoEvaluacionId: number) {
    return this.rangosService.listarPorTipoEvaluacion(tipoEvaluacionId);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO)
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.rangosService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarRangoDto) {
    return this.rangosService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.rangosService.eliminar(id);
  }
}