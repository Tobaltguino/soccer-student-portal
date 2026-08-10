import { IsOptional, IsString } from 'class-validator';

export class ArticulacionRomDto {
  @IsString() nombre!: string;
  @IsOptional() @IsString() derPasivo?: string;
  @IsOptional() @IsString() derActivo?: string;
  @IsOptional() @IsString() izqPasivo?: string;
  @IsOptional() @IsString() izqActivo?: string;
}