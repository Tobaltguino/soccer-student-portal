import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  rut!: string; // Cambiamos email por rut

  @IsString()
  @MinLength(6)
  password!: string;
}