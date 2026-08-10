import { IsEnum } from 'class-validator';
import { EstadoSesion } from '../../../../../shared/enums/estado-sesion.enum';

export class CambiarEstadoSesionDto {
  @IsEnum(EstadoSesion)
  estado!: EstadoSesion;
}