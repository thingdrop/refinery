import { Injectable, Inject } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import { AWS_OPTIONS, AwsModuleOptions } from './types';

@Injectable()
export class AwsService {
  public aws;

  constructor(@Inject(AWS_OPTIONS) private options: AwsModuleOptions) {
    const { accessKeyId, secretAccessKey, region } = options;
    AWS.config.update({
      accessKeyId,
      secretAccessKey,
      region,
    });

    this.aws = AWS;
  }
}
