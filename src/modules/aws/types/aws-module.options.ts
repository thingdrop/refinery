export interface AwsModuleOptions {
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
  s3?: S3;
  sqs: SQS;
}

interface S3 {
  signatureVersion: string;
  region?: string;
}

interface SQS {
  region?: string;
}

export const AWS_OPTIONS = 'AWS_OPTIONS';
