import { IsOptional, IsString } from 'class-validator';

export class SensibilidadDto {
  @IsOptional() @IsString() anestesia?: string;
  @IsOptional() @IsString() hipoestesia?: string;
  @IsOptional() @IsString() disestesia?: string;
  @IsOptional() @IsString() hiperestesia?: string;
  @IsOptional() @IsString() parestesia?: string;
}