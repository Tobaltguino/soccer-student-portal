import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearResultadoDto {
  @IsUUID()
  sesionId!: string;

  @IsUUID()
  estudianteId!: string;

  @IsInt()
  subevaluacionId!: number;

  @IsOptional()
  @IsString()
  resultadoUnico?: string;

  @IsOptional()
  @IsString()
  resultadoIzquierdo?: string;

  @IsOptional()
  @IsString()
  resultadoDerecho?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}