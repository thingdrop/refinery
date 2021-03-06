import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { UploadService } from './modules/upload';

const { PORT } = process.env;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /* Server Start */
  await app.listen(PORT);

  /* Queue Start: Begin polling for model upload events */
  const uploadService: UploadService = app.get(UploadService);
  uploadService.listen();

  const logger = new Logger();
  logger.log(`Listening on port: ${PORT}`);
}
bootstrap();
