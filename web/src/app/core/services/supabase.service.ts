import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  
  public supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  // --- AUTENTICACIÓN ---
  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async logout() {
    return await this.supabase.auth.signOut();
  }

  async getUser() {
    return await this.supabase.auth.getUser();
  }

  async esAdmin(uid: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('admins')
      .select('id')
      .eq('id', uid)
      .single();
    return !(error || !data);
  }

  async resetPassword(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password' 
    });
  }

  // --- AdminDashboard

  // En supabase.service.ts

/** Obtiene el conteo total de estudiantes */
async getTotalEstudiantes() {
  return await this.supabase
    .from('estudiantes')
    .select('*', { count: 'exact', head: true });
}

/** Obtiene las clases programadas para el día de hoy */
async getClasesHoy() {
  const hoy = new Date().toISOString().split('T')[0];
  return await this.supabase
    .from('clases')
    .select('*, grupos(nombre)')
    .eq('fecha', hoy)
    .order('hora', { ascending: true });
}

/** Obtiene las últimas evaluaciones realizadas */
async getActividadReciente() {
  return await this.supabase
    .from('evaluaciones_sesiones')
    .select('*, grupos(nombre), tipo_evaluacion(nombre)')
    .order('created_at', { ascending: false })
    .limit(5);
}

  // --- GESTIÓN DE USUARIOS (GETTERS CON RELACIONES) ---

  // 1. Estudiantes: Traemos también el nombre del grupo
  async getEstudiantes() { 
    return await this.supabase
      .from('estudiantes')
      .select('*, grupos(nombre)') // 👈 JOIN con Grupos
      .order('apellido'); 
  }

  // 2. Profesores: Traemos la lista anidada de grupos
  async getProfesores() { 
    return await this.supabase
      .from('profesores')
      .select(`
        *,
        grupos_profesores (
          grupo_id,
          grupos ( id, nombre )
        )
      `) // 👈 JOIN Complejo (Tabla intermedia)
      .order('apellido'); 
  }

  async getAdmins() { return await this.supabase.from('admins').select('*').order('apellido'); }
  async getKinesiologos() { return await this.supabase.from('kinesiologos').select('*').order('apellido'); }
  async getNutricionistas() { return await this.supabase.from('nutricionistas').select('*').order('apellido'); }

  // Eliminar Genérico
  async deleteUsuario(tabla: string, id: any) {
    return await this.supabase.from(tabla).delete().eq('id', id);
  }

  // --- CREAR USUARIO (Auth + DB) ---
  // Corregido para devolver estructura consistente { data, error }
  async crearUsuarioCompleto(email: string, password: string, datosPersonales: any, tabla: string) {
    // Cliente temporal para no cerrar sesión del admin actual
    const tempSupabase = createClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Crear en Auth
    const { data: authData, error: authError } = await tempSupabase.auth.signUp({
      email: email,
      password: password
    });

    if (authError) return { data: null, error: authError };
    if (!authData.user) return { data: null, error: { message: 'Error creando usuario Auth' } };

    // 2. Crear en Base de Datos (Tabla específica)
    const { data: dbData, error: dbError } = await this.supabase
      .from(tabla)
      .insert({
        id: authData.user.id, // Vinculamos el ID
        email: email,
        ...datosPersonales
      })
      .select()
      .single();

    if (dbError) {
      return { data: null, error: dbError };
    }

    // Retornamos todo junto
    return { data: { user: authData.user, perfil: dbData }, error: null };
  }

  // --- EDITAR MAESTRO (RPC) ---
  async adminUpdateUsuario(tabla: string, id: string, email: string, datos: any) {
    const { error } = await this.supabase.rpc('admin_actualizar_usuario', {
      id_usuario: id,
      nuevo_email: email,
      tabla_nombre: tabla,
      nuevos_datos: datos
    });
    return { error };
  }

  // --- GESTIÓN DE GRUPOS (CRUD Básico) ---

  async getGrupos() {
    return await this.supabase
      .from('grupos')
      .select('*, estudiantes(count)') 
      .order('nombre', { ascending: true });
  }

  async createGrupo(datos: any) {
    return await this.supabase.from('grupos').insert(datos);
  }

  async updateGrupo(id: number, datos: any) {
    return await this.supabase.from('grupos').update(datos).eq('id', id);
  }

  async deleteGrupo(id: number) {
    return await this.supabase.from('grupos').delete().eq('id', id);
  }

  // --- GESTIÓN DE RELACIONES (PROFESOR <-> GRUPOS) ---
  // ✅ ESTA ES LA FUNCIÓN NUEVA QUE FALTABA
  async actualizarGruposProfesor(profesorId: string, gruposIds: any[]) {
    // 1. Borrar asignaciones viejas
    const { error: deleteError } = await this.supabase
      .from('grupos_profesores')
      .delete()
      .eq('profesor_id', profesorId);

    if (deleteError) {
      console.error('Error limpiando grupos antiguos:', deleteError);
      return { error: deleteError };
    }

    // 2. Si hay nuevos grupos, insertarlos
    if (gruposIds && gruposIds.length > 0) {
      const inserts = gruposIds.map(gid => ({
        profesor_id: profesorId,
        grupo_id: gid
      }));
      
      return await this.supabase
        .from('grupos_profesores')
        .insert(inserts);
    }
    
    return { data: true, error: null };
  }

  // ==========================================
  //      MÓDULO DE CLASES (ENTRENAMIENTOS)
  // ==========================================

  async getClases() {
    return await this.supabase
      .from('clases')
      .select('*, grupos(nombre), profesores(nombre, apellido)')
      .order('fecha', { ascending: false })
      .order('hora', { ascending: true });
  }

  async createClase(datos: any) {
    // Añadimos .select() para confirmar la creación y obtener el objeto creado
    return await this.supabase
      .from('clases')
      .insert(datos)
      .select();
  }

  async updateClase(id: number, datos: any) {
    return await this.supabase
      .from('clases')
      .update(datos)
      .eq('id', id)
      .select();
  }

  async deleteClase(id: number) {
    return await this.supabase
      .from('clases')
      .delete()
      .eq('id', id);
  }

  // ==========================================
  //      MÓDULO DE ASISTENCIA Y ALUMNOS
  // ==========================================

  async getAlumnosPorGrupo(grupoId: number) {
  return await this.supabase
    .from('estudiantes') // ✅ Nombre corregido
    .select('id, nombre, apellido, grupo_id')
    .eq('grupo_id', grupoId)
    .order('apellido', { ascending: true });
}

async saveAsistencia(registros: any[]) {
  return await this.supabase
    .from('asistencias')
    .upsert(registros, { onConflict: 'clase_id, alumno_id' });
}

  async getAsistenciaPorClase(claseId: number) {
    return await this.supabase
      .from('asistencias')
      .select('alumno_id, estado')
      .eq('clase_id', claseId);
  }

  // ==========================================
  //      MÓDULO DE EVALUACIONES (RELACIONAL)
  // ==========================================

  /** Obtiene los tipos de evaluación configurados (Velocidad, Salto, etc.) */
  async getTiposEvaluacion() {
    return await this.supabase
      .from('tipo_evaluacion')
      .select('*')
      .order('nombre', { ascending: true });
  }

  async getSesionesEvaluacion() {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .select(`
        *,
        grupos ( nombre ),
        tipo_evaluacion ( nombre, unidad_medida ) 
      `) // <--- CAMBIO: Solo pedimos nombre y unidad. Quitamos el (*)
      .order('fecha', { ascending: false });
  }

  /** NUEVA: Crea la cabecera de la sesión (Planificación) */
  async crearSesionEvaluacion(datos: any) {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .insert(datos)
      .select()
      .single();
  }

  // ✅ AGREGA ESTA FUNCIÓN NUEVA:
  async updateSesionEvaluacion(id: string, datos: any) {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .update(datos)
      .eq('id', id)
      .select();
  }

  /** NUEVA: Obtiene los resultados específicos de una sesión */
  async getResultadosPorSesion(sesionId: string) {
    return await this.supabase
      .from('evaluaciones_resultados')
      .select('*')
      .eq('sesion_id', sesionId);
  }

  /** ACTUALIZADA: Guarda o actualiza notas vinculadas a una sesion_id */
  async guardarResultadosMasivos(resultados: any[]) {
    return await this.supabase
      .from('evaluaciones_resultados')
      .upsert(resultados); // <--- CAMBIO: Quitamos opciones extra para evitar errores de sintaxis SQL si no existe el constraint
  }

  /** ACTUALIZADA: Elimina una sesión completa (por cascada borrará sus resultados) */
  async eliminarSesionEvaluacion(id: string) {
    return await this.supabase
      .from('evaluaciones_sesiones')
      .delete()
      .eq('id', id);
  }

  /** Guarda un nuevo tipo de test técnico */
  async createTipoEvaluacion(dato: any) {
    return await this.supabase
      .from('tipo_evaluacion')
      .insert(dato);
  }

  async eliminarTipoEvaluacion(id: number) {
  return await this.supabase
    .from('tipo_evaluacion')
    .delete()
    .eq('id', id);
}
}