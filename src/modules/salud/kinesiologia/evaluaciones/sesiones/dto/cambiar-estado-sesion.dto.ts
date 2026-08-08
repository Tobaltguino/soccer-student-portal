import { IsIn } from 'class-validator';

export class CambiarEstadoSesionDto {
  @IsIn(['PROGRAMADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA'])
  estado!: 'PROGRAMADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
}