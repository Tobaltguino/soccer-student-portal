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
import { ClasesService } from './clases.service';
import { CrearClaseDto } from './dto/crear-clase.dto';
import { ActualizarClaseDto } from './dto/actualizar-clase.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';

@Controller('clases')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClasesController {
  constructor(private readonly clasesService: ClasesService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  crear(@Body() dto: CrearClaseDto) {
    return this.clasesService.crear(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  listar(@Query('grupoId') grupoId?: string) {
    return this.clasesService.listar(grupoId ? Number(grupoId) : undefined);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.clasesService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR)
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarClaseDto) {
    return this.clasesService.actualizar(id, dto);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.clasesService.eliminar(id);
  }
}