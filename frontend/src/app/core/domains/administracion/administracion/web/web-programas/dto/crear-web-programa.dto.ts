import { IsInt, IsOptional, IsString } from 'class-validator';

export class CrearWebProgramaDto {
  @IsString()
  icono!: string;

  @IsOptional()
  @IsString()
  colorFondo?: string;

  @IsOptional()
  @IsString()
  colorTexto?: string;

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}