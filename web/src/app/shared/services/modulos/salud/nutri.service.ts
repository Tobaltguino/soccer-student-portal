import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service'; 

@Injectable({
  providedIn: 'root'
})
export class NutricionService {

  constructor(private supabaseCore: SupabaseCoreService) {}

  private get supabase() {
    return this.supabaseCore.client;
  }

  // --- Nutricionistas ---
  async getNutricionistas() { return await this.supabase.from('nutricionistas').select('id, nombre, apellido').order('nombre', { ascending: true }); }
  async getNutricionistasCompletos() { return await this.supabase.from('nutricionistas').select('*').order('apellido', { ascending: true }); }
  async getNutriByEmail(email: string) { return await this.supabase.from('nutricionistas').select('id').eq('email', email).maybeSingle(); }

  // --- Tipos de Evaluación ---
  async getTiposEvaluacionNutri() { return await this.supabase.from('tipo_evaluacion_nutri').select('*'); }
  async crearTipoEvaluacionNutri(tipo: { nombre: string, descripcion: string }) { return await this.supabase.from('tipo_evaluacion_nutri').insert(tipo).select().single(); }
  async eliminarTipoEvaluacionNutri(id: string) { return await this.supabase.from('tipo_evaluacion_nutri').delete().eq('id', id); }

  // --- Sesiones de Evaluación ---
  async getEvaluacionesNutri() { return await this.supabase.from('evaluacion_nutri').select('*, tipo_evaluacion:tipo_evaluacion_nutri(nombre)').order('fecha', { ascending: false }); }
  async crearEvaluacionNutri(evaluacion: any) { return await this.supabase.from('evaluacion_nutri').insert(evaluacion).select().single(); }
  async actualizarEvaluacionNutri(id: string, evaluacion: any) { return await this.supabase.from('evaluacion_nutri').update(evaluacion).eq('id', id).select().single(); }
  async eliminarEvaluacionNutri(id: string) { return await this.supabase.from('evaluacion_nutri').delete().eq('id', id); }
  
  async getUltimaEvaluacionNutriFinalizada() {
    return await this.supabase.from('evaluacion_nutri')
      .select('id, fecha, tipo_evaluacion_nutri(nombre)')
      .eq('estado', 'FINALIZADO').order('fecha', { ascending: false }).limit(1).maybeSingle();
  }

  // --- Resultados Nutricionales ---
  async getResultadosPorSesionNutri(sesionId: string) { return await this.supabase.from('evaluacion_resultado_nutri').select('*').eq('evaluacion_id', sesionId); }
  
  async getResultadosNutriEstudiante(estudianteId: string) {
    return await this.supabase.from('evaluacion_resultado_nutri')
      .select('archivo_url, observaciones, evaluacion:evaluacion_nutri ( id, fecha, estado, tipo_evaluacion:tipo_evaluacion_nutri (nombre) )')
      .eq('estudiante_id', estudianteId);
  }

  async guardarResultadoNutri(resultado: any) {
    return await this.supabase.from('evaluacion_resultado_nutri').upsert(resultado, { onConflict: 'evaluacion_id,estudiante_id' }); 
  }
}