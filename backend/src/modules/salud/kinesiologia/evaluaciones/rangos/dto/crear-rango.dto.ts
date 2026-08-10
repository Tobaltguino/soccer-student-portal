import { IsInt, IsOptional, IsString } from 'class-validator';

export class CrearRangoDto {
  @IsInt()
  subevaluacionId!: number;

  @IsInt()
  puntaje!: number;

  @IsString()
  etiqueta!: string;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}