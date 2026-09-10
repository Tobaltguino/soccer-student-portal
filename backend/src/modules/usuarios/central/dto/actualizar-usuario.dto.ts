import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { Posicion } from '../../../../shared/enums/posicion.enum';
import{ Genero } from '../../../../shared/enums/genero.enum'


export class ActualizarUsuarioDto {
  // --- Datos base (usuarios_perfiles) ---
  @IsOptional()
  @IsString()
  rut?: string;

  @IsOptional()
  @IsString()
  nombre?: string;

  @IsOptional()
  @IsString()
  apellido?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsEnum(Genero)
  genero?: Genero;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  // --- Específico ESTUDIANTE (si aplica) ---
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

  // --- Específico PROFESOR (si aplica) ---
  @IsOptional()
  @IsString()
  tipoProfesor?: string;
}