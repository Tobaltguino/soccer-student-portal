import { Injectable } from '@nestjs/common';
import { CreateKineDto } from './dto/create-kine.dto';
import { UpdateKineDto } from './dto/update-kine.dto';

@Injectable()
export class KineService {
  create(createKineDto: CreateKineDto) {
    return 'This action adds a new kine';
  }

  findAll() {
    return `This action returns all kine`;
  }

  findOne(id: number) {
    return `This action returns a #${id} kine`;
  }

  update(id: number, updateKineDto: UpdateKineDto) {
    return `This action updates a #${id} kine`;
  }

  remove(id: number) {
    return `This action removes a #${id} kine`;
  }
}
