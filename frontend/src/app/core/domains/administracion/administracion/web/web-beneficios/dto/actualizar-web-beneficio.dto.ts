import { PartialType } from '@nestjs/mapped-types';
import { CrearWebBeneficioDto } from './crear-web-beneficio.dto';

export class ActualizarWebBeneficioDto extends PartialType(CrearWebBeneficioDto) {}