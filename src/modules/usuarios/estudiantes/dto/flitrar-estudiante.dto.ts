import { Transform } from 'class-transformer';
import { IsArray, IsBoolean, IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Posicion } from '../../../../shared/enums/posicion.enum';

const aArrayDeNumeros = ({ value }: { value: unknown }): number[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  const arr = Array.isArray(value) ? value : String(value).split(',');
  return arr.map((v) => Number(v));
};

const aArrayDeStrings = ({ value }: { value: unknown }): string[] | undefined => {
  if (value === undefined || value === null || value === '') return undefined;
  return Array.isArray(value) ? value : String(value).split(',');
};

export class FiltrarEstudiantesDto {
  @IsOptional()
  @IsString()
  busqueda?: string;

  @IsOptional()
  @Transform(aArrayDeNumeros)
  @IsArray()
  @IsInt({ each: true })
  grupoIds?: number[];

  @IsOptional()
  @Transform(aArrayDeStrings)
  @IsArray()
  @IsEnum(Posicion, { each: true })
  posiciones?: Posicion[];

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  @IsBoolean()
  activo?: boolean;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  pagina?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? Number(value) : undefined))
  @IsInt()
  @Min(1)
  limite?: number;
}