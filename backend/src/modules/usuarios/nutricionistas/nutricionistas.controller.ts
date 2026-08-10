import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { NutricionistasService } from './nutricionistas.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';

@Controller('nutricionistas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NutricionistasController {
  constructor(private readonly nutricionistasService: NutricionistasService) {}

  @Get()
  @Roles(Rol.ADMINISTRADOR)
  listar() {
    return this.nutricionistasService.listar();
  }

  @Get(':id')
  @Roles(Rol.ADMINISTRADOR)
  buscarPorId(@Param('id') id: string) {
    return this.nutricionistasService.buscarPorId(id);
  }
}