import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { requestLogger } from "./common/middleware/request-logger.middleware";
import { PrismaService } from "./prisma/prisma.service";

async function bootstrap() {
  // rawBody: the Stripe webhook verifies its signature over the exact bytes
  // received (req.rawBody); every other route keeps the parsed JSON body.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.use(requestLogger);

  await app.get(PrismaService).enableShutdownHooks(app);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle("Mony API")
    .setDescription("Personal finance API powering the Mony mobile app")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup("docs", app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
}

bootstrap();
