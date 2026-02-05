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
}