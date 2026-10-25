import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import { AuthService } from '../../../../../../core/auth/services/auth.service';
import {
  KineResultado,
  KineResultadoConDetalle,
  CrearKineResultadoPayload,
  ActualizarKineResultadoPayload
} from '../models/resultado.interface';
import { CriterioPrioridad } from '../models/subevaluacion.interface';

@Injectable({
  providedIn: 'root'
})
export class KineResultadoService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  /**
   * Registra un nuevo resultado validando la consistencia de lados y grupos.
   */
  async crearResultado(payload: CrearKineResultadoPayload): Promise<KineResultadoConDetalle> {
    const { gruposPermitidos } = await this.obtenerDatosYGruposPermitidos();
    const sesion = await this.validarAccesoSesion(payload.sesionId, gruposPermitidos);

    // Validar que el estudiante pertenezca al grupo de la sesión
    const { data: estudiante } = await this.supabase
      .from('usu_estudiantes')
      .select('grupo_id')
      .eq('id_usuario', payload.estudianteId)
      .single();

    if (estudiante?.grupo_id !== sesion.grupo_id) {
      throw new Error('El estudiante indicado no pertenece al grupo de esta sesión');
    }

    // Validar que los resultados calzan con si la subevaluación mide lados
    const { data: subevaluacion } = await this.supabase
      .from('kine_subevaluaciones')
      .select('evalua_lados')
      .eq('id', payload.subevaluacionId)
      .single();

    if (subevaluacion?.evalua_lados) {
      if (!payload.resultadoIzquierdo || !payload.resultadoDerecho) {
        throw new Error('Esta subevaluación requiere resultado izquierdo y derecho');
      }
    } else {
      if (!payload.resultadoUnico) {
        throw new Error('Esta subevaluación requiere un resultado único');
      }
    }

    const { data, error } = await this.supabase
      .from('kine_evaluaciones_resultados')
      .insert({
        sesion_id: payload.sesionId,
        estudiante_id: payload.estudianteId,
        subevaluacion_id: payload.subevaluacionId,
        resultado_unico: payload.resultadoUnico ?? null,
        resultado_izquierdo: payload.resultadoIzquierdo ?? null,
        resultado_derecho: payload.resultadoDerecho ?? null,
        observacion: payload.observacion ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear el resultado: ${error?.message || 'Error desconocido'}`);
    }

    const enriquecidos = await this.enriquecerResultadosEnLote([data as KineResultado]);
    return enriquecidos[0];
  }

  /**
   * Lista todos los resultados asociados a una sesión, enriquecidos con datos del alumno y rangos.
   */
  async listarResultadosPorSesion(sesionId: string): Promise<KineResultadoConDetalle[]> {
    const { gruposPermitidos } = await this.obtenerDatosYGruposPermitidos();
    await this.validarAccesoSesion(sesionId, gruposPermitidos);

    const { data, error } = await this.supabase
      .from('kine_evaluaciones_resultados')
      .select('*')
      .eq('sesion_id', sesionId);

    if (error) {
      throw new Error(`No se pudo listar los resultados: ${error.message}`);
    }

    return this.enriquecerResultadosEnLote((data ?? []) as KineResultado[]);
  }

  /**
   * Lista los resultados del estudiante autenticado (solo de sesiones FINALIZADAS).
   */
  async listarMisResultados(): Promise<KineResultadoConDetalle[]> {
    const { data: authData } = await this.supabase.auth.getSession();
    const estudianteId = authData?.session?.user?.id;

    if (!estudianteId) throw new Error('Debes iniciar sesión');

    const { data, error } = await this.supabase
      .from('kine_evaluaciones_resultados')
      .select('*, sesion:kine_evaluaciones_sesiones!inner(estado)')
      .eq('estudiante_id', estudianteId)
      .eq('sesion.estado', 'FINALIZADA')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`No se pudo listar tus resultados: ${error.message}`);
    }

    const resultadosLimpios = (data ?? []).map(({ sesion, ...resto }: any) => resto) as KineResultado[];
    return this.enriquecerResultadosEnLote(resultadosLimpios);
  }

  /**
   * Actualiza el valor numérico, los lados u observación de un resultado.
   */
  async actualizarResultado(id: number, payload: ActualizarKineResultadoPayload): Promise<KineResultadoConDetalle> {
    const { gruposPermitidos } = await this.obtenerDatosYGruposPermitidos();
    
    const actual = await this.obtenerPorIdBase(id);
    await this.validarAccesoSesion(actual.sesion_id, gruposPermitidos);

    const updateData: Record<string, any> = {};
    if (payload.resultadoUnico !== undefined) updateData['resultado_unico'] = payload.resultadoUnico;
    if (payload.resultadoIzquierdo !== undefined) updateData['resultado_izquierdo'] = payload.resultadoIzquierdo;
    if (payload.resultadoDerecho !== undefined) updateData['resultado_derecho'] = payload.resultadoDerecho;
    if (payload.observacion !== undefined) updateData['observacion'] = payload.observacion;

    const { data, error } = await this.supabase
      .from('kine_evaluaciones_resultados')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar el resultado: ${error?.message || 'Error desconocido'}`);
    }

    const enriquecidos = await this.enriquecerResultadosEnLote([data as KineResultado]);
    return enriquecidos[0];
  }

  /**
   * Elimina permanentemente un resultado.
   */
  async eliminarResultado(id: number): Promise<void> {
    const { gruposPermitidos } = await this.obtenerDatosYGruposPermitidos();
    
    const actual = await this.obtenerPorIdBase(id);
    await this.validarAccesoSesion(actual.sesion_id, gruposPermitidos);

    const { error } = await this.supabase
      .from('kine_evaluaciones_resultados')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`No se pudo eliminar el resultado: ${error.message}`);
    }
  }

  // =========================================================================
  // MÉTODOS PRIVADOS PARA ENRIQUECIMIENTO Y CÁLCULO
  // =========================================================================

  private async obtenerPorIdBase(id: number): Promise<KineResultado> {
    const { data, error } = await this.supabase
      .from('kine_evaluaciones_resultados')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) throw new Error('Resultado no encontrado');
    return data as KineResultado;
  }

  private async validarAccesoSesion(sesionId: string, gruposPermitidos: number[] | null): Promise<any> {
    const { data, error } = await this.supabase
      .from('kine_evaluaciones_sesiones')
      .select('*')
      .eq('id', sesionId)
      .single();

    if (error || !data) throw new Error('La sesión no existe');
    if (gruposPermitidos !== null && !gruposPermitidos.includes(data.grupo_id)) {
      throw new Error('No tienes acceso a los resultados de esta sesión');
    }
    return data;
  }

  /**
   * Enriquecimiento en LOTE (Batch). Evita N+1 queries al renderizar tablas grandes de resultados.
   */
  private async enriquecerResultadosEnLote(resultados: KineResultado[]): Promise<KineResultadoConDetalle[]> {
    if (resultados.length === 0) return [];

    const subevaluacionIds = [...new Set(resultados.map(r => r.subevaluacion_id))];
    const estudianteIds = [...new Set(resultados.map(r => r.estudiante_id))];

    // 1. Traer Subevaluaciones y Alumnos en paralelo
    const [subData, alumData, rangosData] = await Promise.all([
      this.supabase.from('kine_subevaluaciones').select('id, nombre, evalua_lados, prioridad').in('id', subevaluacionIds),
      this.supabase.from('usu_perfiles').select('id_usuario, nombre, apellido, rut').in('id_usuario', estudianteIds),
      this.supabase.from('kine_evaluacion_rangos').select('subevaluacion_id, puntaje, etiqueta, color').in('subevaluacion_id', subevaluacionIds)
    ]);

    const mapSubevaluaciones = new Map((subData.data ?? []).map((s: any) => [s.id, s]));
    const mapAlumnos = new Map((alumData.data ?? []).map((a: any) => [a.id_usuario, a]));
    const rangos = rangosData.data ?? [];

    // 2. Mapear resultados
    return resultados.map(resultado => {
      const sub = mapSubevaluaciones.get(resultado.subevaluacion_id);
      const alumno = mapAlumnos.get(resultado.estudiante_id);
      
      let rangoObj = null;
      if (sub) {
        const puntajeFinal = this.calcularPuntajeParaRango(sub, resultado);
        if (puntajeFinal !== null) {
          const match = rangos.find(r => r.subevaluacion_id === sub.id && r.puntaje === puntajeFinal);
          if (match) {
            rangoObj = { etiqueta: match.etiqueta, color: match.color };
          }
        }
      }

      return {
        ...resultado,
        subevaluacion: {
          nombre: sub?.nombre ?? 'Desconocida',
          evaluaLados: sub?.evalua_lados ?? false,
          prioridad: sub?.prioridad ?? null
        },
        rango: rangoObj,
        alumno: {
          nombre: alumno?.nombre ?? 'Desconocido',
          apellido: alumno?.apellido ?? '',
          rut: alumno?.rut ?? 'Sin RUT'
        }
      };
    });
  }

  /**
   * Determina el puntaje contra el cual se busca el rango (MAYOR o MENOR).
   */
  private calcularPuntajeParaRango(subevaluacion: any, resultado: KineResultado): number | null {
    if (subevaluacion.evalua_lados) {
      const candidatos = [resultado.resultado_izquierdo, resultado.resultado_derecho]
        .map(v => (v !== null ? Number(v) : NaN))
        .filter(v => !Number.isNaN(v));

      if (candidatos.length === 0) return null;
      return subevaluacion.prioridad === 'MAYOR' ? Math.max(...candidatos) : Math.min(...candidatos);
    }

    if (resultado.resultado_unico === null) return null;
    const puntaje = Number(resultado.resultado_unico);
    return Number.isNaN(puntaje) ? null : puntaje;
  }

  // Helper de roles
  private async obtenerDatosYGruposPermitidos(): Promise<{ rol: string; gruposPermitidos: number[] | null }> {
    // Rol y grupos salen de la caché de AuthService (antes: 3 consultas por cada resultado)
    const rol = await this.authService.obtenerRolActual();
    if (rol === 'administrador') return { rol, gruposPermitidos: null };

    return { rol, gruposPermitidos: await this.authService.obtenerGruposStaff() };
  }
}