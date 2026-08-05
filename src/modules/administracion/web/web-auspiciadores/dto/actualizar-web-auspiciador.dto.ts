import { PartialType } from '@nestjs/mapped-types';
import { CrearWebAuspiciadorDto } from './crear-web-auspiciador.dto';

export class ActualizarWebAuspiciadorDto extends PartialType(CrearWebAuspiciadorDto) {}