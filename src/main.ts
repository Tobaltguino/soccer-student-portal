import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AuditInterceptor } from './core/audit/audit.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Para que req.ip capture la IP real del cliente cuando la app
  // esté detrás de un proxy/load balancer (Vercel, Railway, nginx, etc.)
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // Habilitar peticiones desde otros dominios (tu frontend)
  app.enableCors();

  // Activar validaciones globales con class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Elimina campos adicionales que no estén definidos en el DTO
      forbidNonWhitelisted: true, // Retorna un error 400 si el cliente envía campos no permitidos
      transform: true,            // Transforma automáticamente los payloads a las instancias de los DTOs
    }),
  );

  // Auditoría automática de POST/PATCH/DELETE y GETs sensibles (datos de salud)
  app.useGlobalInterceptors(app.get(AuditInterceptor));

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();