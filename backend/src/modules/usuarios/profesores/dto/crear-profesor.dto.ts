import { IsString, IsUUID, IsNotEmpty, IsOptional } from 'class-validator';

export class CrearProfesorDto {
  @IsUUID('4', { message: 'El ID de usuario debe ser un UUID válido' })
  usuario_id!: string;

  @IsString()
  @IsNotEmpty({ message: 'El tipo de profesor es obligatorio' })
  tipo_profesor!: string;

  // Ejemplo de campo opcional a futuro:
  // @IsString()
  // @IsOptional()
  // especialidad?: string;
}