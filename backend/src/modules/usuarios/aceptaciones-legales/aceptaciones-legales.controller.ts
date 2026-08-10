import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AceptacionesLegalesService } from './aceptaciones-legales.service';
import { AceptarTerminosDto } from './dto/aceptar-terminos.dto';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import type { RequestUser } from '../../../core/auth/strategies/jwt.strategy';

@Controller('aceptaciones-legales')
@UseGuards(JwtAuthGuard)
export class AceptacionesLegalesController {
  constructor(private readonly service: AceptacionesLegalesService) {}

  @Post()
  aceptar(
    @Body() dto: AceptarTerminosDto,
    @CurrentUser() user: RequestUser,
    @Req() req: Request,
  ) {
    const ip = req.ip ?? null;
    return this.service.aceptar(user.id, dto, ip);
  }

  @Get('me')
  miAceptacion(@CurrentUser() user: RequestUser) {
    return this.service.buscarPorUsuario(user.id);
  }
}