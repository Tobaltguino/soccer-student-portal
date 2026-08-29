import { IsBoolean, IsEnum, IsInt, IsOptional, IsString } from 'class-validator';

export enum CriterioPrioridad {
  MENOR = 'MENOR',
  MAYOR = 'MAYOR',
}

export class CrearSubevaluacionDto {
  @IsInt()
  tipoEvaluacionId!: number;

  @IsString()
  nombre!: string;

  @IsOptional()
  @IsBoolean()
  evaluaLados?: boolean;

  @IsOptional()
  @IsEnum(CriterioPrioridad)
  prioridad?: CriterioPrioridad;
}