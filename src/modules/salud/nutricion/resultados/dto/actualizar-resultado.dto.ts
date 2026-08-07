import { IsOptional, IsString } from 'class-validator';

export class ActualizarResultadoDto {
  @IsOptional()
  @IsString()
  observaciones?: string;
}