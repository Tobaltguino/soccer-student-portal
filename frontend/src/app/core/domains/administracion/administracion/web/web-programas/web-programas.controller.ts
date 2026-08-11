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
import { WebProgramasService } from './web-programas.service';
import { CrearWebProgramaDto } from './dto/crear-web-programa.dto';
import { ActualizarWebProgramaDto } from './dto/actualizar-web-programa.dto';
import { JwtAuthGuard } from '../../../../../../../../../backend/src/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../../../../../backend/src/core/auth/guards/roles.guard';
import { Roles } from '../../../../../../../../../backend/src/core/auth/decorators/roles.decorator';
import { Rol } from '../../../../../../../../../backend/src/shared/enums/rol.enum';

@Controller('web-programas')
export class WebProgramasController {
  constructor(private readonly service: WebProgramasService) {}

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
  crear(@Body() dto: CrearWebProgramaDto) {
    return this.service.crear(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarWebProgramaDto) {
    return this.service.actualizar(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }
}