import { Test, TestingModule } from '@nestjs/testing';
import { CentralController } from './central.controller';

describe('CentralController', () => {
  let controller: CentralController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CentralController],
    }).compile();

    controller = module.get<CentralController>(CentralController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
