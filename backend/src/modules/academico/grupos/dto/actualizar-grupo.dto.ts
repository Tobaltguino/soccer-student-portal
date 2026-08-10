import { IsOptional, IsString } from 'class-validator';

export class ActualizarGrupoDto {
  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;
}