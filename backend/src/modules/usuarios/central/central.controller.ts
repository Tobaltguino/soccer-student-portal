// modules/usuarios/central/central.controller.ts
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, Res } from '@nestjs/common';
import type { Response } from 'express'; 
import { CentralService } from './central.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';
import { FiltrarUsuariosDto } from './dto/filtrar-usuarios.dto';

import 'multer';
import { memoryStorage } from 'multer';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CentralController {
  constructor(private readonly centralService: CentralService) {}

  @Post()
  @Roles(Rol.ADMINISTRADOR)
  crearUsuario(@Body() dto: CrearUsuarioDto) {
    return this.centralService.crearUsuario(dto);
  }

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  listarUsuarios(@Query() filtros: FiltrarUsuariosDto) {
    return this.centralService.listarUsuarios(filtros);
  }

  // 🔥 NUEVO ENDPOINT PARA EXPORTAR EXCEL (Antes de los :id)
  @Get('exportar/excel')
  @Roles(Rol.ADMINISTRADOR)
  async exportarUsuariosExcel(
    @Query() filtros: FiltrarUsuariosDto, 
    @Res() res: Response
  ) {
    const buffer = await this.centralService.generarExcelUsuarios(filtros);

    // Headers para forzar la descarga del archivo en el navegador
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="usuarios_profutbol.xlsx"');
    
    res.send(buffer);
  }

  @Get('me')
  miPerfil(@CurrentUser() user: RequestUser) {
    return this.centralService.buscarPerfilCompleto(user.id);
  }

  @Get('mi-equipo-tecnico')
  @Roles(Rol.ESTUDIANTE)
  miEquipoTecnico(@CurrentUser() user: RequestUser) {
    return this.centralService.miEquipoTecnico(user.id);
  }

  @Get('cumpleanos')
  @Roles(Rol.ADMINISTRADOR, Rol.PROFESOR, Rol.KINESIOLOGO, Rol.NUTRICIONISTA)
  obtenerCumpleanos() {
    return this.centralService.obtenerProximosCumpleanos(7);
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR)
  buscarPerfilCompletoPorId(@Param('id') id: string) {
    return this.centralService.buscarPerfilCompleto(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizarUsuario(@Param('id') id: string, @Body() dto: ActualizarUsuarioDto) {
    return this.centralService.actualizarUsuario(id, dto);
  }

  @Patch(':id/desactivar')
  @Roles(Rol.ADMINISTRADOR)
  desactivar(@Param('id') id: string) {
    return this.centralService.desactivarUsuario(id);
  }

  @Patch(':id/reactivar')
  @Roles(Rol.ADMINISTRADOR)
  reactivar(@Param('id') id: string) {
    return this.centralService.reactivarUsuario(id);
  }

  @Patch(':id/foto')
  @Roles(Rol.ADMINISTRADOR)
  @UseInterceptors(FileInterceptor('foto', { storage: memoryStorage() }))
  actualizarFoto(
    @Param('id') id: string,
    @UploadedFile() archivo: Express.Multer.File,
  ) {
    return this.centralService.actualizarFoto(id, archivo);
  }

  @Delete(':id/foto')
  @Roles(Rol.ADMINISTRADOR)
  eliminarFoto(@Param('id') id: string) {
    return this.centralService.eliminarFoto(id);
  }

  @Delete(':id')
  @Roles(Rol.ADMINISTRADOR)
  eliminarUsuario(@Param('id') id: string) {
    return this.centralService.eliminarUsuario(id);
  }
}