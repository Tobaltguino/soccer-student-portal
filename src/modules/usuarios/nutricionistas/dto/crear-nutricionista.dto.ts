import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CrearNutricionistaDto {
  @IsUUID('4', { message: 'El ID de usuario debe ser un UUID válido' })
  usuario_id!: string;

  @IsString()
  @IsOptional()
  enfoque?: string;
}