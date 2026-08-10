import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class CrearSubevaluacionDto {
  @IsInt()
  tipoEvaluacionId!: number;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsBoolean()
  evaluaLados?: boolean;
}