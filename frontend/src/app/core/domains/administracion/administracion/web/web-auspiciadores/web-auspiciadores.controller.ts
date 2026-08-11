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
import { WebAuspiciadoresService } from './web-auspiciadores.service';
import { CrearWebAuspiciadorDto } from './dto/crear-web-auspiciador.dto';
import { ActualizarWebAuspiciadorDto } from './dto/actualizar-web-auspiciador.dto';
import { JwtAuthGuard } from '../../../../../../../../../backend/src/core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../../../../../../backend/src/core/auth/guards/roles.guard';
import { Roles } from '../../../../../../../../../backend/src/core/auth/decorators/roles.decorator';
import { Rol } from '../../../../../../../../../backend/src/shared/enums/rol.enum';

@Controller('web-auspiciadores')
export class WebAuspiciadoresController {
  constructor(private readonly service: WebAuspiciadoresService) {}

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
    @Body() dto: CrearWebAuspiciadorDto,
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
    @Body() dto: ActualizarWebAuspiciadorDto,
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