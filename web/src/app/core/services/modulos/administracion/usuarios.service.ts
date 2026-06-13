import { Injectable } from '@angular/core';
import { SupabaseCoreService } from '../../../../core/services/supabase-core.service'; 

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  constructor(private supabaseCore: SupabaseCoreService) {}
  private get supabase() { return this.supabaseCore.client; }

  async getTotalEstudiantes() {
    return await this.supabase.from('estudiantes').select('*', { count: 'exact', head: true });
  }

  async getEstudiantes() { 
    return await this.supabase
      .from('estudiantes')
      .select('*, grupos ( id, nombre ), estudiantes_posiciones ( posicion_id, posiciones ( nombre, orden ) )') 
      .order('apellido', { ascending: true }); 
  }

  async getProfesores() { 
    return await this.supabase
      .from('profesores')
      .select('*, grupos_profesores ( grupo_id, grupos ( id, nombre ) )')
      .order('apellido'); 
  }

  async getEstudiantesBasico() { return await this.supabase.from('estudiantes').select('id, nombre, apellido').order('apellido', { ascending: true }); }
  async getEstudiantesActivos() { return await this.supabase.from('estudiantes').select('id, nombre, apellido, fecha_nacimiento, activo').eq('activo', true); }
  async getEstudianteByEmail(email: string) { return await this.supabase.from('estudiantes').select('id, nombre, apellido, grupo_id').eq('email', email).maybeSingle(); }
  async getProfesorByEmail(email: string) { return await this.supabase.from('profesores').select('id, nombre, apellido').eq('email', email).maybeSingle(); }

  async getGruposDeProfesor(profesorId: string) { return await this.supabase.from('grupos_profesores').select('grupo_id, grupos(id, nombre)').eq('profesor_id', profesorId); }

  async getProfesoresDeEstudiante(uid: string) {
    try {
      const { data: estudiante, error: errEst } = await this.supabase.from('estudiantes').select('grupo_id').eq('id', uid).single();
      if (errEst || !estudiante?.grupo_id) return { data: [], error: null };

      const { data, error } = await this.supabase
        .from('grupos_profesores')
        .select('profesores (id, nombre, apellido, email, tipo_profesor, foto_url)')
        .eq('grupo_id', estudiante.grupo_id);

      if (error) throw error;
      const profesoresLimpios = data?.map((item: any) => item.profesores).filter((p: any) => p !== null) || [];
      return { data: profesoresLimpios, error: null };
    } catch (error) {
      return { data: null, error };
    }
  }

  async getEstudiantesPorEncargado(tablaIntermedia: string, columnaId: string, encargadoId: string) {
    const { data: grupos, error: errGrupos } = await this.supabase.from(tablaIntermedia).select('grupo_id').eq(columnaId, encargadoId);
    if (errGrupos || !grupos || grupos.length === 0) return { data: [], error: errGrupos };

    const gruposIds = grupos.map(g => g.grupo_id);
    return await this.getTodosEstudiantesPorGrupos(gruposIds, true);
  }

  async getAlumnosPorGrupo(grupoId: number) {
    return await this.supabase
      .from('estudiantes')
      .select('id, nombre, apellido, grupo_id, rut, foto_url, fecha_nacimiento') 
      .eq('grupo_id', grupoId);
  }

  async getTodosEstudiantesPorGrupos(grupoIds: number[], soloActivos: boolean = false) {
    let query = this.supabase
      .from('estudiantes')
      .select('*, grupos(nombre), estudiantes_posiciones(posicion_id, posiciones(nombre, orden))') 
      .in('grupo_id', grupoIds)
      .order('apellido', { ascending: true });
      
    if (soloActivos) query = query.eq('activo', true);
    return await query;
  }

  // Agrega esto en tu UsuariosService
  async getAlumnosBasicoConRut() {
    return await this.supabase
      .from('estudiantes')
      .select('id, nombre, apellido, rut, grupo_id')
      .order('apellido', { ascending: true });
  }

  // ==========================================
  // POSICIONES Y ASIGNACIONES
  // ==========================================
  
  async getPosiciones() {
    return await this.supabase
      .from('posiciones')
      .select('*')
      .order('id', { ascending: true });
  }

  async actualizarPosicionesEstudiante(estudianteId: string, posicionesIds: number[]) {
    // Primero limpiamos las posiciones anteriores
    await this.supabase.from('estudiantes_posiciones').delete().eq('estudiante_id', estudianteId);
    
    // Luego insertamos las nuevas si existen
    if (posicionesIds && posicionesIds.length > 0) {
      const inserts = posicionesIds.map(pId => ({ estudiante_id: estudianteId, posicion_id: pId }));
      return await this.supabase.from('estudiantes_posiciones').insert(inserts);
    }
    return { error: null };
  }

  async actualizarGruposProfesor(profesorId: string, gruposIds: number[]) {
    // Primero limpiamos los grupos anteriores
    await this.supabase.from('grupos_profesores').delete().eq('profesor_id', profesorId);
    
    // Luego insertamos los nuevos si existen
    if (gruposIds && gruposIds.length > 0) {
      const inserts = gruposIds.map(gId => ({ profesor_id: profesorId, grupo_id: gId }));
      return await this.supabase.from('grupos_profesores').insert(inserts);
    }
    return { error: null };
  }
}