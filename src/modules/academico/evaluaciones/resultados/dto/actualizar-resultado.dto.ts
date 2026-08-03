import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ActualizarResultadoDto {
  @IsOptional()
  @IsNumber()
  valorNumerico?: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}