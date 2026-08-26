// modules/salud/kinesiologia/historial-clinico/historial-clinico.service.ts
import { ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../../../core/supabase/supabase.service';
import { CrearHistorialDto } from './dto/crear-historial.dto';
import { ActualizarHistorialDto } from './dto/actualizar-historial.dto';
import type { HistorialClinicoRow } from './interfaces/historial-clinico.interface';
import { lanzarErrorSupabase, lanzarErrorSupabaseConFk } from '../../../../shared/utils/supabase-error.util';

@Injectable()
export class HistorialClinicoService {
  constructor(private readonly supabase: SupabaseService) {}

  async crear(
    dto: CrearHistorialDto,
    gruposPermitidos: number[] | null,
  ): Promise<HistorialClinicoRow> {
    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(dto.estudianteId, gruposPermitidos);
    }

    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .insert({
        estudiante_id: dto.estudianteId,
        tipo: dto.tipo,
        diagnostico: dto.diagnostico ?? null,
        fecha_evento: dto.fechaEvento,
        estado: dto.estado ?? 'EN_OBSERVACION',
        observaciones: dto.observaciones ?? null,
      })
      .select()
      .single<HistorialClinicoRow>();

    if (error) {
      lanzarErrorSupabaseConFk(
        error,
        'No se pudo crear el registro de historial clínico',
        'El estudiante indicado no existe',
      );
    }

    if (!data) {
      throw new InternalServerErrorException('No se recibió el registro creado');
    }

    return data;
  }

  async listarPorEstudiante(
    estudianteId: string,
    gruposPermitidos: number[] | null,
    incluirEliminados: boolean = false,
  ): Promise<HistorialClinicoRow[]> {
    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(estudianteId, gruposPermitidos, true); // 👈 true agregado
    }

    let query = this.supabase.client
      .from('kine_historial_clinico')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('fecha_evento', { ascending: false });

    if (!incluirEliminados) {
      query = query.is('eliminado_at', null);
    }

    const { data, error } = await query;

    if (error) {
      throw new InternalServerErrorException(`No se pudo listar el historial: ${error.message}`);
    }

    return data ?? [];
  }

  async buscarPorId(id: number, gruposPermitidos: number[] | null): Promise<HistorialClinicoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single<HistorialClinicoRow>();

    if (error || !data) {
      throw new NotFoundException('Registro no encontrado');
    }

    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(data.estudiante_id, gruposPermitidos, true);
    }

    return data;
  }

  async obtenerEstadisticasDashboard() {
    // 1. Traemos solo el estado y a quién pertenece
    // Omitimos los que dicen 'RECUPERADO' porque no van en las métricas de alerta
    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .select('estudiante_id, estado')
      .in('estado', ['EN_TRATAMIENTO', 'EN_OBSERVACION', 'EN_REINTEGRO_DEPORTIVO']);

    if (error) {
      lanzarErrorSupabase(error, 'No se pudieron obtener las estadísticas clínicas');
    }

    const stats = {
      enTratamiento: 0,
      enObservacion: 0,
      enReintegro: 0,
    };

    if (data) {
      // 2. Usamos Set para evitar contar dos veces a la misma persona 
      // si tiene 2 lesiones distintas en el mismo estado
      const setTratamiento = new Set<string>();
      const setObservacion = new Set<string>();
      const setReintegro = new Set<string>();

      data.forEach((h: any) => {
        if (h.estado === 'EN_TRATAMIENTO') setTratamiento.add(h.estudiante_id);
        if (h.estado === 'EN_OBSERVACION') setObservacion.add(h.estudiante_id);
        if (h.estado === 'EN_REINTEGRO_DEPORTIVO') setReintegro.add(h.estudiante_id);
      });

      // 3. Asignamos los totales
      stats.enTratamiento = setTratamiento.size;
      stats.enObservacion = setObservacion.size;
      stats.enReintegro = setReintegro.size;
    }

    return stats;
  }

  async actualizar(
    id: number,
    dto: ActualizarHistorialDto,
    gruposPermitidos: number[] | null,
  ): Promise<HistorialClinicoRow> {
    await this.buscarPorId(id, gruposPermitidos);

    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .update({
        ...(dto.tipo !== undefined && { tipo: dto.tipo }),
        ...(dto.diagnostico !== undefined && { diagnostico: dto.diagnostico }),
        ...(dto.fechaEvento !== undefined && { fecha_evento: dto.fechaEvento }),
        ...(dto.estado !== undefined && { estado: dto.estado }),
        ...(dto.observaciones !== undefined && { observaciones: dto.observaciones }),
      })
      .eq('id', id)
      .select()
      .single<HistorialClinicoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo actualizar el registro: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Registro no encontrado');
    }

    return data;
  }

  async eliminar(id: number): Promise<HistorialClinicoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single<HistorialClinicoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo eliminar el registro: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Registro no encontrado');
    }

    return data;
  }

  async restaurar(id: number): Promise<HistorialClinicoRow> {
    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single<HistorialClinicoRow>();

    if (error) {
      throw new InternalServerErrorException(`No se pudo restaurar el registro: ${error.message}`);
    }

    if (!data) {
      throw new NotFoundException('Registro no encontrado');
    }

    return data;
  }

  private async verificarEstudianteEnAlcance(
    estudianteId: string,
    gruposPermitidos: number[],
    esNotFound: boolean = false,
  ): Promise<void> {
    const { data, error } = await this.supabase.client
      .from('estudiantes')
      .select('grupo_id')
      .eq('usuario_id', estudianteId)
      .single<{ grupo_id: number | null }>();

    const fueraDeAlcance =
      error || !data || data.grupo_id === null || !gruposPermitidos.includes(data.grupo_id);

    if (fueraDeAlcance) {
      if (esNotFound) {
        throw new NotFoundException('Registro no encontrado');
      }
      throw new ForbiddenException('El estudiante no pertenece a tu grupo asignado');
    }
  }

  /**
   * Devuelve solo el estado de salud general de un estudiante (sin diagnóstico
   * ni observaciones), calculado a partir de sus eventos clínicos activos.
   * Prioridad de severidad: EN_TRATAMIENTO > EN_OBSERVACION > EN_REINTEGRO_DEPORTIVO > SANO.
   */
  async obtenerEstadoSalud(
    estudianteId: string,
    gruposPermitidos: number[] | null,
  ): Promise<{ estado: string }> {
    if (gruposPermitidos !== null) {
      await this.verificarEstudianteEnAlcance(estudianteId, gruposPermitidos, true);
    }

    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .select('estado')
      .eq('estudiante_id', estudianteId)
      .is('eliminado_at', null)
      .neq('estado', 'RECUPERADO');

    if (error) {
      throw new InternalServerErrorException(`No se pudo obtener el estado de salud: ${error.message}`);
    }

    const estados = (data ?? []).map((r: any) => r.estado);

    let estado = 'SANO';
    if (estados.includes('EN_TRATAMIENTO')) estado = 'EN_TRATAMIENTO';
    else if (estados.includes('EN_OBSERVACION')) estado = 'EN_OBSERVACION';
    else if (estados.includes('EN_REINTEGRO_DEPORTIVO')) estado = 'EN_REINTEGRO_DEPORTIVO';

    return { estado };
  }

  /**
   * Igual que obtenerEstadoSalud, pero para todos los estudiantes dentro
   * del alcance del usuario de una sola vez (para poblar listados/tablas).
   */
  async obtenerEstadoSaludGrupal(gruposPermitidos: number[] | null): Promise<Record<string, string>> {
    let queryEstudiantes = this.supabase.client.from('estudiantes').select('usuario_id');
    if (gruposPermitidos !== null) {
      queryEstudiantes = queryEstudiantes.in('grupo_id', gruposPermitidos);
    }

    const { data: estudiantes, error: errorEst } = await queryEstudiantes;
    if (errorEst) {
      throw new InternalServerErrorException(`No se pudo obtener los estudiantes: ${errorEst.message}`);
    }

    const ids = (estudiantes ?? []).map((e: any) => e.usuario_id);
    const mapa: Record<string, string> = {};
    ids.forEach((id) => (mapa[id] = 'SANO'));

    if (ids.length === 0) return mapa;

    const { data, error } = await this.supabase.client
      .from('kine_historial_clinico')
      .select('estudiante_id, estado')
      .in('estudiante_id', ids)
      .is('eliminado_at', null)
      .neq('estado', 'RECUPERADO');

    if (error) {
      throw new InternalServerErrorException(`No se pudo obtener el estado de salud grupal: ${error.message}`);
    }

    const prioridad = ['EN_TRATAMIENTO', 'EN_OBSERVACION', 'EN_REINTEGRO_DEPORTIVO'];

    (data ?? []).forEach((row: any) => {
      const actual = mapa[row.estudiante_id];
      const indexNuevo = prioridad.indexOf(row.estado);
      const indexActual = prioridad.indexOf(actual);
      if (indexNuevo !== -1 && (indexActual === -1 || indexNuevo < indexActual)) {
        mapa[row.estudiante_id] = row.estado;
      }
    });

    return mapa;
  }
}