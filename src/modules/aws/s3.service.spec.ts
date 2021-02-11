import { Test, TestingModule } from '@nestjs/testing';
import { S3Service } from './s3.service';
import { AWS_OPTIONS } from './types';
import { AwsService } from './aws.service';

const mockAwsService = () => ({
  aws: {
    S3: jest.fn(),
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

describe('S3Service', () => {
  let service: S3Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        S3Service,
        { provide: AWS_OPTIONS, useFactory: mockAwsOptions },
        { provide: AwsService, useFactory: mockAwsService },
      ],
    }).compile();

    service = module.get<S3Service>(S3Service);
  });

  it('is defined', () => {
    expect(service).toBeDefined();
  });
});
