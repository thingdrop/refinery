import { Test, TestingModule } from '@nestjs/testing';
import { SqsService, S3Service } from '../aws';
import { UploadService } from './upload.service';

const mockSqsService = () => ({});
const mockS3Service = () => ({});

describe('UploadService', () => {
  let uploadService: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: S3Service, useFactory: mockS3Service },
        { provide: SqsService, useFactory: mockSqsService },
      ],
    }).compile();

    uploadService = module.get<UploadService>(UploadService);
  });

  it('is defined', () => {
    expect(uploadService).toBeDefined();
  });
});
