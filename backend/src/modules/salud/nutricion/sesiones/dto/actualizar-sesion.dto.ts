import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class ActualizarSesionDto {
  @IsOptional()
  @IsUUID()
  tipoId?: string;

  @IsOptional()
  @IsDateString()
  fecha?: string;

  // Solo lo podrá usar el admin para reasignar la sesión
  @IsOptional()
  @IsUUID()
  nutricionistaId?: string;
}