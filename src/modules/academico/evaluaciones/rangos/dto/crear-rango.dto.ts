import { IsInt, IsNumber, IsOptional, IsString } from 'class-validator';

export class CrearRangoDto {
  @IsInt()
  tipoEvaluacionId!: number;

  @IsString()
  nombreEtiqueta!: string;

  @IsNumber()
  valorMin!: number;

  @IsNumber()
  valorMax!: number;

  @IsInt()
  edadMin!: number;

  @IsInt()
  edadMax!: number;

  @IsOptional()
  @IsString()
  colorSugerido?: string;
}