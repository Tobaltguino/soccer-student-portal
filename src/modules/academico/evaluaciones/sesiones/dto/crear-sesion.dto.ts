import { IsDateString, IsEnum, IsInt, IsOptional } from 'class-validator';
import { EstadoSesion } from 'src/shared/enums/estado-sesion.enum';

export class CrearSesionDto {
  @IsInt()
  tipoEvaluacionId!: number;

  @IsInt()
  grupoId!: number;

  @IsDateString()
  fecha!: string;

  @IsOptional()
  @IsEnum(EstadoSesion)
  estado?: EstadoSesion;
}