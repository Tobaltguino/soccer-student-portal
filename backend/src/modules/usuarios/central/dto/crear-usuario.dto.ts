import {
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { Rol } from '../../../../shared/enums/rol.enum';
import { Posicion } from '../../../../shared/enums/posicion.enum';

export class CrearUsuarioDto {
  // --- Datos base (todos los roles) ---
  @IsString()
  rut!: string;

  @IsString()
  nombre!: string;

  @IsString()
  apellido!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  passwordTemporal!: string;

  @IsEnum(Rol)
  rol!: Rol;

  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsDateString()
  fechaNacimiento?: string;

  // --- Específico ESTUDIANTE ---
  @ValidateIf((o) => o.rol === Rol.ESTUDIANTE)
  @IsOptional()
  @IsNumber()
  peso?: number;

  @ValidateIf((o) => o.rol === Rol.ESTUDIANTE)
  @IsOptional()
  @IsNumber()
  altura?: number;

  @ValidateIf((o) => o.rol === Rol.ESTUDIANTE)
  @IsOptional()
  @IsArray()
  @IsEnum(Posicion, { each: true })
  posiciones?: Posicion[];

  @ValidateIf((o) => o.rol === Rol.ESTUDIANTE)
  @IsOptional()
  @IsString()
  direccion?: string;

  @ValidateIf((o) => o.rol === Rol.ESTUDIANTE)
  @IsOptional()
  @IsString()
  prevision?: string;

  @ValidateIf((o) => o.rol === Rol.ESTUDIANTE)
  @IsOptional()
  @IsNumber()
  grupoId?: number;

  // --- Específico PROFESOR ---
  @ValidateIf((o) => o.rol === Rol.PROFESOR)
  @IsOptional()
  @IsString()
  tipoProfesor?: string;
}