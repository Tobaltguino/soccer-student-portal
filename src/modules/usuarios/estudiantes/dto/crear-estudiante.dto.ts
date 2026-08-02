import { IsString, IsOptional, IsNumber, IsDateString, IsUUID, IsArray, IsEnum } from 'class-validator';
import { Posicion } from '../../../../shared/enums/posicion.enum';

export class CrearEstudianteDto {
  @IsUUID('4', { message: 'El ID de usuario debe ser un UUID válido' })
  usuario_id!: string;

  @IsOptional()
  grupo_id?: string | number;

  @IsDateString({}, { message: 'La fecha de nacimiento debe tener el formato YYYY-MM-DD' })
  fecha_nacimiento!: string;

  @IsString()
  @IsOptional()
  direccion?: string;

  @IsString()
  @IsOptional()
  prevision?: string;

  @IsNumber()
  @IsOptional()
  peso?: number;

  @IsNumber()
  @IsOptional()
  altura?: number;

  // ¡Blindaje nivel experto!
  @IsArray({ message: 'Las posiciones deben enviarse como una lista' })
  @IsEnum(Posicion, { 
    each: true, 
    message: `Cada posición debe ser válida: ${Object.values(Posicion).join(', ')}` 
  })
  @IsOptional()
  posiciones?: Posicion[];
}