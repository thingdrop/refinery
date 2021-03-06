import * as zlib from 'zlib';
import { Injectable, Logger } from '@nestjs/common';
import { S3Service, SqsService } from '../aws';
import Converter from './converters';
import { writeFile } from 'fs';

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
    const { buffer } = file;
    const converter = new Converter(buffer.toString('binary'), 'stl');
    await converter.exportGlb();
    // const compressedFile = await this.compressFile(glb);
    // const newKey = this.createKey('models', object.key, 'glb');

    const png: any = await converter.capture();
    writeFile('test.png', png, (err) => {
      if (err) throw err;
      console.log('The file has been saved!');
    });
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

      const ext = this.getFileExtension(object.key).toLowerCase();

      // @TODO: Place this logic into converter? This logic might grow as file types are supported and
      // is related to converter's concerns.
      // {{
      let fileBody;
      if (ext === 'obj') fileBody = fileResponse.Body.toString('utf-8');
      //Needed because OBJLoader doesn't support ArrayBuffer
      else fileBody = fileResponse.Body.buffer;
      // }}

      const converter = new Converter(fileBody, ext);

      const compressedFile = await this.compressFile(
        await converter.exportGlb(),
      );
      const newKey = this.createKey('models', object.key, 'glb');

      const png = await converter.capture();
      // fs.writeFileSync('hi.png', png);
      const imageKey = this.createKey('images', newKey, 'png');

      /* Save GLB file & preview PNG to s3 */
      await Promise.all([
        this.s3Service.putObject(compressedFile, {
          bucket: bucket.name,
          key: newKey,
          metadata: { model: modelId },
          encoding: 'gzip',
          contentType: 'model/gltf-binary',
        }),
        this.s3Service.putObject(png, {
          bucket: process.env.AWS_S3_PUBLIC_BUCKET_NAME,
          key: imageKey,
          metadata: { model: modelId },
          contentType: 'image/png',
        }),
      ]);

      const [fileHeadResponse] = await Promise.all([
        this.s3Service.headObject(bucket.name, newKey),
        this.s3Service.headObject(
          process.env.AWS_S3_PUBLIC_BUCKET_NAME,
          imageKey,
        ),
      ]);

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

  getFileExtension = (path) => {
    const extension = path.slice(path.lastIndexOf('.') + 1);
    return extension.toLowerCase();
  };
}
