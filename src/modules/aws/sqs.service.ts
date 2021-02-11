import { Injectable, Inject } from '@nestjs/common';
import { Consumer } from 'sqs-consumer';
import { AwsService } from './aws.service';
import { AWS_OPTIONS, AwsModuleOptions } from './types';

@Injectable()
export class SqsService {
  private sqsClient;

  constructor(
    @Inject(AWS_OPTIONS) private options: AwsModuleOptions,
    private awsService: AwsService,
  ) {
    const { region } = options.sqs;
    this.sqsClient = new this.awsService.aws.SQS({ region });
  }

  sendMessage(queueUrl: string, message: any): Promise<any> {
    const params = {
      MessageBody: JSON.stringify(message),
      QueueUrl: queueUrl,
    };
    return new Promise((resolve, reject) => {
      this.sqsClient.sendMessage(params, (error, data) => {
        if (error) reject(error);
        resolve(data);
      });
    });
  }

  createListener(queueUrl: string, handleMessage: any) {
    return Consumer.create({
      sqs: this.sqsClient,
      pollingWaitTimeMs: 10000,
      queueUrl,
      handleMessage: async (message) => handleMessage(message),
    });
  }
}
