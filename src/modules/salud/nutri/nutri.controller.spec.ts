import { Test, TestingModule } from '@nestjs/testing';
import { NutriController } from './nutri.controller';
import { NutriService } from './nutri.service';

describe('NutriController', () => {
  let controller: NutriController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NutriController],
      providers: [NutriService],
    }).compile();

    controller = module.get<NutriController>(NutriController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
