import { IsOptional, IsString } from 'class-validator';

export class AceptarTerminosDto {
  @IsString()
  versionTerminos!: string;

  @IsString()
  versionPolitica!: string;
}