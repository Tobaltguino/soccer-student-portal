import { Injectable } from '@angular/core';
import { SupabaseCoreService } from './supabase-core.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // 💡 OPTIMIZACIÓN: Constante global para no repetir strings (DRY)
  private readonly TABLAS_USUARIOS = ['admins', 'profesores', 'estudiantes', 'kinesiologos', 'nutricionistas'];
  
  // Caché en memoria para no saturar la base de datos buscando el rol
  private rolCache: string | null = null;

  // Inyectamos nuestro servicio Core
  constructor(private supabaseCore: SupabaseCoreService) {}

  // Getter privado para que escribir "this.supabase" siga funcionando igual
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
    this.limpiarCacheRol(); // Limpiamos la memoria al salir
    localStorage.removeItem('userRole'); // Limpiamos el rastro del navegador
    return await this.supabase.auth.signOut();
  }

  async getUser() {
    return await this.supabase.auth.getUser();
  }

  limpiarCacheRol() {
    this.rolCache = null;
  }

  // ==========================================
  // 2. AUTENTICACIÓN POR RUT (Lógica Avanzada)
  // ==========================================

  async loginConRut(rutInput: string, password: string) {
    for (const tabla of this.TABLAS_USUARIOS) {
      // 1. Buscamos el email, estado activo y términos
      const { data: userData } = await this.supabase
        .from(tabla)
        .select('email, activo, acepto_terminos')
        .eq('rut', rutInput.trim())
        .maybeSingle();

      if (userData?.email) {
        // 2. 🛡️ VERIFICACIÓN: Cuenta inactiva
        if (!userData.activo) {
          return { data: null, error: { message: 'Tu cuenta se encuentra desactivada. Contacta al administrador.' }, role: null, aceptoTerminos: false };
        }

        // 3. Intentamos loguear en Auth
        const authResponse = await this.supabase.auth.signInWithPassword({ 
          email: userData.email, 
          password 
        });

        if (authResponse.error) {
          let mensajeError = authResponse.error.message === 'Invalid login credentials' 
            ? 'Contraseña incorrecta.' 
            : authResponse.error.message;
          return { data: null, error: { message: mensajeError }, role: null, aceptoTerminos: false };
        }

        // ✅ ÉXITO
        return { data: authResponse.data, error: null, role: tabla, aceptoTerminos: userData.acepto_terminos };
      }
    }
    
    // Si no encontró el RUT en ninguna tabla
    return { data: null, error: { message: `El RUT ${rutInput} no está registrado en ProFutbol.` }, role: null, aceptoTerminos: false };
  }

  // ==========================================
  // 3. GESTIÓN DE ROLES Y SEGURIDAD
  // ==========================================

  async esAdmin(uid: string): Promise<boolean> {
    const { data, error } = await this.supabase.from('admins').select('id').eq('id', uid).single();
    return !(error || !data);
  }

  /**
   * Obtiene el rol del usuario de forma 100% segura usando un bucle dinámico.
   */
  // ==========================================
  // SEGURIDAD DE RUTAS (GUARD)
  // ==========================================
  
  // Devuelve el rol real del usuario buscando directamente en las tablas
  async getRolSeguro(email: string): Promise<string> {
    if (!email) return 'login';

    const { data: admin } = await this.supabase.from('admins').select('id').eq('email', email).maybeSingle();
    if (admin) return 'admin';
    
    const { data: est } = await this.supabase.from('estudiantes').select('id').eq('email', email).maybeSingle();
    if (est) return 'student';
    
    const { data: prof } = await this.supabase.from('profesores').select('id').eq('email', email).maybeSingle();
    if (prof) return 'professor';
    
    const { data: kine } = await this.supabase.from('kinesiologos').select('id').eq('email', email).maybeSingle();
    if (kine) return 'kine';
    
    const { data: nutri } = await this.supabase.from('nutricionistas').select('id').eq('email', email).maybeSingle();
    if (nutri) return 'nutri';

    return 'login'; // Si no existe en ninguna tabla, no pasa
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
    // 1. Limpieza de seguridad
    if (tabla !== 'estudiantes') {
      delete datos.fecha_nacimiento;
      delete datos.grupo_id;
    }

    if (email) datos.email = email;

    // 2. Actualizar datos públicos
    const { error: dbError } = await this.supabase.from(tabla).update(datos).eq('id', id);
    if (dbError) throw dbError; 

    // 3. Actualizar el correo en Auth (Acceso real)
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
    return await this.supabase
      .from('admins')
      .select('*')
      .order('apellido', { ascending: true });
  }

  // ==========================================
  // PERFIL DE USUARIO GLOBAL
  // ==========================================
  
  // Busca los datos del usuario navegando por las tablas según su rol
  // ==========================================
  // PERFIL DE USUARIO GLOBAL
  // ==========================================
  
  // Busca los datos del usuario navegando por las tablas según su rol
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

    // 1. Intento rápido: Buscar en la tabla del rol guardado
    if (rolGuardado && roleMap[rolGuardado]) {
      const config = roleMap[rolGuardado];
      const { data } = await this.supabase
        .from(config.tabla)
        .select('*') // 🚀 CAMBIO CLAVE: Traemos TODO (incluyendo tipo_profesor)
        .eq('email', email)
        .maybeSingle();

      if (data) return { data: { ...data, rol_display: config.display }, error: null };
    }

    // 2. Fallback de rescate: Iterar por todas las tablas
    const tablasFallback = [
      { tabla: 'admins',        rol: 'Administrador' },
      { tabla: 'profesores',    rol: 'Profesor' },
      { tabla: 'estudiantes',   rol: 'Estudiante' },
      { tabla: 'kinesiologos',  rol: 'Kinesiólogo' },
      { tabla: 'nutricionistas',rol: 'Nutricionista' }
    ];

    for (const t of tablasFallback) {
      const { data } = await this.supabase
        .from(t.tabla)
        .select('*') // 🚀 CAMBIO CLAVE: Traemos TODO
        .eq('email', email)
        .maybeSingle();

      if (data) return { data: { ...data, rol_display: t.rol }, error: null };
    }

    // Si no lo encuentra en ningún lado
    return { data: null, error: 'Perfil no encontrado' };
  }

  
  
}