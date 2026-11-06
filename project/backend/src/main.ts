import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Prefix toàn bộ API với /api
  app.setGlobalPrefix('api');

  // Enable CORS cho Frontend
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // Middleware parse URL-encoded cho Webhook
  app.use(express.urlencoded({ extended: true }));
  app.use(express.json());

  // Pipeline Validation tự động transform DTO
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 Homestay Backend API is running on: http://localhost:${port}/api`);
}

bootstrap();
