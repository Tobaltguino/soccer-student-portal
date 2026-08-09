import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { AuditoriaConsultaService } from './auditoria.service';
import { FiltrarAuditoriaDto } from './dto/filtrar-auditoria.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { Rol } from '../../../shared/enums/rol.enum';

@Controller('auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.ADMINISTRADOR)
export class AuditoriaController {
  constructor(private readonly service: AuditoriaConsultaService) {}

  @Get()
  listar(@Query() filtros: FiltrarAuditoriaDto) {
    return this.service.listar(filtros);
  }

  @Get(':id')
  buscarPorId(@Param('id', ParseIntPipe) id: number) {
    return this.service.buscarPorId(id);
  }
}