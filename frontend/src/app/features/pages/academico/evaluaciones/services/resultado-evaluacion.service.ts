import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../core/supabase/supabase';
import {
  ResultadoBase,
  ResultadoConRango,
  ResultadoConDetalle,
  CrearResultadoPayload,
  ActualizarResultadoPayload,
  FilaExcelResultadoSesion
} from '../models/resultado.interface';
import { RangoEvaluacion } from '../models/rango.interface';
import { calcularEdad } from '../../../../../shared/utils/fechas.util';

@Injectable({
  providedIn: 'root'
})
export class ResultadoEvaluacionService {
  private supabase = inject(SupabaseService).client;

  /**
   * Registra el resultado de un estudiante en una sesión (Admin, Profesor en sus grupos según RLS).
   */
  async crearResultado(payload: CrearResultadoPayload): Promise<ResultadoConDetalle> {
    const { data, error } = await this.supabase
      .from('aca_evaluaciones_resultados')
      .insert({
        sesion_id: payload.sesionId,
        estudiante_id: payload.estudianteId,
        valor_numerico: payload.valorNumerico,
        observacion: payload.observacion ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el resultado: ${error?.message || 'Error desconocido'}`);
    }

    const enriquecidos = await this.enriquecerResultadosEnLote([data as ResultadoBase]);
    return enriquecidos[0];
  }

  /**
   * Lista todos los resultados asociados a una sesión específica (Admin, Profe, Kine).
   */
  async listarResultadosPorSesion(sesionId: string): Promise<ResultadoConDetalle[]> {
    const { data, error } = await this.supabase
      .from('aca_evaluaciones_resultados')
      .select('*')
      .eq('sesion_id', sesionId);

    if (error) {
      throw new Error(`No se pudo listar los resultados de la sesión: ${error.message}`);
    }

    const resultados = (data ?? []) as ResultadoBase[];
    return this.enriquecerResultadosEnLote(resultados);
  }

  /**
   * Lista los resultados del estudiante autenticado correspondientes a sesiones FINALIZADAS.
   */
  async listarMisResultados(): Promise<ResultadoConDetalle[]> {
    const { data: authData } = await this.supabase.auth.getSession();
    const estudianteId = authData?.session?.user?.id;

    if (!estudianteId) {
      throw new Error('Usuario no autenticado');
    }

    const { data, error } = await this.supabase
      .from('aca_evaluaciones_resultados')
      .select('*, aca_evaluaciones_sesiones!inner(estado)')
      .eq('estudiante_id', estudianteId)
      .eq('aca_evaluaciones_sesiones.estado', 'FINALIZADA')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudieron listar tus resultados: ${error.message}`);
    }

    const resultados = (data ?? []).map(
      ({ aca_evaluaciones_sesiones, ...resto }: any) => resto
    ) as ResultadoBase[];

    return this.enriquecerResultadosEnLote(resultados);
  }

  /**
   * Lista el historial de resultados de un estudiante específico (Admin, Profe, Kine).
   * RLS filtra automáticamente según los grupos permitidos.
   */
  async listarResultadosPorEstudiante(estudianteId: string): Promise<ResultadoConDetalle[]> {
    const { data, error } = await this.supabase
      .from('aca_evaluaciones_resultados')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudo listar los resultados del estudiante: ${error.message}`);
    }

    const resultados = (data ?? []) as ResultadoBase[];
    return this.enriquecerResultadosEnLote(resultados);
  }

  /**
   * Actualiza el valor numérico u observación de un resultado (Admin, Profesor).
   */
  async actualizarResultado(
    id: number,
    payload: ActualizarResultadoPayload
  ): Promise<ResultadoConDetalle> {
    const updateData: Record<string, any> = {};

    if (payload.valorNumerico !== undefined) updateData['valor_numerico'] = payload.valorNumerico;
    if (payload.observacion !== undefined) updateData['observacion'] = payload.observacion;

    const { data, error } = await this.supabase
      .from('aca_evaluaciones_resultados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el resultado: ${error?.message || 'Resultado no encontrado'}`);
    }

    const enriquecidos = await this.enriquecerResultadosEnLote([data as ResultadoBase]);
    return enriquecidos[0];
  }

  /**
   * Elimina permanentemente un resultado (Solo Administrador según RLS).
   */
  async eliminarResultado(id: number): Promise<void> {
    const { error } = await this.supabase
      .from('aca_evaluaciones_resultados')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el resultado: ${error.message}`);
    }
  }

  /**
   * Prepara los datos enriquecidos con RUT y Nombre del alumno para exportar a Excel en el frontend.
   */
  async obtenerDatosExcelPorSesion(sesionId: string): Promise<FilaExcelResultadoSesion[]> {
    const resultadosEnriquecidos = await this.listarResultadosPorSesion(sesionId);

    if (resultadosEnriquecidos.length === 0) {
      throw new Error('No hay resultados registrados en esta sesión para exportar.');
    }

    const idsEstudiantes = [...new Set(resultadosEnriquecidos.map((r) => r.estudiante_id))];
    const { data: perfiles } = await this.supabase
      .from('usu_perfiles')
      .select('id_usuario, nombre, apellido, rut')
      .in('id_usuario', idsEstudiantes);

    const mapaPerfiles = new Map((perfiles ?? []).map((p: any) => [p.id_usuario, p]));
    const infoEvaluacion = resultadosEnriquecidos[0].evaluacion;

    return resultadosEnriquecidos.map((r) => {
      const perfil = mapaPerfiles.get(r.estudiante_id);
      return {
        rut: perfil?.rut || 'Sin RUT',
        nombreCompleto: `${perfil?.nombre || ''} ${perfil?.apellido || ''}`.trim() || '-',
        edad: r.edadEvaluacion ?? 'N/A',
        resultado: `${r.valor_numerico} ${infoEvaluacion.unidadMedida}`.trim(),
        rango: r.rango?.nombreEtiqueta || 'Sin rango',
        observacion: r.observacion || '-',
        nombreEvaluacion: infoEvaluacion.nombre || 'Resultados'
      };
    });
  }

  // =========================================================================
  // MÉTODOS PRIVADOS DE ENRIQUECIMIENTO EN LOTE (EVITA EL PROBLEMA N+1)
  // =========================================================================
  private async enriquecerResultadosEnLote(
    resultados: ResultadoBase[]
  ): Promise<ResultadoConDetalle[]> {
    if (resultados.length === 0) return [];

    const sesionIds = [...new Set(resultados.map((r) => r.sesion_id))];
    const estudianteIds = [...new Set(resultados.map((r) => r.estudiante_id))];

    // 1 y 2. Sesiones (con su tipo de evaluación) y perfiles de los estudiantes, en paralelo
    const [
      { data: sesionesData, error: sesionesError },
      { data: perfilesData, error: perfilesError }
    ] = await Promise.all([
      this.supabase
        .from('aca_evaluaciones_sesiones')
        .select(`
          id,
          fecha,
          tipo_evaluacion_id,
          tipo_evaluacion:aca_tipo_evaluacion ( nombre, unidad_medida, descripcion )
        `)
        .in('id', sesionIds),
      this.supabase
        .from('usu_perfiles')
        .select('id_usuario, fecha_nacimiento, genero')
        .in('id_usuario', estudianteIds)
    ]);

    if (sesionesError) throw new Error(`No se pudieron cargar las sesiones: ${sesionesError.message}`);
    if (perfilesError) throw new Error(`No se pudieron cargar los perfiles: ${perfilesError.message}`);

    const mapaSesiones = new Map<string, any>(
      (sesionesData ?? []).map((s: any) => [s.id, s])
    );

    const mapaPerfiles = new Map<string, { fecha_nacimiento: string | null; genero: string | null }>(
      (perfilesData ?? []).map((p: any) => [p.id_usuario, p])
    );

    // 3. Traer todos los rangos de los tipos de evaluación presentes
    const tipoIds = [
      ...new Set(
        (sesionesData ?? [])
          .map((s: any) => s.tipo_evaluacion_id)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    ];

    let listaRangos: RangoEvaluacion[] = [];
    if (tipoIds.length > 0) {
      const { data: rangosData } = await this.supabase
        .from('aca_evaluacion_rangos')
        .select('*')
        .in('tipo_evaluacion_id', tipoIds);

      listaRangos = (rangosData ?? []) as RangoEvaluacion[];
    }

    // 4. Cruzar todo en memoria
    return resultados.map((resultado) => {
      const sesion = mapaSesiones.get(resultado.sesion_id);
      const tipoEvalRaw = sesion?.tipo_evaluacion;
      const tipoEvaluacion = Array.isArray(tipoEvalRaw) ? tipoEvalRaw[0] : tipoEvalRaw;
      const perfil = mapaPerfiles.get(resultado.estudiante_id);

      let edadEvaluacion: number | null = null;
      let rango: { nombreEtiqueta: string; colorSugerido: string | null } | null = null;

      // Edad que tenía el alumno el día de la sesión (no la de hoy), así el rango no
      // cambia cuando cumple años después.
      edadEvaluacion = calcularEdad(perfil?.fecha_nacimiento, sesion?.fecha || undefined);

      if (edadEvaluacion !== null) {
        if (perfil?.genero && sesion?.tipo_evaluacion_id) {
          const rangoEncontrado = listaRangos.find(
            (rg) =>
              rg.tipo_evaluacion_id === sesion.tipo_evaluacion_id &&
              rg.genero === perfil!.genero &&
              rg.edad_min <= edadEvaluacion! &&
              rg.edad_max >= edadEvaluacion! &&
              Number(rg.valor_min) <= Number(resultado.valor_numerico) &&
              Number(rg.valor_max) >= Number(resultado.valor_numerico)
          );

          if (rangoEncontrado) {
            rango = {
              nombreEtiqueta: rangoEncontrado.nombre_etiqueta,
              colorSugerido: rangoEncontrado.color_sugerido
            };
          }
        }
      }

      return {
        ...resultado,
        rango,
        edadEvaluacion,
        evaluacion: {
          nombre: tipoEvaluacion?.nombre ?? 'Desconocido',
          unidadMedida: tipoEvaluacion?.unidad_medida ?? '',
          descripcion: tipoEvaluacion?.descripcion ?? null,
          fecha: sesion?.fecha ?? ''
        }
      };
    });
  }
}