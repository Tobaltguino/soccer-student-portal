import 'multer';
import { memoryStorage } from 'multer';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { WebBeneficiosService } from './web-beneficios.service';
import { CrearWebBeneficioDto } from './dto/crear-web-beneficio.dto';
import { ActualizarWebBeneficioDto } from './dto/actualizar-web-beneficio.dto';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../../shared/enums/rol.enum';

@Controller('web-beneficios')
export class WebBeneficiosController {
  constructor(private readonly service: WebBeneficiosService) {}

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
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  crear(
    @Body() dto: CrearWebBeneficioDto,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    return this.service.crear(dto, imagen);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('imagen', { storage: memoryStorage() }))
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarWebBeneficioDto,
    @UploadedFile() imagen?: Express.Multer.File,
  ) {
    return this.service.actualizar(id, dto, imagen);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  eliminar(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminar(id);
  }

  @Delete(':id/imagen')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.ADMINISTRADOR)
  eliminarImagen(@Param('id', ParseIntPipe) id: number) {
    return this.service.eliminarImagen(id);
  }
}