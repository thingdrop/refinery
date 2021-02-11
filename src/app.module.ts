import { Module } from '@nestjs/common';
import { AwsModule } from './modules/aws';
import { UploadModule } from './modules/upload';

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_KEY,
  AWS_REGION,
  AWS_S3_SIGNATURE_VERSION,
} = process.env;

@Module({
  imports: [
    UploadModule,
    AwsModule.register({
      accessKeyId: AWS_ACCESS_KEY_ID,
      secretAccessKey: AWS_SECRET_KEY,
      region: AWS_REGION,
      s3: {
        signatureVersion: AWS_S3_SIGNATURE_VERSION,
        region: AWS_REGION,
      },
      sqs: {
        region: AWS_REGION,
      },
    }),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
