import { Injectable, Inject } from '@nestjs/common';
import { S3 } from 'aws-sdk';
import { AwsService } from './aws.service';
import { AWS_OPTIONS, AwsModuleOptions, SignedUrlOptions } from './types';

@Injectable()
export class S3Service {
  private s3: S3;

  constructor(
    @Inject(AWS_OPTIONS) private options: AwsModuleOptions,
    private awsService: AwsService,
  ) {
    const { signatureVersion, region } = options.s3;
    this.s3 = new this.awsService.aws.S3({
      signatureVersion,
      region,
    });
  }

  createPresignedPost(policy: any) {
    return this.s3.createPresignedPost(policy);
  }

  createSignedUploadUrl(options: SignedUrlOptions) {
    const { expires, key, metadata, contentType } = options;
    return this.s3.getSignedUrl('putObject', {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Expires: expires,
      Metadata: metadata,
      Key: key,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000',
    });
  }

  createSignedDownloadUrl(options: SignedUrlOptions) {
    const { expires, key } = options;
    return this.s3.getSignedUrl('getObject', {
      Bucket: process.env.AWS_S3_BUCKET_NAME,
      Expires: expires,
      Key: key,
      ResponseContentDisposition: 'attachment',
      ResponseCacheControl: 'public, max-age=31536000',
    });
  }

  headObject(bucket: string, key: string): Promise<any> {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    return new Promise((resolve, reject) => {
      this.s3.headObject(params, (error, data) => {
        if (error) reject(error);
        resolve(data);
      });
    });
  }

  getObject(bucket: string, key: string): Promise<any> {
    const params = {
      Bucket: bucket,
      Key: key,
    };
    return new Promise((resolve, reject) => {
      this.s3.getObject(params, (error, data) => {
        if (error) reject(error);
        resolve(data);
      });
    });
  }

  putObject(file, options) {
    const { bucket, key, metadata, encoding, contentType } = options;
    const params = {
      Body: file,
      Bucket: bucket,
      Key: key,
      StorageClass: process.env.AWS_S3_STORAGE_CLASS,
      Metadata: metadata,
      ContentEncoding: encoding,
      ContentType: contentType,
    };
    return new Promise((resolve, reject) => {
      this.s3.putObject(params, (error, data) => {
        if (error) reject(error);
        resolve(data);
      });
    });
  }

  deleteObject(options) {
    const { bucket, key } = options;
    const params = { Bucket: bucket, Key: key };
    return new Promise((resolve, reject) => {
      this.s3.deleteObject(params, (error, data) => {
        if (error) reject(error);
        resolve(data);
      });
    });
  }

  createUrl(bucket: string, key: string) {
    const { region } = this.options.s3;
    return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
  }
}
