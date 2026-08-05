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
import { TipoEvaluacionService } from './tipo-evaluacion.service';
import { CrearTipoEvaluacionDto } from './dto/crear-tipo-evaluacion.dto';
import { ActualizarTipoEvaluacionDto } from './dto/actualizar-tipo-evaluacion.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';

@Controller('nutri-tipo-evaluacion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TipoEvaluacionController {
  constructor(private readonly service: TipoEvaluacionService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearTipoEvaluacionDto) {
    return this.service.crear(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.NUTRICIONISTA)
  buscarPorId(@Param('id') id: string) {
    return this.service.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarTipoEvaluacionDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id') id: string) {
    return this.service.eliminar(id);
  }
}