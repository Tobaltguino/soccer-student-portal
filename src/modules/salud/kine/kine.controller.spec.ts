import { Test, TestingModule } from '@nestjs/testing';
import { KineController } from './kine.controller';
import { KineService } from './kine.service';

describe('KineController', () => {
  let controller: KineController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KineController],
      providers: [KineService],
    }).compile();

    controller = module.get<KineController>(KineController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
