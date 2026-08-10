import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { AceptarTerminosDto } from './dto/aceptar-terminos.dto';
import type { AceptacionLegalRow } from '../../../shared/interfaces/aceptacion-legal.interface';

@Injectable()
export class AceptacionesLegalesService {
  constructor(private readonly supabase: SupabaseService) {}

  async aceptar(
    usuarioId: string,
    dto: AceptarTerminosDto,
    ipAddress: string | null,
  ): Promise<AceptacionLegalRow> {
    // upsert: si ya existe una fila para este usuario, la reemplaza (sin historial)
    const { data, error } = await this.supabase.client
      .from('aceptaciones_legales')
      .upsert({
        usuario_id: usuarioId,
        version_terminos: dto.versionTerminos,
        version_politica: dto.versionPolitica,
        ip_address: ipAddress,
        fecha_aceptacion: new Date().toISOString(),
      })
      .select()
      .single<AceptacionLegalRow>();

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo registrar la aceptación: ${error.message}`,
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió la aceptación registrada');
    }

    return data;
  }

  async buscarPorUsuario(usuarioId: string): Promise<AceptacionLegalRow | null> {
    const { data, error } = await this.supabase.client
      .from('aceptaciones_legales')
      .select('*')
      .eq('usuario_id', usuarioId)
      .maybeSingle<AceptacionLegalRow>();

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo consultar la aceptación: ${error.message}`,
      );
    }

    return data;
  }
}