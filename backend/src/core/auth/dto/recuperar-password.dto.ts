import { IsNotEmpty, IsString } from 'class-validator';

export class RecuperarPasswordDto {
  @IsString()
  @IsNotEmpty()
  rut!: string;
}