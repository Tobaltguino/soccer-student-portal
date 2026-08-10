import { IsEnum, IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { TipoMaterial } from '../../../../shared/enums/tipo-material.enum';

export class CrearMaterialDto {
  @IsString()
  titulo!: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsEnum(TipoMaterial)
  tipoMaterial!: TipoMaterial;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  grupoId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  claseId?: number;
}