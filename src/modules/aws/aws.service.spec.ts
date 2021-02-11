import { Test, TestingModule } from '@nestjs/testing';
import { AwsService } from './aws.service';
import { AWS_OPTIONS } from './types';

const mockAwsOptions = () => ({
  accessKeyId: 'test',
  secretAccessKey: 'test',
  region: 'test',
  s3: {
    signatureVersion: 'test',
    region: 'test',
  },
  sqs: {
    region: 'test',
  },
});

describe('AwsService', () => {
  let service: AwsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsService,
        { provide: AWS_OPTIONS, useFactory: mockAwsOptions },
      ],
    }).compile();

    service = module.get<AwsService>(AwsService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
