import { IsInt, IsOptional, IsString } from 'class-validator';

export class CrearWebMetodologiaDto {
  @IsString()
  icono!: string;

  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsInt()
  orden?: number;
}