import { Injectable } from '@nestjs/common';
import { CreateMaterialComplDto } from './dto/create-material-compl.dto';
import { UpdateMaterialComplDto } from './dto/update-material-compl.dto';

@Injectable()
export class MaterialComplService {
  create(createMaterialComplDto: CreateMaterialComplDto) {
    return 'This action adds a new materialCompl';
  }

  findAll() {
    return `This action returns all materialCompl`;
  }

  findOne(id: number) {
    return `This action returns a #${id} materialCompl`;
  }

  update(id: number, updateMaterialComplDto: UpdateMaterialComplDto) {
    return `This action updates a #${id} materialCompl`;
  }

  remove(id: number) {
    return `This action removes a #${id} materialCompl`;
  }
}
