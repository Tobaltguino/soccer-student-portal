import { IsEmail, IsOptional, IsString, IsUrl } from 'class-validator';

export class ActualizarWebConfiguracionDto {
  @IsOptional()
  @IsString()
  telefono?: string;

  @IsOptional()
  @IsEmail()
  correo?: string;

  @IsOptional()
  @IsString()
  instagramNombre?: string;

  @IsOptional()
  @IsUrl()
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  facebookNombre?: string;

  @IsOptional()
  @IsUrl()
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  whatsappMensaje?: string;

  @IsOptional()
  @IsString()
  heroTitulo?: string;

  @IsOptional()
  @IsString()
  heroSubtitulo?: string;
}