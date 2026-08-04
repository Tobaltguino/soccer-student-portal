import { IsUUID } from 'class-validator';

export class AsignarStaffDto {
  @IsUUID()
  usuarioId!: string;
}