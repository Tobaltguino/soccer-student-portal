import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AdminsService } from './admins.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';

@Controller('admins')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  listar() {
    return this.adminsService.listar();
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR)
  buscarPorId(@Param('id') id: string) {
    return this.adminsService.buscarPorId(id);
  }
}