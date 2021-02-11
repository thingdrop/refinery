import { Module, DynamicModule, Global } from '@nestjs/common';
import { AwsModuleOptions, AWS_OPTIONS } from './types';
import { AwsService } from './aws.service';
import { S3Service } from './s3.service';
import { SqsService } from './sqs.service';

export function AwsOptionsProvider(options) {
  return {
    provide: AWS_OPTIONS,
    useValue: options,
  };
}

@Global()
@Module({})
export class AwsModule {
  static register(options: AwsModuleOptions): DynamicModule {
    return {
      module: AwsModule,
      imports: [],
      controllers: [],
      providers: [
        AwsService,
        S3Service,
        SqsService,
        AwsOptionsProvider(options),
      ],
      exports: [S3Service, SqsService, AwsOptionsProvider(options)],
    };
  }
}
