import { Test, TestingModule } from '@nestjs/testing';
import { SqsService } from './sqs.service';
import { AWS_OPTIONS } from './types';
import { AwsService } from './aws.service';

const mockAwsService = () => ({
  aws: {
    SQS: jest.fn(),
  },
});

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

describe('SqsService', () => {
  let service: SqsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SqsService,
        { provide: AWS_OPTIONS, useFactory: mockAwsOptions },
        { provide: AwsService, useFactory: mockAwsService },
      ],
    }).compile();

    service = module.get<SqsService>(SqsService);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
