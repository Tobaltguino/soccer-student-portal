import { IsOptional, IsString } from 'class-validator';

export class CrearTipoEvaluacionDto {
  @IsString()
  nombre!: string;

  @IsString()
  unidadMedida!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}