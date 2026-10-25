import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import {
  HistorialClinico,
  CrearHistorialPayload,
  ActualizarHistorialPayload
} from '../models/historial-clinico.interface';

@Injectable({
  providedIn: 'root'
})
export class HistorialClinicoService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  /**
   * Crea un nuevo registro en el historial clínico de un estudiante.
   */
  async crearHistorial(payload: CrearHistorialPayload): Promise<HistorialClinico> {
    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .insert({
        estudiante_id: payload.estudianteId,
        tipo: payload.tipo,
        diagnostico: payload.diagnostico ?? null,
        fecha_evento: payload.fechaEvento,
        estado: payload.estado ?? 'EN_OBSERVACION',
        observaciones: payload.observaciones ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el registro clínico: ${error?.message || 'Estudiante no encontrado'}`);
    }

    return data as HistorialClinico;
  }

  /**
   * Lista el historial clínico del estudiante autenticado.
   */
  async listarMiHistorial(): Promise<HistorialClinico[]> {
    const { data: authData } = await this.supabase.auth.getSession();
    const estudianteId = authData?.session?.user?.id;

    if (!estudianteId) throw new Error('Usuario no autenticado');

    return this.listarHistorialPorEstudiante(estudianteId);
  }

  /**
   * Lista el historial clínico de un estudiante específico.
   */
  async listarHistorialPorEstudiante(estudianteId: string): Promise<HistorialClinico[]> {
    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .is('eliminado_at', null)
      .order('fecha_evento', { ascending: false });

    if (error) {
      throw new Error(`No se pudo listar el historial: ${error.message}`);
    }

    return (data ?? []) as HistorialClinico[];
  }

  /**
   * Devuelve solo el estado de salud general del estudiante (sin diagnóstico ni observaciones).
   * Prioridad de severidad: EN_TRATAMIENTO > EN_OBSERVACION > EN_REINTEGRO_DEPORTIVO > SANO.
   */
  async obtenerEstadoSalud(estudianteId: string): Promise<{ estado: string }> {
    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .select('estado')
      .eq('estudiante_id', estudianteId)
      .is('eliminado_at', null)
      .neq('estado', 'RECUPERADO');

    if (error) {
      throw new Error(`No se pudo obtener el estado de salud: ${error.message}`);
    }

    const estados = (data ?? []).map((r: any) => r.estado);

    let estado = 'SANO';
    if (estados.includes('EN_TRATAMIENTO')) estado = 'EN_TRATAMIENTO';
    else if (estados.includes('EN_OBSERVACION')) estado = 'EN_OBSERVACION';
    else if (estados.includes('EN_REINTEGRO_DEPORTIVO')) estado = 'EN_REINTEGRO_DEPORTIVO';

    return { estado };
  }

  /**
   * Devuelve un mapa { usuarioId: estado } con el estado de salud general de todos 
   * los estudiantes dentro del alcance del usuario actual.
   */
  async obtenerEstadoSaludGrupal(): Promise<Record<string, string>> {
    const { userId, rol } = await this.obtenerDatosAutenticacion();
    let gruposPermitidos: number[] | null = null;

    if (rol === 'profesor' || rol === 'kinesiologo') {
      gruposPermitidos = await this.obtenerIdsGruposAsignadosStaff(userId, rol);
      if (gruposPermitidos.length === 0) return {};
    }

    let queryEstudiantes = this.supabase.from('usu_estudiantes').select('id_usuario');
    if (gruposPermitidos !== null) {
      queryEstudiantes = queryEstudiantes.in('grupo_id', gruposPermitidos);
    }

    const { data: estudiantes, error: errorEst } = await queryEstudiantes;
    if (errorEst) throw new Error(`No se pudo obtener los estudiantes: ${errorEst.message}`);

    const ids = (estudiantes ?? []).map((e: any) => e.id_usuario);
    const mapa: Record<string, string> = {};
    ids.forEach((id) => (mapa[id] = 'SANO'));

    if (ids.length === 0) return mapa;

    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .select('estudiante_id, estado')
      .in('estudiante_id', ids)
      .is('eliminado_at', null)
      .neq('estado', 'RECUPERADO');

    if (error) {
      throw new Error(`No se pudo obtener el estado de salud grupal: ${error.message}`);
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

  /**
   * Obtiene el detalle de un registro de historial clínico específico.
   */
  async obtenerHistorialPorId(id: number): Promise<HistorialClinico> {
    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single();

    if (error || !data) {
      throw new Error('Registro clínico no encontrado');
    }

    return data as HistorialClinico;
  }

  /**
   * Obtiene la cantidad única de pacientes en tratamiento, observación y reintegro.
   */
  async obtenerEstadisticasDashboard(): Promise<{ enTratamiento: number; enObservacion: number; enReintegro: number }> {
    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .select('estudiante_id, estado')
      .in('estado', ['EN_TRATAMIENTO', 'EN_OBSERVACION', 'EN_REINTEGRO_DEPORTIVO'])
      .is('eliminado_at', null);

    if (error) {
      throw new Error(`No se pudieron obtener las estadísticas: ${error.message}`);
    }

    const setTratamiento = new Set<string>();
    const setObservacion = new Set<string>();
    const setReintegro = new Set<string>();

    (data ?? []).forEach((h: any) => {
      if (h.estado === 'EN_TRATAMIENTO') setTratamiento.add(h.estudiante_id);
      if (h.estado === 'EN_OBSERVACION') setObservacion.add(h.estudiante_id);
      if (h.estado === 'EN_REINTEGRO_DEPORTIVO') setReintegro.add(h.estudiante_id);
    });

    return {
      enTratamiento: setTratamiento.size,
      enObservacion: setObservacion.size,
      enReintegro: setReintegro.size,
    };
  }

  /**
   * Actualiza un registro del historial clínico.
   */
  async actualizarHistorial(id: number, payload: ActualizarHistorialPayload): Promise<HistorialClinico> {
    const updateData: Record<string, any> = {};

    if (payload.tipo !== undefined) updateData['tipo'] = payload.tipo;
    if (payload.diagnostico !== undefined) updateData['diagnostico'] = payload.diagnostico;
    if (payload.fechaEvento !== undefined) updateData['fecha_evento'] = payload.fechaEvento;
    if (payload.estado !== undefined) updateData['estado'] = payload.estado;
    if (payload.observaciones !== undefined) updateData['observaciones'] = payload.observaciones;

    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el registro: ${error?.message || 'Registro no encontrado'}`);
    }

    return data as HistorialClinico;
  }

  /**
   * Elimina lógicamente (soft-delete) un registro del historial.
   */
  async eliminarHistorial(id: number): Promise<HistorialClinico> {
    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo eliminar el registro: ${error?.message || 'Registro no encontrado'}`);
    }

    return data as HistorialClinico;
  }

  /**
   * Restaura un registro eliminado lógicamente.
   */
  async restaurarHistorial(id: number): Promise<HistorialClinico> {
    const { data, error } = await this.supabase
      .from('kine_historial_clinico')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo restaurar el registro: ${error?.message || 'Registro no encontrado'}`);
    }

    return data as HistorialClinico;
  }

  // =========================================================================
  // MÉTODOS PRIVADOS
  // =========================================================================
  private async obtenerDatosAutenticacion(): Promise<{ userId: string; rol: string }> {
    // Usuario y rol salen de la caché de AuthService
    const userId = await this.authService.obtenerUsuarioId();
    return { userId, rol: await this.authService.obtenerRolActual() };
  }

  private async obtenerIdsGruposAsignadosStaff(_userId: string, _rol: string): Promise<number[]> {
    return this.authService.obtenerGruposStaff();
  }
}