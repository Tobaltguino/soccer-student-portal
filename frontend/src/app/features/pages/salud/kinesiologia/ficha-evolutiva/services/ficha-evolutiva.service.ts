import { Injectable, inject } from '@angular/core';
import { SupabaseService } from '../../../../../../core/supabase/supabase';
import {
  FichaEvolutiva,
  CrearFichaPayload,
  ActualizarFichaPayload
} from '../models/ficha-evolutiva.interface';

@Injectable({
  providedIn: 'root'
})
export class FichaEvolutivaService {
  private supabase = inject(SupabaseService).client;

  /**
   * Crea una nueva ficha evolutiva.
   * Usa el kinesiólogo elegido en el formulario (admin) o, si no viene, el usuario autenticado.
   * RLS solo deja a un kinesiólogo crear fichas a su nombre.
   */
  async crearFicha(payload: CrearFichaPayload): Promise<FichaEvolutiva> {
    const { data: sessionData } = await this.supabase.auth.getSession();
    const kinesiologoId = payload.kinesiologoId ?? sessionData?.session?.user?.id;

    if (!kinesiologoId) throw new Error('Debes iniciar sesión para crear una ficha');

    const { data, error } = await this.supabase
      .from('kine_fichas_evolutivas')
      .insert({
        estudiante_id: payload.estudianteId,
        kinesiologo_id: kinesiologoId,
        fecha_evaluacion: payload.fechaEvaluacion,
        antecedentes_personales: payload.antecedentesPersonales ?? null,
        antecedentes_remotos: payload.antecedentesRemotos ?? null,
        diagnostico_medico: payload.diagnosticoMedico ?? null,
        inspeccion_estatica: payload.inspeccionEstatica ?? null,
        inspeccion_dinamica: payload.inspeccionDinamica ?? null,
        rango_movimiento: payload.rangoMovimiento ?? null,
        fuerza_movimientos: payload.fuerzaMovimientos ?? null,
        postura: payload.postura ?? null,
        sensibilidad: payload.sensibilidad ?? null,
        marcha: payload.marcha ?? null,
        coordinacion: payload.coordinacion ?? null,
        balance_romberg: payload.balanceRomberg ?? null,
        observacion: payload.observacion ?? null,
        no_evaluable: payload.noEvaluable ?? null,
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo crear la ficha evolutiva: ${error?.message || 'El estudiante no existe'}`);
    }

    return data as FichaEvolutiva;
  }

  /**
   * Lista el historial de fichas del estudiante autenticado.
   */
  async listarMisFichas(): Promise<FichaEvolutiva[]> {
    const { data: authData } = await this.supabase.auth.getSession();
    const estudianteId = authData?.session?.user?.id;

    if (!estudianteId) throw new Error('Usuario no autenticado');

    return this.listarFichasPorEstudiante(estudianteId);
  }

  /**
   * Lista el historial de fichas de un estudiante e incluye el nombre del evaluador en una sola consulta.
   */
  async listarFichasPorEstudiante(estudianteId: string): Promise<FichaEvolutiva[]> {
    const { data, error } = await this.supabase
      .from('kine_fichas_evolutivas')
      .select(`
        *,
        kinesiologo:usu_perfiles!kinesiologo_id ( nombre, apellido )
      `)
      .eq('estudiante_id', estudianteId)
      .is('eliminado_at', null)
      .order('fecha_evaluacion', { ascending: false });

    if (error) {
      throw new Error(`No se pudo listar las fichas: ${error.message}`);
    }

    return (data ?? []).map((row: any) => ({
      ...row,
      kinesiologo: Array.isArray(row.kinesiologo) ? row.kinesiologo[0] : row.kinesiologo
    }));
  }

  /**
   * Obtiene el detalle completo de una ficha específica.
   */
  async obtenerFichaPorId(id: string): Promise<FichaEvolutiva> {
    const { data, error } = await this.supabase
      .from('kine_fichas_evolutivas')
      .select(`
        *,
        kinesiologo:usu_perfiles!kinesiologo_id ( nombre, apellido )
      `)
      .eq('id', id)
      .is('eliminado_at', null)
      .single();

    if (error || !data) {
      throw new Error('Ficha no encontrada');
    }

    return {
      ...data,
      kinesiologo: Array.isArray(data.kinesiologo) ? data.kinesiologo[0] : data.kinesiologo
    } as FichaEvolutiva;
  }

  /**
   * Actualiza los campos JSONB y estructurados de una ficha existente.
   */
  async actualizarFicha(id: string, payload: ActualizarFichaPayload): Promise<FichaEvolutiva> {
    const updateData: Record<string, any> = {};

    if (payload.kinesiologoId !== undefined) updateData['kinesiologo_id'] = payload.kinesiologoId;
    if (payload.fechaEvaluacion !== undefined) updateData['fecha_evaluacion'] = payload.fechaEvaluacion;
    if (payload.antecedentesPersonales !== undefined) updateData['antecedentes_personales'] = payload.antecedentesPersonales;
    if (payload.antecedentesRemotos !== undefined) updateData['antecedentes_remotos'] = payload.antecedentesRemotos;
    if (payload.diagnosticoMedico !== undefined) updateData['diagnostico_medico'] = payload.diagnosticoMedico;
    if (payload.inspeccionEstatica !== undefined) updateData['inspeccion_estatica'] = payload.inspeccionEstatica;
    if (payload.inspeccionDinamica !== undefined) updateData['inspeccion_dinamica'] = payload.inspeccionDinamica;
    if (payload.rangoMovimiento !== undefined) updateData['rango_movimiento'] = payload.rangoMovimiento;
    if (payload.fuerzaMovimientos !== undefined) updateData['fuerza_movimientos'] = payload.fuerzaMovimientos;
    if (payload.postura !== undefined) updateData['postura'] = payload.postura;
    if (payload.sensibilidad !== undefined) updateData['sensibilidad'] = payload.sensibilidad;
    if (payload.marcha !== undefined) updateData['marcha'] = payload.marcha;
    if (payload.coordinacion !== undefined) updateData['coordinacion'] = payload.coordinacion;
    if (payload.balanceRomberg !== undefined) updateData['balance_romberg'] = payload.balanceRomberg;
    if (payload.observacion !== undefined) updateData['observacion'] = payload.observacion;
    if (payload.noEvaluable !== undefined) updateData['no_evaluable'] = payload.noEvaluable;

    const { data, error } = await this.supabase
      .from('kine_fichas_evolutivas')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo actualizar la ficha: ${error?.message || 'Ficha no encontrada'}`);
    }

    return data as FichaEvolutiva;
  }

  /**
   * Elimina lógicamente (soft-delete) una ficha.
   */
  async eliminarFicha(id: string): Promise<FichaEvolutiva> {
    const { data, error } = await this.supabase
      .from('kine_fichas_evolutivas')
      .update({ eliminado_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo eliminar la ficha: ${error?.message || 'Ficha no encontrada'}`);
    }

    return data as FichaEvolutiva;
  }

  /**
   * Restaura una ficha eliminada previamente.
   */
  async restaurarFicha(id: string): Promise<FichaEvolutiva> {
    const { data, error } = await this.supabase
      .from('kine_fichas_evolutivas')
      .update({ eliminado_at: null })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new Error(`No se pudo restaurar la ficha: ${error?.message || 'Ficha no encontrada'}`);
    }

    return data as FichaEvolutiva;
  }
}