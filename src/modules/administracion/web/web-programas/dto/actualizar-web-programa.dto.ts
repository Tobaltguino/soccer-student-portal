import { PartialType } from '@nestjs/mapped-types';
import { CrearWebProgramaDto } from './crear-web-programa.dto';

export class ActualizarWebProgramaDto extends PartialType(CrearWebProgramaDto) {}