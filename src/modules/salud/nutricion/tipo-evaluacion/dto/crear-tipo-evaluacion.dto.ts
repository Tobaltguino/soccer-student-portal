import { IsOptional, IsString } from 'class-validator';

export class CrearTipoEvaluacionDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}