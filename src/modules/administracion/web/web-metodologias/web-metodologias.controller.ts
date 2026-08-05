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
import { WebMetodologiasService } from './web-metodologias.service';
import { CrearWebMetodologiaDto } from './dto/crear-web-metodologia.dto';
import { ActualizarWebMetodologiaDto } from './dto/actualizar-web-metodologia.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';

@Controller('web-metodologias')
export class WebMetodologiasController {
  constructor(private readonly service: WebMetodologiasService) {}

  @Get()
  listar() {
    return this.service.listar();
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarPorId(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  crear(@Body() dto: CrearWebMetodologiaDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarWebMetodologiaDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}