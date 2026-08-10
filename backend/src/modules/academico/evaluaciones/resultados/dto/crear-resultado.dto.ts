import { IsNumber, IsOptional, IsString, IsUUID } from 'class-validator';

export class CrearResultadoDto {
  @IsUUID()
  sesionId!: string;

  @IsUUID()
  estudianteId!: string;

  @IsNumber()
  valorNumerico!: number;

  @IsOptional()
  @IsString()
  observacion?: string;
}