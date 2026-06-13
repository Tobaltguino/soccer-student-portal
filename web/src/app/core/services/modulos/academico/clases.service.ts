import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service'; 

@Injectable({ providedIn: 'root' })
export class ClasesService {
  constructor(private supabaseCore: SupabaseCoreService) {}
  private get supabase() { return this.supabaseCore.client; }

  async getClasesHoy() {
    const hoy = new Date().toISOString().split('T')[0];
    return await this.supabase
      .from('clases')
      .select('*, grupos(nombre)')
      .eq('fecha', hoy)
      .order('hora', { ascending: true });
  }

  async getClases() { return await this.supabase.from('clases').select('*, grupos (id, nombre)').order('fecha', { ascending: false }).order('hora', { ascending: true }); }
  async getClasesPorGrupo(grupoId: number | string) { return await this.supabase.from('clases').select('*').eq('grupo_id', grupoId).order('fecha', { ascending: false }).order('hora', { ascending: false }); }
  
  async getClasesPorGrupos(grupoIds: (number | string)[], fechaInicio: string) {
    return await this.supabase
      .from('clases')
      .select('*, grupos(nombre)')
      .in('grupo_id', grupoIds)
      .gte('fecha', fechaInicio)
      .order('fecha', { ascending: true })
      .order('hora', { ascending: true });
  }

  async crearClase(payload: any) { return await this.supabase.from('clases').insert(payload).select(); }
  async actualizarClase(id: number | string, payload: any) { return await this.supabase.from('clases').update(payload).eq('id', id).select(); }
  async deleteClase(id: number) { return await this.supabase.from('clases').delete().eq('id', id); }

  async getClasesAlumno(uid: string, fechaDesde?: string) {
    try {
      const { data: estudiante, error: errEst } = await this.supabase.from('estudiantes').select('grupo_id').eq('id', uid).single();
      if (errEst || !estudiante?.grupo_id) return { data: [], error: errEst };

      let query = this.supabase
        .from('clases')
        .select('*, grupos ( nombre ), asistencias!left ( presente )')
        .eq('grupo_id', estudiante.grupo_id)
        .eq('asistencias.estudiante_id', uid); 

      if (fechaDesde) query = query.gte('fecha', fechaDesde);

      const { data, error } = await query.order('fecha', { ascending: false });
      if (error) throw error;

      const clasesFormateadas = data?.map(clase => ({
        ...clase,
        presente: clase.asistencias && clase.asistencias.length > 0 ? clase.asistencias[0].presente : null
      }));

      return { data: clasesFormateadas, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }
}