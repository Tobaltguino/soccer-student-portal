import 'multer';
import { memoryStorage } from 'multer';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MaterialService } from './material.service';
import { CrearMaterialDto } from './dto/crear-material.dto';
import { ActualizarMaterialDto } from './dto/actualizar-material.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';
import { FiltrarMaterialDto } from './dto/filtrar-material.dto';

@Controller('material-complementario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MaterialController {
  constructor(private readonly materialService: MaterialService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  @UseInterceptors(FileInterceptor('archivo', { storage: memoryStorage() }))
  crear(
    @Body() dto: CrearMaterialDto,
    @CurrentUser() user: RequestUser, 
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.materialService.crear(dto, user, archivo);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.ESTUDIANTE)
  listar(@Query() filtros: FiltrarMaterialDto) {
    return this.materialService.listar(filtros);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.ESTUDIANTE)
  buscarPorId(@Param('id') id: string) {
    return this.materialService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  actualizar(
    @Param('id') id: string, 
    @Body() dto: ActualizarMaterialDto,
    @CurrentUser() user: RequestUser
  ) {
    return this.materialService.actualizar(id, dto, user);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR) 
  eliminar(@Param('id') id: string) {
    return this.materialService.eliminar(id);
  }
}