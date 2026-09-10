import { IsEnum, IsInt, IsNumber, IsOptional, IsString } from 'class-validator';
import { Genero } from '../../../../../shared/enums/genero.enum';


export class CrearRangoDto {
  @IsInt()
  tipoEvaluacionId!: number;

  @IsEnum(Genero)
  genero!: Genero;

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