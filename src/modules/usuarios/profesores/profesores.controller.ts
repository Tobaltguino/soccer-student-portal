import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ProfesoresService } from './profesores.service';
import { ActualizarProfesorDto } from './dto/actualizar-profesor.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';

@Controller('profesores')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProfesoresController {
  constructor(private readonly profesoresService: ProfesoresService) {}

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  listar() {
    return this.profesoresService.listar();
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR)
  buscarPorId(@Param('id') id: string) {
    return this.profesoresService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(Rol.ADMINISTRADOR)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProfesorDto) {
    return this.profesoresService.actualizar(id, dto);
  }
  
}