import { Test, TestingModule } from '@nestjs/testing';
import { SqsService, S3Service } from '../aws';
import { UploadService } from './upload.service';

const mockSqsService = () => ({});
const mockS3Service = () => ({});

const mockId = 'e4a1e94a-4c10-4c9f-a51a-8612e7d9c06b';
const mockModel = {
  id: mockId,
  name: 'Test Model',
  description: 'Test description',
  canDownload: true,
};

describe('UploadService', () => {
  let uploadService: UploadService;
  let sqsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        { provide: S3Service, useFactory: mockS3Service },
        { provide: SqsService, useFactory: mockSqsService },
      ],
    }).compile();

    uploadService = module.get<UploadService>(UploadService);
    sqsService = module.get<SqsService>(SqsService);
  });

  it('is defined', () => {
    expect(uploadService).toBeDefined();
  });

  xdescribe('handleUploadEvent', () => {
    it('processes the upload event', () => {});

    it('rejects when event handling fails', () => {});
  });
});
