import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { AuditoriaService } from './audit.service';
import { esRutaSensible } from '../../shared/constants/rutas-sensibles.constant';

const METODOS_SIEMPRE_AUDITADOS = ['POST', 'PATCH', 'DELETE', 'PUT'];

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, originalUrl, params, body, user, ip } = request;

    const debeAuditarse =
      METODOS_SIEMPRE_AUDITADOS.includes(method) ||
      (method === 'GET' && esRutaSensible(originalUrl));

    if (!debeAuditarse) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: () => this.registrar(request, 200),
        error: (err) => this.registrar(request, err?.status ?? 500),
      }),
    );
  }

  private registrar(request: any, statusCode: number): void {
    const { method, originalUrl, params, body, user, ip } = request;

    // No esperamos (await) esto para no retrasar la respuesta al usuario
    this.auditoriaService.registrar({
      usuarioId: user?.id ?? null,
      usuarioEmail: user?.email ?? null,
      usuarioRol: user?.rol ?? null,
      metodo: method,
      ruta: originalUrl,
      parametros: params,
      cuerpoEnviado: body,
      statusCode,
      ipAddress: ip ?? null,
    });
  }
}