import { Type } from 'class-transformer';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearResultadoDto {
  @IsUUID()
  evaluacionId!: string;

  @IsUUID()
  estudianteId!: string;

  @IsOptional()
  @IsString()
  observaciones?: string;
}