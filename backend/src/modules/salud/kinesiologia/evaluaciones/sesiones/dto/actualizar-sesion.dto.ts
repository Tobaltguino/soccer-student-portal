import { IsDateString, IsOptional, IsString } from 'class-validator';

export class ActualizarSesionDto {
  @IsOptional()
  @IsDateString()
  fecha?: string;

  @IsOptional()
  @IsString()
  observacion?: string;
}