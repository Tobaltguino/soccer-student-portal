import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearFichaDto } from './crear-ficha.dto';

export class ActualizarFichaDto extends PartialType(
  OmitType(CrearFichaDto, ['estudianteId'] as const),
) {}