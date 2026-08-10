import { IsArray, IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { Posicion } from '../../../../shared/enums/posicion.enum';

export class ActualizarEstudianteDto {
  @IsOptional()
  @IsNumber()
  peso?: number;

  @IsOptional()
  @IsNumber()
  altura?: number;

  @IsOptional()
  @IsArray()
  @IsEnum(Posicion, { each: true })
  posiciones?: Posicion[];

  @IsOptional()
  @IsString()
  direccion?: string;

  @IsOptional()
  @IsString()
  prevision?: string;

  @IsOptional()
  @IsNumber()
  grupoId?: number;
}