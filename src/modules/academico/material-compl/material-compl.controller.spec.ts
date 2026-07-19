import { Test, TestingModule } from '@nestjs/testing';
import { MaterialComplController } from './material-compl.controller';
import { MaterialComplService } from './material-compl.service';

describe('MaterialComplController', () => {
  let controller: MaterialComplController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaterialComplController],
      providers: [MaterialComplService],
    }).compile();

    controller = module.get<MaterialComplController>(MaterialComplController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
