import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { RegistrarAsistenciasLoteDto } from './dto/registrar-asistencias-lotes.dto';
import type { AsistenciaRow } from './interfaces/asistencias.interface';
import { lanzarErrorSupabaseConFk } from '../../../shared/utils/supabase-error.util';

@Injectable()
export class AsistenciasService {
  constructor(private readonly supabase: SupabaseService) {}

  async registrarLote(
    claseId: number,
    dto: RegistrarAsistenciasLoteDto,
  ): Promise<AsistenciaRow[]> {
    const filas = dto.asistencias.map((a) => ({
      clase_id: claseId,
      estudiante_id: a.estudianteId,
      presente: a.presente,
    }));

    // upsert: si ya existía el registro para ese estudiante en esa clase,
    // lo actualiza en vez de duplicarlo (útil para corregir asistencia)
    const { data, error } = await this.supabase.client
      .from('asistencias')
      .upsert(filas, { onConflict: 'clase_id,estudiante_id' })
      .select();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo registrar la asistencia',
        'La clase o algún estudiante indicado no existe',
      );
    }

    return (data ?? []) as AsistenciaRow[];
  }

  async listarPorClase(claseId: number): Promise<AsistenciaRow[]> {
    const { data, error } = await this.supabase.client
      .from('asistencias')
      .select('*')
      .eq('clase_id', claseId);

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar la asistencia: ${error.message}`,
      );
    }

    return data ?? [];
  }

  async listarPorEstudiante(estudianteId: string): Promise<AsistenciaRow[]> {
    const { data, error } = await this.supabase.client
      .from('asistencias')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('clase_id', { ascending: false });

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar la asistencia del estudiante: ${error.message}`,
      );
    }

    return data ?? [];
  }
}