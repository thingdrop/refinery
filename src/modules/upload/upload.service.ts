import * as zlib from 'zlib';
import { Injectable, Logger } from '@nestjs/common';
import { S3Service, SqsService } from '../aws';
import { convertModel, createScreenshot } from './utils';

@Injectable()
export class UploadService {
  private logger: Logger = new Logger(UploadService.name);
  public listener;

  constructor(private s3Service: S3Service, private sqsService: SqsService) {}

  async listen() {
    /* Initialize queue listener */
    const { AWS_REFINERY_QUEUE } = process.env;
    this.listener = this.sqsService.createListener(
      AWS_REFINERY_QUEUE,
      this.handleUploadEvent,
    );
    this.listener.start();

    if (this.listener.isRunning) {
      this.logger.log('Listening for upload events');
    }
  }

  /* Connects to POST /upload for locally uploading files (testing) */
  handleFile = async (file) => {
    console.log({ file });
    // const { buffer } = file;
    // const converter = new Converter(buffer.toString('binary'), 'stl');
    // await converter.exportGlb();
    // // const compressedFile = await this.compressFile(glb);
    // // const newKey = this.createKey('models', object.key, 'glb');
    // const png: any = await converter.capture();
    // writeFile('test.png', png, (err) => {
    //   if (err) throw err;
    //   console.log('The file has been saved!');
    // });
  };

  handleUploadEvent = async (message): Promise<void> => {
    this.logger.log(`[EVENT: Uploaded Model]: ${JSON.stringify(message)}`);
    try {
      const body = JSON.parse(message.Body);
      const { bucket, object } = body.Records[0]?.s3;

      /* Retrieve file */
      const fileResponse = await this.s3Service.getObject(
        bucket.name,
        object.key,
      );

      const { model: modelId } = fileResponse.Metadata;

      const extension = this.getFileExtension(object.key).toLowerCase();

      const glb = await convertModel(fileResponse.Body, { extension });

      const modelImage = await createScreenshot(glb, {
        dimensions: {
          width: 1600,
          height: 900,
        },
        colors: {
          mesh: '#fafafa',
          fog: '#1a1a1a',
        },
      });

      const compressedGlb = await this.compressFile(glb);

      const newKey = this.createKey('models', object.key, 'glb');

      const imageKey = this.createKey('images', newKey, 'webp');

      /* Save GLB file & model image to s3 */
      await Promise.all([
        this.s3Service.putObject(compressedGlb, {
          bucket: process.env.AWS_S3_MODEL_BUCKET_NAME,
          key: newKey,
          metadata: { model: modelId },
          encoding: 'gzip',
          contentType: 'model/gltf-binary',
        }),
        this.s3Service.putObject(modelImage, {
          bucket: process.env.AWS_S3_PUBLIC_BUCKET_NAME,
          key: imageKey,
          metadata: { model: modelId },
          contentType: 'image/webp',
        }),
      ]);

      const [fileHeadResponse] = await Promise.all([
        this.s3Service.headObject(process.env.AWS_S3_MODEL_BUCKET_NAME, newKey),
        this.s3Service.headObject(
          process.env.AWS_S3_PUBLIC_BUCKET_NAME,
          imageKey,
        ),
      ]);

      /* Success! Now delete the original model file that user uploaded */
      await this.s3Service.deleteObject({
        bucket: bucket.name,
        key: object.key,
      });

      const imageUrl = this.s3Service.createUrl(
        process.env.AWS_S3_PUBLIC_BUCKET_NAME,
        imageKey,
      );

      const { AWS_SERVITOR_QUEUE } = process.env;
      await this.sqsService.sendMessage(AWS_SERVITOR_QUEUE, {
        modelId,
        file: {
          originalKey: object.key,
          key: newKey,
          imagePreview: imageUrl,
          eTag: fileHeadResponse.ETag,
          size: fileHeadResponse.ContentLength,
          bucket: bucket.name,
        },
      });
    } catch (error) {
      this.logger.error(error);
      return Promise.reject(error);
    }
  };

  compressFile(input) {
    return new Promise((resolve, reject) => {
      zlib.gzip(input, {}, (error, result) => {
        if (!error) resolve(result);
        else reject(error);
      });
    });
  }

  createKey(folder: string, filename: string, ext: string): string {
    const name: string = filename
      .split('/')
      .slice(1)
      .join('')
      .split('.')
      .slice(0, -1)
      .join('');
    return `${folder}/${name}.${ext}`;
  }

  getFileExtension = (path): string => {
    const extension = path.slice(path.lastIndexOf('.') + 1);
    return extension.toLowerCase();
  };
}
