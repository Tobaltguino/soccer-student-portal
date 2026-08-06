import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
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
    gruposPermitidos: number[] | null = null,
  ): Promise<AsistenciaRow[]> {
    await this.verificarAccesoClase(claseId, gruposPermitidos);

    const filas = dto.asistencias.map((a) => ({
      clase_id: claseId,
      estudiante_id: a.estudianteId,
      presente: a.presente,
    }));

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

  async listarPorClase(
    claseId: number,
    gruposPermitidos: number[] | null = null,
  ): Promise<AsistenciaRow[]> {
    await this.verificarAccesoClase(claseId, gruposPermitidos);

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

  async listarPorEstudiante(
    estudianteId: string,
    gruposPermitidos: number[] | null = null,
  ): Promise<AsistenciaRow[]> {
    let query = this.supabase.client
      .from('asistencias')
      .select('*, clases!inner(grupo_id)')
      .eq('estudiante_id', estudianteId)
      .order('clase_id', { ascending: false });

    if (gruposPermitidos !== null) {
      query = query.in('clases.grupo_id', gruposPermitidos);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(
        `No se pudo listar la asistencia del estudiante: ${error.message}`,
      );
    }

    // Quita el campo "clases" que se agregó solo para el filtro, no es parte de AsistenciaRow
    return (data ?? []).map(({ clases, ...resto }: any) => resto);
  }

  /**
   * Verifica que la clase exista y, si hay restricción de alcance,
   * que pertenezca a uno de los grupos permitidos del usuario.
   */
  private async verificarAccesoClase(
    claseId: number,
    gruposPermitidos: number[] | null,
  ): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('clases')
      .select('grupo_id')
      .eq('id', claseId)
      .single<{ grupo_id: number }>();

    if (error || !data) {
      throw new BadRequestException('La clase indicada no existe');
    }

    if (gruposPermitidos !== null && !gruposPermitidos.includes(data.grupo_id)) {
      throw new BadRequestException('La clase indicada no existe');
    }
  }
}