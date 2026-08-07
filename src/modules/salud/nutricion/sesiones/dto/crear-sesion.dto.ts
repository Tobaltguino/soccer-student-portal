import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class CrearSesionDto {
  @IsUUID()
  tipoId!: string;

  @IsDateString()
  fecha!: string;

  // Solo lo usa el admin para crear en nombre de un nutricionista específico.
  // Si el que crea es nutricionista, se ignora y se usa su propio id.
  @IsOptional()
  @IsUUID()
  nutricionistaId?: string;
}