import { IsOptional, IsString } from 'class-validator';

export class ActualizarResultadoDto {
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