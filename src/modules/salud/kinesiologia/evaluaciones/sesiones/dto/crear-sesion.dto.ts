import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';

export class CrearSesionDto {
  @IsInt()
  tipoEvaluacionId!: number;

  @IsInt()
  grupoId!: number;

  @IsDateString()
  fecha!: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}