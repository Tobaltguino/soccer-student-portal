import { PartialType } from '@nestjs/mapped-types';
import { CrearWebMetodologiaDto } from './crear-web-metodologia.dto';

export class ActualizarWebMetodologiaDto extends PartialType(CrearWebMetodologiaDto) {}