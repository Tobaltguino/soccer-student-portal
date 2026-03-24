import { Injectable } from '@angular/core';
import { SupabaseCoreService } from './supabase-core.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // 💡 Constante global para no repetir strings (DRY)
  private readonly TABLAS_USUARIOS = ['admins', 'profesores', 'estudiantes', 'kinesiologos', 'nutricionistas'];
  
  // Caché en memoria para no saturar la base de datos buscando el rol
  private rolCache: string | null = null;

  constructor(private supabaseCore: SupabaseCoreService) {}

  public get supabase() {
    return this.supabaseCore.client;
  }

  // ==========================================
  // 1. LOGIN Y SESIÓN BÁSICA
  // ==========================================
  
  async login(email: string, password: string) {
    return await this.supabase.auth.signInWithPassword({ email, password });
  }

  async logout() {
    this.limpiarCacheRol(); 
    localStorage.removeItem('userRole'); 
    return await this.supabase.auth.signOut();
  }

  async getUser() {
    return await this.supabase.auth.getUser();
  }

  limpiarCacheRol() {
    this.rolCache = null;
  }

  // ==========================================
  // 2. AUTENTICACIÓN POR RUT
  // ==========================================

  async loginConRut(rutInput: string, password: string) {
    for (const tabla of this.TABLAS_USUARIOS) {
      const { data: userData } = await this.supabase
        .from(tabla)
        .select('email, activo, acepto_terminos')
        .eq('rut', rutInput.trim())
        .maybeSingle();

      if (userData?.email) {
        if (!userData.activo) {
          return { data: null, error: { message: 'Tu cuenta se encuentra desactivada. Contacta al administrador.' }, role: null, aceptoTerminos: false };
        }

        const authResponse = await this.supabase.auth.signInWithPassword({ 
          email: userData.email, 
          password 
        });

        if (authResponse.error) {
          const mensajeError = authResponse.error.message === 'Invalid login credentials' 
            ? 'Contraseña incorrecta.' 
            : authResponse.error.message;
          return { data: null, error: { message: mensajeError }, role: null, aceptoTerminos: false };
        }

        return { data: authResponse.data, error: null, role: tabla, aceptoTerminos: userData.acepto_terminos };
      }
    }
    
    return { data: null, error: { message: `El RUT ${rutInput} no está registrado en ProFutbol.` }, role: null, aceptoTerminos: false };
  }

  // ==========================================
  // 3. GESTIÓN DE ROLES Y SEGURIDAD
  // ==========================================

  async esAdmin(uid: string): Promise<boolean> {
    const { data, error } = await this.supabase.from('admins').select('id').eq('id', uid).maybeSingle();
    return !(error || !data);
  }
  
  // Devuelve el rol real del usuario buscando directamente en las tablas
  async getRolSeguro(email: string): Promise<string> {
    if (!email) return 'login';

    const roles: Record<string, string> = {
      'admins': 'admin',
      'estudiantes': 'student',
      'profesores': 'professor',
      'kinesiologos': 'kine',
      'nutricionistas': 'nutri'
    };

    for (const tabla of Object.keys(roles)) {
      const { data } = await this.supabase.from(tabla).select('id').eq('email', email).maybeSingle();
      if (data) return roles[tabla];
    }

    return 'login'; 
  }

  // ==========================================
  // 4. RECUPERACIÓN DE CONTRASEÑA Y TÉRMINOS
  // ==========================================

  async resetPassword(email: string) {
    return await this.supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/update-password' 
    });
  }

  async resetPasswordPorRut(rutInput: string) {
    for (const tabla of this.TABLAS_USUARIOS) {
      const { data } = await this.supabase.from(tabla).select('email, activo').eq('rut', rutInput.trim()).maybeSingle();

      if (data?.email) {
        if (!data.activo) return { error: { message: 'Tu cuenta se encuentra desactivada. Contacta al administrador.' } };
        
        return await this.supabase.auth.resetPasswordForEmail(data.email, {
          redirectTo: window.location.origin + '/update-password' 
        });
      }
    }
    return { error: { message: `El RUT ${rutInput} no está registrado en ProFutbol.` } };
  }

  async updatePassword(newPassword: string) {
    return await this.supabase.auth.updateUser({ password: newPassword });
  }

  async registrarFirmaTerminos(tabla: string, userId: string) {
    return await this.supabase.from(tabla).update({
      acepto_terminos: true,
      fecha_aceptacion_terminos: new Date().toISOString()
    }).eq('id', userId);
  }

  // ==========================================
  // 5. GESTIÓN DE USUARIOS (CRUD DEL ADMIN)
  // ==========================================

  async crearUsuarioCompleto(email: string, password: string, datosPersonales: any, tabla: string) {
    const roleMap: Record<string, string> = {
      'estudiantes': 'estudiante', 'profesores': 'profesor', 'admins': 'admin',
      'kinesiologos': 'kinesiologo', 'nutricionistas': 'nutricionista'
    };

    const { data, error } = await this.supabase.functions.invoke('create-user', {
      body: { email, password, datosPersonales, tabla, role: roleMap[tabla] || 'user' }
    });

    if (error) return { data: null, error };
    if (data.error) return { data: null, error: data.error };
    return { data: data.data, error: null };
  }

  async updateUsuario(tabla: string, id: string, datos: any, email: string) {
    // 💡 Clonamos los datos para no mutar el objeto original de la UI
    const datosLimpios = { ...datos };

    if (tabla !== 'estudiantes') {
      delete datosLimpios.fecha_nacimiento;
      delete datosLimpios.grupo_id;
    }

    if (email) datosLimpios.email = email;

    const { error: dbError } = await this.supabase.from(tabla).update(datosLimpios).eq('id', id);
    if (dbError) throw dbError; 

    if (email) {
      const { error: authError } = await this.supabase.rpc('admin_actualizar_email_auth', { usuario_id: id, nuevo_email: email });
      if (authError) throw new Error("Se actualizaron los datos, pero el sistema bloqueó el cambio de correo.");
    }
    return { error: null };
  }

  async deleteUsuario(tabla: string, id: string) {
    return await this.supabase.rpc('admin_eliminar_usuario', { id_usuario: id, tabla_nombre: tabla });
  }

  async getAdmins() {
    return await this.supabase.from('admins').select('*').order('apellido', { ascending: true });
  }

  // ==========================================
  // 6. PERFIL DE USUARIO GLOBAL
  // ==========================================
  
  async getPerfilCompleto(email: string, rolGuardado: string | null) {
    const roleMap: Record<string, { tabla: string, display: string }> = {
      'admin': { tabla: 'admins', display: 'Administrador' },
      'profesor': { tabla: 'profesores', display: 'Profesor' },
      'estudiante': { tabla: 'estudiantes', display: 'Estudiante' },
      'kine': { tabla: 'kinesiologos', display: 'Kinesiólogo' },
      'nutri': { tabla: 'nutricionistas', display: 'Nutricionista' },
      'professor': { tabla: 'profesores', display: 'Profesor' },
      'student': { tabla: 'estudiantes', display: 'Estudiante' }
    };

    if (rolGuardado && roleMap[rolGuardado]) {
      const config = roleMap[rolGuardado];
      const { data } = await this.supabase.from(config.tabla).select('*').eq('email', email).maybeSingle();
      if (data) return { data: { ...data, rol_display: config.display }, error: null };
    }

    // Fallback: Si no tiene rol guardado, iteramos ordenadamente
    const tablasFallback = [
      { tabla: 'admins',        rol: 'Administrador' },
      { tabla: 'profesores',    rol: 'Profesor' },
      { tabla: 'estudiantes',   rol: 'Estudiante' },
      { tabla: 'kinesiologos',  rol: 'Kinesiólogo' },
      { tabla: 'nutricionistas',rol: 'Nutricionista' }
    ];

    for (const t of tablasFallback) {
      const { data } = await this.supabase.from(t.tabla).select('*').eq('email', email).maybeSingle();
      if (data) return { data: { ...data, rol_display: t.rol }, error: null };
    }

    return { data: null, error: 'Perfil no encontrado' };
  }
}