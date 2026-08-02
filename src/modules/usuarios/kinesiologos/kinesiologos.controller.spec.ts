import { Test, TestingModule } from '@nestjs/testing';
import { KinesiologosController } from './kinesiologos.controller';

describe('KinesiologosController', () => {
  let controller: KinesiologosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KinesiologosController],
    }).compile();

    controller = module.get<KinesiologosController>(KinesiologosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
