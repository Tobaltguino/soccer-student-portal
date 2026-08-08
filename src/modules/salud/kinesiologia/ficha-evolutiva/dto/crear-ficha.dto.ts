import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { AntecedentesPersonalesDto } from './sub/antecedentes-personales.dto';
import { AntecedentesRemotosDto } from './sub/antecedentes-remotos.dto';
import { InspeccionEstaticaDto } from './sub/inspeccion-estatica.dto';
import { InspeccionDinamicaDto } from './sub/inspeccion-dinamica.dto';
import { ArticulacionRomDto } from './sub/articulacion-rom.dto';
import { FuerzaMovimientoDto } from './sub/fuerza-movimiento.dto';
import { PosturaDto } from './sub/postura.dto';
import { SensibilidadDto } from './sub/sensibilidad.dto';
import { CoordinacionDto } from './sub/coordinacion.dto';
import { NoEvaluableDto } from './sub/no-evaluable.dto';

export class CrearFichaDto {
  @IsUUID()
  estudianteId!: string;

  @IsDateString()
  fechaEvaluacion!: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AntecedentesPersonalesDto)
  antecedentesPersonales?: AntecedentesPersonalesDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => AntecedentesRemotosDto)
  antecedentesRemotos?: AntecedentesRemotosDto;

  @IsOptional()
  @IsString()
  diagnosticoMedico?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => InspeccionEstaticaDto)
  inspeccionEstatica?: InspeccionEstaticaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => InspeccionDinamicaDto)
  inspeccionDinamica?: InspeccionDinamicaDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ArticulacionRomDto)
  rangoMovimiento?: ArticulacionRomDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FuerzaMovimientoDto)
  fuerzaMovimientos?: FuerzaMovimientoDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => PosturaDto)
  postura?: PosturaDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => SensibilidadDto)
  sensibilidad?: SensibilidadDto;

  @IsOptional()
  @IsString()
  marcha?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CoordinacionDto)
  coordinacion?: CoordinacionDto;

  @IsOptional()
  @IsNumber()
  balanceRomberg?: number;

  @IsOptional()
  @IsString()
  observacion?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => NoEvaluableDto)
  noEvaluable?: NoEvaluableDto;
}