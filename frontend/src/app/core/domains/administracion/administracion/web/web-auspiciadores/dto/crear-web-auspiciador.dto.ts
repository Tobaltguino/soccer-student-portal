import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsUrl } from 'class-validator';

export class CrearWebAuspiciadorDto {
  @IsString()
  nombre!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orden?: number;

  @IsOptional()
  @IsUrl()
  instagramUrl?: string;
}