import { IsOptional, IsString } from 'class-validator';

export class FuerzaMovimientoDto {
  @IsString() movimiento!: string;
  @IsOptional() @IsString() escala?: string;
}