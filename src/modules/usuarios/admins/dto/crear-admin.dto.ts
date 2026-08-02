import { IsUUID, IsNotEmpty } from 'class-validator';

export class CrearAdminDto {
  @IsUUID('4', { message: 'El ID de usuario debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID de usuario es obligatorio' })
  usuario_id!: string;
}