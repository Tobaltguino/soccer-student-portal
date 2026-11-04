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
        balance_romberg: this.aNumero(payload.balanceRomberg),
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
   * Lista el historial de fichas de un estudiante con el nombre del evaluador.
   */
  async listarFichasPorEstudiante(estudianteId: string): Promise<FichaEvolutiva[]> {
    const { data, error } = await this.supabase
      .from('kine_fichas_evolutivas')
      .select('*')
      .eq('estudiante_id', estudianteId)
      .is('eliminado_at', null)
      .order('fecha_evaluacion', { ascending: false });

    if (error) {
      throw new Error(`No se pudo listar las fichas: ${error.message}`);
    }

    return this.agregarNombreKinesiologo((data ?? []) as FichaEvolutiva[]);
  }

  /**
   * Obtiene el detalle completo de una ficha específica.
   */
  async obtenerFichaPorId(id: string): Promise<FichaEvolutiva> {
    const { data, error } = await this.supabase
      .from('kine_fichas_evolutivas')
      .select('*')
      .eq('id', id)
      .is('eliminado_at', null)
      .single();

    if (error || !data) {
      throw new Error('Ficha no encontrada');
    }

    const [ficha] = await this.agregarNombreKinesiologo([data as FichaEvolutiva]);
    return ficha;
  }

  /**
   * Agrega nombre y apellido del kinesiólogo con una sola consulta a usu_perfiles.
   * (kinesiologo_id apunta a usu_kinesiologos, no a usu_perfiles, así que no se
   * puede pedir como relación anidada: Supabase respondía 400.)
   */
  private async agregarNombreKinesiologo(fichas: FichaEvolutiva[]): Promise<FichaEvolutiva[]> {
    const ids = [...new Set(fichas.map(f => f.kinesiologo_id).filter(Boolean))];
    if (ids.length === 0) return fichas;

    const { data: perfiles } = await this.supabase
      .from('usu_perfiles')
      .select('id_usuario, nombre, apellido')
      .in('id_usuario', ids);

    const porId = new Map((perfiles ?? []).map((p: any) => [p.id_usuario, { nombre: p.nombre, apellido: p.apellido }]));
    return fichas.map(f => ({ ...f, kinesiologo: porId.get(f.kinesiologo_id) ?? null }));
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
    if (payload.balanceRomberg !== undefined) updateData['balance_romberg'] = this.aNumero(payload.balanceRomberg);
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

  /** Campo numérico del formulario: vacío ('' o null) -> null; si no, número. */
  private aNumero(valor: unknown): number | null {
    if (valor === '' || valor === null || valor === undefined) return null;
    const n = Number(valor);
    return Number.isFinite(n) ? n : null;
  }
}
