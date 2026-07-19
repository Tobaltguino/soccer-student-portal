import { Test, TestingModule } from '@nestjs/testing';
import { MaterialComplService } from './material-compl.service';

describe('MaterialComplService', () => {
  let service: MaterialComplService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MaterialComplService],
    }).compile();

    service = module.get<MaterialComplService>(MaterialComplService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
