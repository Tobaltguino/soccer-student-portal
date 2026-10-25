import { Injectable, signal } from '@angular/core';
import { Session } from '@supabase/supabase-js';
import { SupabaseService } from '../../supabase/supabase';
import { AuthState, UserProfile } from '../models/auth.interface';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Estado reactivo moderno con Angular Signals
  readonly authState = signal<AuthState>({
    user: null,
    session: null,
    isLoading: true
  });

  // Se resuelve cuando la sesión guardada ya fue restaurada (evita falsos "no logueado" al hacer F5)
  private readonly inicializado: Promise<void>;

  constructor(private supabaseService: SupabaseService) {
    this.inicializado = this.initializeAuth();
  }

  ready(): Promise<void> {
    return this.inicializado;
  }

  /**
   * true si el usuario aún usa la clave temporal (RUT) y debe cambiarla.
   * La marca vive en app_metadata, que el usuario no puede editar por su cuenta.
   */
  debeCambiarPassword(session: Session | null = this.authState().session): boolean {
    return session?.user?.app_metadata?.['debe_cambiar_password'] === true;
  }

  private async initializeAuth() {
    const { data: { session } } = await this.supabaseService.client.auth.getSession();
    
    this.authState.set({
      user: session?.user ?? null,
      session: session,
      isLoading: false
    });

    this.supabaseService.client.auth.onAuthStateChange((_event, session) => {
      // Otro usuario o sin sesión: el perfil y los grupos guardados ya no sirven
      if (session?.user?.id !== this.cacheUserId) this.invalidarCache();

      this.authState.set({
        user: session?.user ?? null,
        session: session,
        isLoading: false
      });
    });
  }

  // =========================================================================
  // CACHÉ DEL USUARIO ACTUAL (perfil, rol y grupos)
  // Antes cada pantalla consultaba el perfil 3-5 veces (guard, layout,
  // componente y cada service) y auth.getUser() iba al servidor cada vez.
  // Se guarda por sesión; F5 o cambiar de usuario lo vuelve a cargar.
  // =========================================================================
  private cacheUserId: string | null = null;
  private perfilCache: Promise<any | null> | null = null;
  private gruposStaffCache: Promise<number[]> | null = null;

  /** Limpia el perfil y los grupos guardados (ej. tras editar el propio perfil). */
  invalidarCache(): void {
    this.cacheUserId = null;
    this.perfilCache = null;
    this.gruposStaffCache = null;
  }

  private prepararCache(userId: string): void {
    if (this.cacheUserId !== userId) {
      this.invalidarCache();
      this.cacheUserId = userId;
    }
  }

  /** Id del usuario logueado, leído de la sesión local (sin ir al servidor como auth.getUser()). */
  async obtenerUsuarioId(): Promise<string> {
    await this.ready();
    const userId = this.authState().session?.user?.id;
    if (!userId) throw new Error('Debes iniciar sesión para realizar esta acción');
    return userId;
  }

  /** Rol del usuario logueado en minúsculas ('' si no tiene perfil). */
  async obtenerRolActual(): Promise<string> {
    const perfil = await this.obtenerPerfilUsuario(await this.obtenerUsuarioId());
    return (perfil?.rol || '').toLowerCase();
  }

  /**
   * Grupos asignados al profesor / kinesiólogo / nutricionista logueado.
   * Para otros roles devuelve []. (La seguridad real la sigue aplicando RLS.)
   */
  async obtenerGruposStaff(): Promise<number[]> {
    const userId = await this.obtenerUsuarioId();
    this.prepararCache(userId);

    if (!this.gruposStaffCache) {
      this.gruposStaffCache = (async () => {
        const rol = await this.obtenerRolActual();
        const config: Record<string, [string, string]> = {
          profesor: ['aca_grupos_profesores', 'profesor_id'],
          kinesiologo: ['aca_grupos_kinesiologos', 'kinesiologo_id'],
          nutricionista: ['aca_grupos_nutricionistas', 'nutricionista_id']
        };
        if (!config[rol]) return [];

        const [tabla, columna] = config[rol];
        const { data, error } = await this.supabaseService.client.from(tabla).select('grupo_id').eq(columna, userId);
        if (error) {
          this.gruposStaffCache = null; // no guardar un error
          throw new Error(`No se pudieron cargar tus grupos: ${error.message}`);
        }
        return (data ?? []).map((r: any) => r.grupo_id);
      })();
    }
    return this.gruposStaffCache;
  }

  /**
   * Obtiene la sesión actual directamente desde Supabase.
   */
  async obtenerSesionActual() {
    const { data, error } = await this.supabaseService.client.auth.getSession();
    if (error) {
      console.error('Error al obtener sesión:', error.message);
      return null;
    }
    return data.session;
  }

  /**
   * Obtiene el perfil del usuario desde usu_perfiles. Se guarda en caché para el
   * usuario logueado: varias llamadas simultáneas comparten una sola consulta.
   */
  async obtenerPerfilUsuario(userId: string) {
    this.prepararCache(userId);

    if (!this.perfilCache) {
      this.perfilCache = (async () => {
        const { data, error } = await this.supabaseService.client
          .from('usu_perfiles')
          .select('*')
          .eq('id_usuario', userId)
          .single();

        if (error) {
          console.error('Error al obtener el perfil de usuario:', error.message);
          this.perfilCache = null; // no guardar un error: se reintenta en la próxima llamada
          return null;
        }
        return data;
      })();
    }
    return this.perfilCache;
  }

  /**
   * scope 'local' solo limpia la sesión de este navegador (útil cuando el servidor
   * ya la invalidó, ej. tras cambiar la contraseña, y evita un 403 en consola).
   */
  async signOut(scope: 'global' | 'local' = 'global') {
    return await this.supabaseService.client.auth.signOut({ scope });
  }

  /**
   * Cambia la clave vía Edge Function: además quita la marca debe_cambiar_password
   * y rechaza usar el RUT como contraseña.
   */
  async cambiarPassword(nuevaPassword: string): Promise<void> {
    const { data, error } = await this.supabaseService.client.functions.invoke('cambiar-password', {
      body: { password: nuevaPassword }
    });

    if (error) {
      throw new Error(await this.mensajeErrorFuncion(error, 'No se pudo actualizar la contraseña.'));
    }
    if (data?.error) throw new Error(data.error);
  }

  /**
   * Login por RUT vía Edge Function: el servidor busca el correo y hace el login,
   * así el navegador nunca ve el correo de nadie. Devuelve la sesión ya activa.
   */
  async iniciarSesionConRut(rut: string, password: string): Promise<Session> {
    const { data, error } = await this.supabaseService.client.functions.invoke('auth-rut', {
      body: { accion: 'login', rut, password }
    });

    if (error || !data?.access_token) {
      throw new Error(await this.mensajeErrorFuncion(error, 'RUT o contraseña incorrectos.'));
    }

    const { data: sesionData, error: sesionError } = await this.supabaseService.client.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    });
    if (sesionError || !sesionData.session) throw new Error('No se pudo iniciar la sesión.');

    return sesionData.session;
  }

  /**
   * Envía el correo de recuperación del RUT indicado. La respuesta es la misma
   * exista o no el RUT (no revela quién está registrado).
   */
  async recuperarPasswordPorRut(rut: string): Promise<string> {
    const { data, error } = await this.supabaseService.client.functions.invoke('auth-rut', {
      body: { accion: 'recuperar', rut, redirectTo: `${window.location.origin}/update-password` }
    });

    if (error) throw new Error(await this.mensajeErrorFuncion(error, 'No se pudo procesar la solicitud.'));
    return data?.mensaje || 'Si el RUT está registrado, enviamos las instrucciones a su correo.';
  }

  /** functions.invoke solo dice "non-2xx"; el motivo real viene en el cuerpo ({ error }). */
  private async mensajeErrorFuncion(error: any, porDefecto: string): Promise<string> {
    const detalle = await error?.context?.json?.().catch(() => null);
    return detalle?.error || porDefecto;
  }
}