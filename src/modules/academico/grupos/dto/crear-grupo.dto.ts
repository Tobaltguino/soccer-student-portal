import { IsOptional, IsString } from 'class-validator';

export class CrearGrupoDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}