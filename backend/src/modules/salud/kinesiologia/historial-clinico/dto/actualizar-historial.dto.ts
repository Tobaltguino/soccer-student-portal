import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CrearHistorialDto } from './crear-historial.dto';

export class ActualizarHistorialDto extends PartialType(
  OmitType(CrearHistorialDto, ['estudianteId'] as const),
) {}