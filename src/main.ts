import * as dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AppModule } from './app.module';

const { PORT } = process.env;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  /* Server Start */
  await app.listen(PORT);

  const logger = new Logger();
  logger.log(`Listening on port: ${PORT}`);
}
bootstrap();
