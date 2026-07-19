import { PartialType } from '@nestjs/mapped-types';
import { CreateMaterialComplDto } from './create-material-compl.dto';

export class UpdateMaterialComplDto extends PartialType(CreateMaterialComplDto) {}
