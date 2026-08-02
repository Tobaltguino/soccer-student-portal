import { Test, TestingModule } from '@nestjs/testing';
import { KinesiologosService } from './kinesiologos.service';

describe('KinesiologosService', () => {
  let service: KinesiologosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KinesiologosService],
    }).compile();

    service = module.get<KinesiologosService>(KinesiologosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
