import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Enable CORS for frontend applications
  app.enableCors({
    origin: [
      `http://localhost:${configService.get('NEXT_PUBLIC_ADMIN_PORT', 3000)}`,
      `http://localhost:${configService.get('NEXT_PUBLIC_STUDENT_PORT', 3002)}`,
    ],
    credentials: true,
  });

  // Enable validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // API prefix
  app.setGlobalPrefix('api');

  const port = configService.get('API_PORT', 3001);
  await app.listen(port);
  
  console.log(`🚀 Backend API running on: http://localhost:${port}/api`);
}
bootstrap();
