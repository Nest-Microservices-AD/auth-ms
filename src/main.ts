import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { envs } from './config';
import {
  MicroserviceOptions,
  RpcException,
  Transport,
} from '@nestjs/microservices';
import {
  HttpStatus,
  Logger,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('authService');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (validationErrors: ValidationError[] = []) => {
        return new RpcException({
          status: HttpStatus.BAD_REQUEST,
          message: validationErrors.map((error) => ({
            field: error.property,
            error: Object.values(error.constraints).join(', '),
          })),
        });
      },
    }),
  );
  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.NATS,
      options: {
        servers: envs.NATS_SERVERS,
      },
    },
    { inheritAppConfig: true },
  );
  await app.startAllMicroservices();
  await app.listen(envs.PORT || 3000);
  logger.log(`AUTH Service started on port ${envs.PORT}`);
}
bootstrap();
